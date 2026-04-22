import { GRID_SIZE, TOTAL } from "@/lib/spatial";

interface Props {
  W: number[][];
  size?: number;
  selected?: number | null;
  onCellClick?: (i: number, j: number) => void;
  hoverPair?: [number, number] | null;
  rowHighlight?: number | null;
}

export function MatrixView({ W, size = 360, selected, onCellClick, rowHighlight }: Props) {
  const pad = 6;
  const inner = size - pad * 2;
  const cell = inner / TOTAL;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      <rect x="0" y="0" width={size} height={size} fill="hsl(var(--card))" />
      {W.map((row, i) =>
        row.map((v, j) => {
          const isDiag = i === j;
          const onRow = rowHighlight === i || rowHighlight === j;
          let fill = "hsl(var(--muted))";
          if (v > 0) {
            const intensity = Math.min(1, v);
            fill = `hsl(212 88% ${50 - intensity * 25}%)`;
          }
          if (isDiag) fill = "hsl(var(--border))";
          return (
            <rect
              key={`${i}-${j}`}
              x={pad + j * cell}
              y={pad + i * cell}
              width={cell - 0.3}
              height={cell - 0.3}
              fill={fill}
              opacity={onRow || rowHighlight === null || rowHighlight === undefined ? 1 : 0.4}
              onClick={() => onCellClick?.(i, j)}
              style={{ cursor: onCellClick ? "pointer" : "default" }}
            >
              <title>{`w[${i}][${j}] = ${v.toFixed(2)}`}</title>
            </rect>
          );
        })
      )}
      {/* gridlines every GRID_SIZE */}
      {Array.from({ length: GRID_SIZE + 1 }).map((_, k) => (
        <g key={k}>
          <line x1={pad} y1={pad + k * GRID_SIZE * cell} x2={pad + inner} y2={pad + k * GRID_SIZE * cell} stroke="hsl(var(--border))" strokeWidth="0.6" />
          <line x1={pad + k * GRID_SIZE * cell} y1={pad} x2={pad + k * GRID_SIZE * cell} y2={pad + inner} stroke="hsl(var(--border))" strokeWidth="0.6" />
        </g>
      ))}
    </svg>
  );
}
