import type {Props} from "@/video/schema";

import {GitFork, Package, Star} from "lucide-react";

export function RepositoryStats({stats}: {stats: Props["repositoryStats"]}) {
  if (!stats) return null;
  const format = (count: number) =>
    new Intl.NumberFormat("en-US", {notation: "compact", maximumFractionDigits: 1}).format(count);

  return (
    <div
      className="flex flex-wrap items-center gap-3 text-sm"
      aria-label="Current repository statistics"
    >
      <span className="text-xs opacity-60">Current</span>
      <span
        className="inline-flex items-center gap-1"
        title={`Current stars: ${stats.stars.toLocaleString("en-US")}`}
        aria-label={`Current stars: ${stats.stars}`}
      >
        <Star size={18} stroke="#94a3b8" aria-hidden="true" />
        {format(stats.stars)}
      </span>
      <span
        className="inline-flex items-center gap-1"
        title={`Current forks: ${stats.forks.toLocaleString("en-US")}`}
        aria-label={`Current forks: ${stats.forks}`}
      >
        <GitFork size={18} stroke="#94a3b8" aria-hidden="true" />
        {format(stats.forks)}
      </span>
      {stats.usedBy !== undefined && (
        <span
          className="inline-flex items-center gap-1"
          title={`Used by ${stats.usedBy.toLocaleString("en-US")} repositories (default package). Source: dependents.info; cached for up to 7 days.`}
          aria-label={`Used by: ${stats.usedBy}`}
        >
          <Package size={18} stroke="#94a3b8" aria-hidden="true" />
          {format(stats.usedBy)}
        </span>
      )}
    </div>
  );
}
