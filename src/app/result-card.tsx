import type {Props} from "@/video/schema";
import type {ReactNode} from "react";

import {GenerateButton} from "@/app/generate-button";
import {RepositoryStats} from "@/components/repository-stats";
import {formatDate, getGrowth} from "@/video/growth";

export function ResultCard({
  children,
  inputProps,
  primaryColor,
}: {
  children?: ReactNode;
  className?: string;
  inputProps?: Partial<Props>;
  primaryColor?: string;
}) {
  const growth = getGrowth(inputProps?.downloadsHistory ?? []);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 w-full border border-white/10 rounded-xl mb-2">{children}</div>
      <section className="min-w-0" aria-label="Package download summary">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-xl font-semibold break-words">{inputProps?.displayName}</h2>
          <RepositoryStats stats={inputProps?.repositoryStats} />
        </div>
        <p className="text-sm text-muted break-words mt-2">{inputProps?.description}</p>
        <p className="text-sm mt-3">
          {inputProps?.downloadsTotal?.toLocaleString("en-US")} downloads · {inputProps?.period}
        </p>
        <h3 className="font-semibold mt-5">Download milestones</h3>
        <p className="text-xs text-muted mt-1">
          Cumulative within the selected period, starting at zero.
        </p>
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {growth.milestones.map((m) => (
            <div key={m.value} className="rounded-xl border border-foreground/10 p-3">
              <dt className="text-lg font-semibold">
                {new Intl.NumberFormat("en-US", {notation: "compact"}).format(m.value)}
              </dt>
              <dd className="text-sm text-muted">{formatDate(m.day)}</dd>
            </div>
          ))}
        </dl>
        {!growth.milestones.length && (
          <p className="text-sm text-muted mt-3">No 100K milestone reached in this period yet.</p>
        )}
      </section>
      <GenerateButton inputProps={inputProps} primaryColor={primaryColor} />
    </div>
  );
}
