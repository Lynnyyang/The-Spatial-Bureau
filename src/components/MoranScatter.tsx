interface Props {
  values: { x: number; y: number }[];
  size?: number;
  selected?: number | null;
  onPointClick?: (i: number) => void;
  /** color per index */
  colorOf?: (i: number) => string;
  xLabel?: string;
  yLabel?: string;
}

export function MoranScatter({
  values,
  size = 320,
  selected = null,
  onPointClick,
  colorOf,
  xLabel = "z (标准化值)",
  yLabel = "Wz (空间滞后)",
}: Props) {
  const pad = 38;
  const xs = values.map((v) => v.x);
  const ys = values.map((v) => v.y);
  const lim = Math.max(2, ...xs.map(Math.abs), ...ys.map(Math.abs));
  const sx = (x: number) => pad + ((x + lim) / (2 * lim)) * (size - pad * 2);
  const sy = (y: number) => size - pad - ((y + lim) / (2 * lim)) * (size - pad * 2);

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      <rect x="0" y="0" width={size} height={size} fill="hsl(var(--card))" rx="8" />
      {/* quadrants */}
      <rect x={pad} y={pad} width={(size - pad * 2) / 2} height={(size - pad * 2) / 2} fill="hsl(var(--lh) / 0.06)" />
      <rect x={size / 2} y={pad} width={(size - pad * 2) / 2} height={(size - pad * 2) / 2} fill="hsl(var(--hh) / 0.06)" />
      <rect x={pad} y={size / 2} width={(size - pad * 2) / 2} height={(size - pad * 2) / 2} fill="hsl(var(--ll) / 0.06)" />
      <rect x={size / 2} y={size / 2} width={(size - pad * 2) / 2} height={(size - pad * 2) / 2} fill="hsl(var(--hl) / 0.06)" />

      {/* axes */}
      <line x1={pad} y1={size / 2} x2={size - pad} y2={size / 2} stroke="hsl(var(--border))" />
      <line x1={size / 2} y1={pad} x2={size / 2} y2={size - pad} stroke="hsl(var(--border))" />

      {/* quadrant labels */}
      <text x={size - pad - 4} y={pad + 14} textAnchor="end" fontSize="11" fill="hsl(var(--hh))" fontWeight="600">HH</text>
      <text x={pad + 4} y={pad + 14} fontSize="11" fill="hsl(var(--lh))" fontWeight="600">LH</text>
      <text x={pad + 4} y={size - pad - 4} fontSize="11" fill="hsl(var(--ll))" fontWeight="600">LL</text>
      <text x={size - pad - 4} y={size - pad - 4} textAnchor="end" fontSize="11" fill="hsl(var(--hl))" fontWeight="600">HL</text>

      {/* axis labels */}
      <text x={size - pad} y={size / 2 + 14} textAnchor="end" fontSize="10" fill="hsl(var(--muted-foreground))">{xLabel}</text>
      <text x={size / 2 + 6} y={pad + 4} fontSize="10" fill="hsl(var(--muted-foreground))">{yLabel}</text>

      {/* points */}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={sx(v.x)}
          cy={sy(v.y)}
          r={selected === i ? 6 : 4}
          fill={colorOf ? colorOf(i) : "hsl(var(--primary))"}
          stroke={selected === i ? "hsl(var(--foreground))" : "none"}
          strokeWidth={1.5}
          opacity={selected === null || selected === i ? 0.9 : 0.5}
          onClick={() => onPointClick?.(i)}
          style={{ cursor: onPointClick ? "pointer" : "default", transition: "all 180ms" }}
        />
      ))}
    </svg>
  );
}
