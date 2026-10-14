const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

const W = 10;
const H = 18;
const T = 2.1;
const GAP = 0.45;
const ADVANCE = 13;

function horizontal(cx: number, cy: number) {
  const l = W - T - GAP * 2;
  const x0 = cx - l / 2;
  const x1 = cx + l / 2;
  const h = T / 2;
  return `${x0},${cy} ${x0 + h},${cy - h} ${x1 - h},${cy - h} ${x1},${cy} ${x1 - h},${cy + h} ${x0 + h},${cy + h}`;
}

function vertical(cx: number, cy: number) {
  const l = H / 2 - T / 2 - GAP * 2;
  const y0 = cy - l / 2;
  const y1 = cy + l / 2;
  const h = T / 2;
  return `${cx},${y0} ${cx + h},${y0 + h} ${cx + h},${y1 - h} ${cx},${y1} ${cx - h},${y1 - h} ${cx - h},${y0 + h}`;
}

const SHAPES: Record<string, string> = {
  a: horizontal(W / 2, T / 2),
  g: horizontal(W / 2, H / 2),
  d: horizontal(W / 2, H - T / 2),
  f: vertical(T / 2, H / 4 + T / 4),
  b: vertical(W - T / 2, H / 4 + T / 4),
  e: vertical(T / 2, (H * 3) / 4 - T / 4),
  c: vertical(W - T / 2, (H * 3) / 4 - T / 4),
};

type Cell = { char: string; dot: boolean };

function toCells(text: string, digits: number): Cell[] {
  const cells: Cell[] = [];
  for (const char of text) {
    if (char === "." && cells.length > 0) cells[cells.length - 1].dot = true;
    else cells.push({ char, dot: false });
  }
  const visible = cells.slice(-digits);
  while (visible.length < digits) visible.unshift({ char: " ", dot: false });
  return visible;
}

type SevenSegmentProps = {
  text: string;
  digits?: number;
  className?: string;
};

export function SevenSegment({ text, digits = 5, className }: SevenSegmentProps) {
  const cells = toCells(text, digits);

  return (
    <svg viewBox={`-1 -1 ${digits * ADVANCE} ${H + 2}`} className={className} aria-hidden="true" focusable="false">
      <g transform="skewX(-7)">
        {cells.map((cell, i) => {
          const lit = SEGMENTS[cell.char] ?? "";
          return (
            <g key={i} transform={`translate(${i * ADVANCE + 2.5} 0)`}>
              {Object.entries(SHAPES).map(([seg, points]) => (
                <polygon key={seg} points={points} fill="currentColor" opacity={lit.includes(seg) ? 0.95 : 0.07} />
              ))}
              <circle cx={W + 1.35} cy={H - 0.9} r={1.05} fill="currentColor" opacity={cell.dot ? 0.95 : 0.07} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
