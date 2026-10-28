import type { UserGrowthPoint } from "@repo/types";

export default function LineChart({ data }: { data: UserGrowthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-small text-muted">
        No data available
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const minCount = 0;

  const xStep = chartW / Math.max(data.length - 1, 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) =>
    PAD.top + chartH - ((v - minCount) / (maxCount - minCount)) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.count)}`).join(" ");
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.count)}`),
    `${toX(data.length - 1)},${PAD.top + chartH}`,
  ].join(" ");

  // Y-axis ticks
  const yTicks = [...new Set([0, Math.round(maxCount / 2), maxCount])];

  // X-axis labels — show first, middle, last
  const xLabels = [
    { i: 0, label: data[0]!.date.slice(5) },
    {
      i: Math.floor(data.length / 2),
      label: data[Math.floor(data.length / 2)]!.date.slice(5),
    },
    { i: data.length - 1, label: data[data.length - 1]!.date.slice(5) },
  ].filter((item, idx, arr) => arr.findIndex((a) => a.i === item.i) === idx);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-48 text-foreground"
      aria-label="User growth chart"
    >
      {/* Grid lines */}
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={toY(v)}
          y2={toY(v)}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
      ))}

      {/* Area fill */}
      <polygon points={areaPoints} fill="currentColor" fillOpacity={0.05} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <rect
          key={i}
          x={toX(i) - 2.5}
          y={toY(d.count) - 2.5}
          width={5}
          height={5}
          fill="currentColor"
          stroke="var(--color-background)"
          strokeWidth={1.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text
          key={v}
          x={PAD.left - 6}
          y={toY(v) + 4}
          textAnchor="end"
          fontSize={10}
          fill="var(--color-muted)"
        >
          {v}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-muted)"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
