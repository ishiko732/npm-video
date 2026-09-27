import type {Props} from "./schema";

import {darken} from "color2k";
import {useId, useMemo} from "react";
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";

import {formatDate, getGrowth} from "./growth";
import {RollingNumber} from "./rolling-number";

export const animationDurationInSeconds = 6;
export const width = 1280;
export const height = 720;
export const fps = 60;

const compact = (value: number) =>
  new Intl.NumberFormat("en-US", {notation: "compact"}).format(value);

export function NpmDownloadsComposition({
  displayName,
  description,
  publisher,
  downloadsHistory,
  period,
  primaryColor = "#22c55e",
  secondaryColor = "#10b981",
}: Props) {
  const chartId = useId();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const growth = useMemo(() => getGrowth(downloadsHistory), [downloadsHistory]);
  const progress = interpolate(frame, [fps * 0.5, fps * animationDurationInSeconds], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const total = growth.points.at(-1)?.downloads ?? 0;
  const max = total || 1;
  const firstDay = Date.parse(growth.points[0]?.day ?? "1970-01-01");
  const lastDay = Date.parse(growth.points.at(-1)?.day ?? "1970-01-01");
  const x = (day: string) =>
    80 + (lastDay === firstDay ? 0.5 : (Date.parse(day) - firstDay) / (lastDay - firstDay)) * 1020;
  const y = (value: number) => 230 - (value / max) * 200;
  const revealX = 80 + 1020 * progress;
  const visiblePoints = growth.points.filter((point) => x(point.day) <= revealX);
  const current = visiblePoints.at(-1);
  const counterValue = (at: number) => {
    const edge =
      80 +
      1020 *
        Math.max(0, Math.min(1, (at - fps * 0.5) / (fps * (animationDurationInSeconds - 0.5))));

    return growth.points.findLast((point) => x(point.day) <= edge)?.downloads ?? 0;
  };
  const path = growth.points
    .map((point, i) => `${i ? "L" : "M"}${x(point.day)} ${y(point.downloads)}`)
    .join(" ");

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(150deg, ${darken(primaryColor, 0.7)}, #07110e 75%)`,
        color: "white",
        padding: "40px 48px 64px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header className="flex gap-8 justify-between" style={{height: 220, flexShrink: 0}}>
        <div className="min-w-0 flex-1">
          <div className="text-sm uppercase tracking-[0.3em] text-white/60 mb-3">npm downloads</div>
          <h1
            className="font-bold leading-none mb-3 break-words"
            style={{fontSize: displayName.length > 30 ? 32 : 56}}
          >
            {displayName}
          </h1>
          <p
            className="text-white/75 leading-snug break-words"
            style={{fontSize: (description?.length ?? 0) > 260 ? 16 : 20}}
          >
            {description}
          </p>
          {publisher && (
            <div className="text-base text-white/60 mt-2 break-words">by {publisher}</div>
          )}
        </div>
        <div className="shrink-0 text-left" style={{width: 400}}>
          <div className="text-base text-white/60 mb-3">Downloads in selected period</div>
          <RollingNumber
            value={counterValue(frame - (frame % 8))}
            previous={counterValue(frame - (frame % 8) - 8)}
            progress={Math.min(1, (frame % 8) / 6)}
            maximum={total}
          />
          <div className="text-base text-white/60 mt-3">
            {current ? formatDate(current.day) : period}
          </div>
        </div>
      </header>
      <div className="rounded-3xl border border-white/15 bg-white/5 px-6 py-5 flex-1 min-h-0">
        <div className="flex justify-between text-base text-white/70">
          <span>Cumulative downloads</span>
          <span>{period} · starts at 0</span>
        </div>
        {growth.points.length ? (
          <>
            <svg
              viewBox="0 0 1140 275"
              className="w-full"
              style={{height: 285}}
              role="img"
              aria-label="Cumulative download growth"
            >
              <defs>
                <linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor={primaryColor} stopOpacity="0.3" />
                  <stop offset="1" stopColor={primaryColor} stopOpacity="0" />
                </linearGradient>
                <clipPath id={`${chartId}-reveal`}>
                  <rect width={revealX} height={275} />
                </clipPath>
              </defs>
              {[0, max / 2, max].map((value) => (
                <g key={value}>
                  <line
                    x1={80}
                    x2={1100}
                    y1={y(value)}
                    y2={y(value)}
                    stroke="white"
                    strokeOpacity="0.12"
                  />
                  <text
                    x={68}
                    y={y(value)}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="#b1c3ba"
                    fontSize={18}
                  >
                    {compact(value)}
                  </text>
                </g>
              ))}
              <g clipPath={`url(#${chartId}-reveal)`}>
                <path
                  d={`${path} L${x(growth.points.at(-1)!.day)} 230 L${x(growth.points[0].day)} 230 Z`}
                  fill={`url(#${chartId}-area)`}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={secondaryColor}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
              </g>
              {growth.milestones.map((m) => {
                const pointX = x(m.day);
                const pointY = y(growth.points[m.index].downloads);
                const labelX = pointX < 250 ? pointX + 14 : pointX - 14;
                const labelY = pointY < 70 ? pointY + 28 : pointY - 30;

                return (
                  <g key={m.value} opacity={pointX <= revealX ? 1 : 0}>
                    <circle cx={pointX} cy={pointY} r={5} fill="white" />
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor={pointX < 250 ? "start" : "end"}
                      fill="white"
                      stroke="#102019"
                      strokeWidth={4}
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    >
                      <tspan x={labelX} fontSize={24} fontWeight={700}>
                        {compact(m.value)}
                      </tspan>
                      <tspan x={labelX} dy={22} fontSize={16}>
                        {formatDate(m.day)}
                      </tspan>
                    </text>
                  </g>
                );
              })}
              <text x={80} y={265} fill="#b1c3ba" fontSize={18}>
                {formatDate(growth.points[0].day)}
              </text>
              <text x={1100} y={265} textAnchor="end" fill="#b1c3ba" fontSize={18}>
                {formatDate(growth.points.at(-1)!.day)}
              </text>
            </svg>
          </>
        ) : (
          <div className="py-20 text-center text-white/70">No download data available</div>
        )}
      </div>
      <div className="text-sm text-white/40 mt-4">npmvideo.com</div>
    </AbsoluteFill>
  );
}
