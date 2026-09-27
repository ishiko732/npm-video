"use client";

import type {Props} from "@/video/schema";

import {useSearchParams} from "next/navigation";
import {Suspense, useEffect, useState} from "react";

import {CompositionPlayer} from "@/app/composition-player";
import {ErrorCard} from "@/app/error-card";
import {PackageForm} from "@/app/package-form";
import {ResultCard} from "@/app/result-card";
import {LoadingSpinner} from "@/components/loading-spinner";
import {getNpmDownloadsInfo} from "@/lib/npm-downloads";

export default function Home() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <PackagePage />
    </Suspense>
  );
}

function PackagePage() {
  const params = useSearchParams();
  const packageName = params.get("package") ?? "@heroui/react";
  const timeRange = params.get("timeRange") ?? "2-years";
  const primaryColor = params.get("primaryColor") ?? "#22c55e";
  const secondaryColor = params.get("secondaryColor") ?? "#10b981";

  return (
    <div className="container mx-auto w-full max-w-2xl flex flex-col gap-8">
      <PackageForm
        key={params.toString()}
        initialPackage={packageName}
        initialTimeRange={timeRange}
        initialPrimaryColor={primaryColor}
        initialSecondaryColor={secondaryColor}
      />
      <PackageResult
        key={`${packageName}-${timeRange}`}
        packageName={packageName}
        timeRange={timeRange}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
      />
    </div>
  );
}

function PackageResult({
  packageName,
  timeRange,
  primaryColor,
  secondaryColor,
}: {
  packageName: string;
  timeRange: string;
  primaryColor: string;
  secondaryColor: string;
}) {
  const [result, setResult] = useState<{data: Props | null; error?: string} | null>(null);
  useEffect(() => {
    let active = true;
    getNpmDownloadsInfo(packageName, timeRange)
      .then((data) => {
        if (active) setResult({data});
      })
      .catch((error) => {
        if (active)
          setResult({
            data: null,
            error:
              error instanceof Error
                ? error.message
                : "Could not load npm downloads. Please try again.",
          });
      });

    return () => {
      active = false;
    };
  }, [packageName, timeRange]);
  if (!result) return <LoadingSpinner />;
  if (!result.data)
    return result.error ? (
      <p role="alert" className="text-sm text-danger">
        {result.error}
      </p>
    ) : (
      <ErrorCard packageName={packageName} />
    );
  const inputProps = {...result.data, primaryColor, secondaryColor};

  return (
    <ResultCard inputProps={inputProps} primaryColor={primaryColor}>
      <CompositionPlayer inputProps={inputProps} />
    </ResultCard>
  );
}
