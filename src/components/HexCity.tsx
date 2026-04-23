import { GRID_SIZE, TOTAL, rampColor } from "@/lib/spatial";

interface Props {
  values: number[];
  size?: number;
  highlight?: number[];
  selected?: number | null;
  onCellClick?: (i: number) => void;
  onCellHover?: (i: number | null) => void;
  colorOf?: (i: number) => string;
  edges?: Array<[number, number]>;
  showLabels?: boolean;
  className?: string;
}

/**
 * Hexagonal honeycomb map with the same API as <GridCity />.
 * Uses pointy-top hexes laid out with offset rows (odd rows shifted right by half a hex).
 */
export function HexCity({
  values,
  size = 480,
  highlight = [],
  selected = null,
  onCellClick,
  onCellHover,
  colorOf,
  edges = [],
  showLabels = false,
  className,
}: Props) {
  const pad = 14;
  const inner = size - pad * 2;
  // hex geometry: width includes the half offset on odd rows
  const hexW = inner / (GRID_SIZE + 0.5);
  const r = hexW / Math.sqrt(3); // circumradius for pointy-top
  const rowH = r * 1.5;
  const totalH = rowH * (GRID_SIZE - 1) + r * 2;
  const yOffset = (size - totalH) / 2;

  const cx = (i: number) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    const offset = row % 2 === 1 ? hexW / 2 : 0;
    return pad + offset + col * hexW + hexW / 2;
  };
  const cy = (i: number) => {
    const row = Math.floor(i / GRID_SIZE);
    return yOffset + r + row * rowH;
  };

  // pointy-top hex polygon points around (0,0) with circumradius r
  const hexPoints = (cxv: number, cyv: number, rad: number) => {
    const pts: string[] = [];
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 180) * (60 * k - 90); // start at top
      pts.push(`${cxv + rad * Math.cos(a)},${cyv + rad * Math.sin(a)}`);
    }
    return pts.join(" ");
  };

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: "100%", height: "auto", maxWidth: size }}
      role="img"
      aria-label="蜂窝城市地图"
    >
      <defs>
        <pattern id="hexBg" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="14" cy="14" r="0.7" fill="hsl(var(--border))" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={size} height={size} fill="hsl(var(--background))" />
      <rect x="0" y="0" width={size} height={size} fill="url(#hexBg)" opacity="0.6" />

      {Array.from({ length: TOTAL }).map((_, i) => {
        const fill = colorOf ? colorOf(i) : rampColor(values[i] ?? 0);
        const isHi = highlight.includes(i);
        const isSel = selected === i;
        const x = cx(i);
        const y = cy(i);
        return (
          <g
            key={i}
            onClick={() => onCellClick?.(i)}
            onMouseEnter={() => onCellHover?.(i)}
            onMouseLeave={() => onCellHover?.(null)}
            style={{ cursor: onCellClick ? "pointer" : "default" }}
          >
            <polygon
              points={hexPoints(x, y, r - 1.2)}
              fill={fill}
              stroke={
                isSel
                  ? "hsl(var(--foreground))"
                  : isHi
                  ? "hsl(var(--accent))"
                  : "hsl(var(--border))"
              }
              strokeWidth={isSel ? 2.5 : isHi ? 2 : 1}
              opacity={isHi || isSel || highlight.length === 0 ? 1 : 0.55}
              style={{ transition: "all 200ms cubic-bezier(0.22,1,0.36,1)" }}
            />
            {showLabels && (
              <text
                x={x}
                y={y + 3}
                textAnchor="middle"
                fontSize={Math.max(8, r * 0.55)}
                fill="hsl(var(--foreground))"
                fontFamily="JetBrains Mono"
                pointerEvents="none"
              >
                {Math.round(values[i] ?? 0)}
              </text>
            )}
          </g>
        );
      })}

      {edges.map(([i, j], k) => (
        <line
          key={k}
          x1={cx(i)}
          y1={cy(i)}
          x2={cx(j)}
          y2={cy(j)}
          stroke="hsl(var(--accent))"
          strokeWidth={1.2}
          opacity={0.7}
        />
      ))}

      {selected !== null && (
        <circle
          cx={cx(selected)}
          cy={cy(selected)}
          r={r * 1.05}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          opacity={0.45}
          className="animate-pulse-ring"
          style={{ transformOrigin: `${cx(selected)}px ${cy(selected)}px` }}
        />
      )}
    </svg>
  );
}
