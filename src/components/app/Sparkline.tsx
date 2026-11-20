type SparklineProps = {
  data: number[];
  color?: string;
  className?: string;
};

export function Sparkline({ data, color = "var(--primary)", className }: SparklineProps) {
  if (data.length === 0) return null;

  const w = 100;
  const h = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  // A single point has no interval to divide by (data.length - 1 === 0);
  // render it flat at x = 0 instead of producing NaN coordinates.
  const xDivisor = data.length - 1 || 1;
  const points = data.map((v, i) => {
    const x = (i / xDivisor) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return [x, y] as const;
  });

  const d = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x} ${y}`;
      const prev = points[i - 1] ?? [x, y];
      const px = prev[0];
      const py = prev[1];
      const cx = (px + x) / 2;

      return `C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
    })
    .join(" ");

  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const id = `spark-${data.join("-")}-${color.replace(/[^a-z]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
