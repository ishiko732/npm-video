type Download = {day: string; downloads: number};

export function getGrowth(history: Download[]) {
  let total = 0;
  const points = history.map((point) => ({...point, downloads: (total += point.downloads)}));
  // Keep the video readable for very large packages, while retaining 1M and 2M.
  const step = total < 1_000_000 ? 100_000 : 1_000_000;
  const stride = Math.max(1, Math.ceil(total / step / 5));
  const thresholds = Array.from(
    new Set([step, step * 2, ...Array.from({length: 5}, (_, i) => (i + 1) * stride * step)]),
  )
    .filter((value) => value <= total)
    .sort((a, b) => a - b);
  const milestones = thresholds.map((value) => {
    const index = points.findIndex((point) => point.downloads >= value);

    return {value, day: points[index].day, index};
  });

  return {points, milestones};
}

export function formatDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
