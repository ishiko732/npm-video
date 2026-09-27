import {useId} from "react";

export function RollingNumber({
  value,
  previous,
  progress,
  maximum,
}: {
  value: number;
  previous: number;
  progress: number;
  maximum: number;
}) {
  const id = useId();
  const length = Math.max(1, String(Math.floor(maximum)).length);
  const digits = String(Math.floor(value)).padStart(length, " ");
  const before = String(Math.floor(previous)).padStart(length, "0");
  const cellWidth = 40;
  const commaWidth = 20;
  const contentWidth = length * cellWidth + Math.floor((length - 1) / 3) * commaWidth;
  let x = 0;

  return (
    <svg
      width={400}
      height={72}
      viewBox={`0 0 ${Math.max(400, contentWidth)} 72`}
      style={{display: "block", overflow: "hidden"}}
      role="img"
      aria-label={value.toLocaleString("en-US")}
    >
      <defs>
        <clipPath id={id}>
          <rect width={Math.max(400, contentWidth)} height={72} />
        </clipPath>
      </defs>
      <g
        clipPath={`url(#${id})`}
        fontFamily="Arial, sans-serif"
        fontSize={64}
        fontWeight={700}
        fill="white"
      >
        {Array.from(digits, (digit, index) => {
          const digitX = x;
          const comma = index < length - 1 && (length - index - 1) % 3 === 0;
          x += cellWidth + (comma ? commaWidth : 0);
          if (digit === " ") return null;
          const from = Number(before[index]);
          const distance = (Number(digit) - from + 10) % 10;
          const position = from + distance * progress;
          const top = Math.floor(position);
          const offset = (position - top) * 72;

          return (
            <g key={index}>
              <text x={digitX} y={60 - offset}>
                {top % 10}
              </text>
              <text x={digitX} y={132 - offset}>
                {(top + 1) % 10}
              </text>
              {comma && (
                <text x={digitX + cellWidth} y={60}>
                  ,
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
