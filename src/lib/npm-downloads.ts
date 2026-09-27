import type {Props} from "@/video/schema";

import {cachedFetch as fetchWithCache} from "@/lib/cached-fetch";
import {getPackageMetadata} from "@/lib/npm-metadata";
import {getMilestoneStars} from "@/lib/star-history";
import {getGrowth} from "@/video/growth";

// NPM Downloads functionality

type NpmDownloadsResponse =
  | {
      downloads: Array<{day: string; downloads: number}>;
      start: string;
      end: string;
      package: string;
    }
  | {
      error: string;
    };

function getDateRange(timeRange: string): {
  startDate: string;
  endDate: string;
  periodLabel: string;
} {
  const endDate = new Date();
  let startDate = new Date();
  let periodLabel = "";

  switch (timeRange) {
    case "7-days":
      startDate.setDate(endDate.getDate() - 7);
      periodLabel = "Last 7 days";
      break;
    case "30-days":
      startDate.setDate(endDate.getDate() - 30);
      periodLabel = "Last 30 days";
      break;
    case "90-days":
      startDate.setDate(endDate.getDate() - 90);
      periodLabel = "Last 90 days";
      break;
    case "6-months":
      startDate.setMonth(endDate.getMonth() - 6);
      periodLabel = "Last 6 months";
      break;
    case "1-year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      periodLabel = "Last year";
      break;
    case "2-years":
      startDate.setFullYear(endDate.getFullYear() - 2);
      periodLabel = "Last 2 years";
      break;
    case "5-years":
      startDate.setFullYear(endDate.getFullYear() - 5);
      periodLabel = "Last 5 years";
      break;
    case "all-time":
      startDate = new Date("2015-01-10"); // NPM registry started tracking around this time
      periodLabel = "All time";
      break;
    default:
      startDate.setFullYear(endDate.getFullYear() - 2);
      periodLabel = "Last 2 years";
  }

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    periodLabel,
  };
}

export async function getNpmDownloadsInfo(
  packageSpecifier: string,
  timeRange: string = "2-years",
): Promise<Omit<Props, "primaryColor" | "secondaryColor"> | null> {
  const packageName = normalizePackageSpecifier(packageSpecifier);
  if (!packageName) return null;

  const {startDate, endDate, periodLabel} = getDateRange(timeRange);
  const encodedPackage = encodeURIComponent(packageName);
  const metadata = getPackageMetadata(packageName, fetchWithCache);

  // npm caps each request at 18 months; yearly chunks preserve older history.
  const ranges: Array<{start: string; end: string}> = [];
  const day = 86_400_000;
  for (let start = Date.parse(startDate); start <= Date.parse(endDate); start += 365 * day) {
    ranges.push({
      start: new Date(start).toISOString().slice(0, 10),
      end: new Date(Math.min(start + 364 * day, Date.parse(endDate))).toISOString().slice(0, 10),
    });
  }
  const responses: Array<Props["downloadsHistory"] | null> = [];
  for (let i = 0; i < ranges.length; i += 2) {
    responses.push(
      ...(await Promise.all(
        ranges.slice(i, i + 2).map(async (range) => {
          const response = await fetchWithCache(
            `https://api.npmjs.org/downloads/range/${range.start}:${range.end}/${encodedPackage}`,
            {signal: AbortSignal.timeout(15_000)},
          );
          if (response.status === 404) return null;
          if (!response.ok)
            throw new Error(
              `Could not load npm downloads (HTTP ${response.status}). Please retry.`,
            );
          const data = (await response.json()) as NpmDownloadsResponse;

          return "downloads" in data ? data.downloads : null;
        }),
      )),
    );
  }
  if (responses.some((response) => response === null)) return null;
  // Keep daily samples so cumulative milestones retain their exact dates.
  let formattedHistory = responses.flatMap((response) => response ?? []);
  if (timeRange === "all-time") {
    const firstDownload = formattedHistory.findIndex((point) => point.downloads > 0);
    if (firstDownload > 0) formattedHistory = formattedHistory.slice(firstDownload - 1);
  }
  const downloadsTotal = formattedHistory.reduce((total, point) => total + point.downloads, 0);

  const packageMetadata = await metadata;
  const milestoneStars = await getMilestoneStars(
    packageMetadata.repositoryStats,
    getGrowth(formattedHistory).milestones.map((m) => m.day),
    fetchWithCache,
  );

  return {
    packageName,
    displayName: packageName,
    ...packageMetadata,
    milestoneStars,
    downloadsTotal,
    downloadsHistory: formattedHistory,
    period: periodLabel,
  };
}

function normalizePackageSpecifier(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const isNpmHost = /(^|\.)npmjs\.com$/.test(url.hostname);
    if (isNpmHost) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      const packageIndex = pathParts.findIndex((segment) => segment === "package");
      if (packageIndex >= 0 && pathParts[packageIndex + 1]) {
        return decodeURIComponent(pathParts.slice(packageIndex + 1).join("/"));
      }
      if (pathParts.length >= 1) {
        return decodeURIComponent(pathParts.join("/"));
      }
    }
  } catch {
    // ignore, not a URL
  }

  return trimmed.replace(/^npm:/, "");
}
