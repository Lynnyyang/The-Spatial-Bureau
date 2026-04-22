import { GRID_SIZE, TOTAL, rampColor, type Cell } from "@/lib/spatial";

interface Props {
  values: number[];
  size?: number;
  highlight?: number[];
  selected?: number | null;
  onCellClick?: (i: number) => void;
  onCellHover?: (i: number | null) => void;
  /** override fill color per cell, by id */
  colorOf?: (i: number) => string;
  /** edges to draw between cell centers (neighbor links) */
  edges?: Array<[number, number]>;
  showLabels?: boolean;
  className?: string;
}

export function GridCity({
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
  const pad = 12;
  const inner = size - pad * 2;
  const cell = inner / GRID_SIZE;

  const cx = (i: number) => pad + (i % GRID_SIZE) * cell + cell / 2;
  const cy = (i: number) => pad + Math.floor(i / GRID_SIZE) * cell + cell / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ width: "100%", height: "auto", maxWidth: size }}
      role="img"
      aria-label="网格城市地图"
    >
      <defs>
        <pattern id="cityGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={size} height={size} fill="hsl(var(--background))" />
      <rect x="0" y="0" width={size} height={size} fill="url(#cityGrid)" opacity="0.5" />

      {Array.from({ length: TOTAL }).map((_, i) => {
        const x = pad + (i % GRID_SIZE) * cell;
        const y = pad + Math.floor(i / GRID_SIZE) * cell;
        const fill = colorOf ? colorOf(i) : rampColor(values[i] ?? 0);
        const isHi = highlight.includes(i);
        const isSel = selected === i;
        return (
          <g
            key={i}
            onClick={() => onCellClick?.(i)}
            onMouseEnter={() => onCellHover?.(i)}
            onMouseLeave={() => onCellHover?.(null)}
            style={{ cursor: onCellClick ? "pointer" : "default" }}
          >
            <rect
              x={x + 1}
              y={y + 1}
              width={cell - 2}
              height={cell - 2}
              rx={4}
              fill={fill}
              stroke={isSel ? "hsl(var(--foreground))" : isHi ? "hsl(var(--accent))" : "hsl(var(--border))"}
              strokeWidth={isSel ? 2.5 : isHi ? 2 : 1}
              opacity={isHi || isSel || highlight.length === 0 ? 1 : 0.55}
              style={{ transition: "all 200ms cubic-bezier(0.22,1,0.36,1)" }}
            />
            {showLabels && (
              <text
                x={x + cell / 2}
                y={y + cell / 2 + 3}
                textAnchor="middle"
                fontSize={Math.max(8, cell * 0.22)}
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

      {/* neighbor edges */}
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
          r={cell * 0.55}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          opacity={0.4}
          className="animate-pulse-ring"
          style={{ transformOrigin: `${cx(selected)}px ${cy(selected)}px` }}
        />
      )}
    </svg>
  );
}
