import { createUniqueId, type ComponentProps } from "solid-js"

const glyphs = [
  ["1110", "1001", "1110", "1010", "1001"],
  ["0110", "1001", "1111", "1001", "1001"],
  ["1111", "0110", "0110", "0110", "1111"],
  ["1001", "1101", "1011", "1001", "1001"],
  ["1001", "1101", "1011", "1001", "1001"],
  ["1001", "1001", "0110", "0110", "0110"],
]
const cell = 18
const glyphWidth = cell * 4
const gap = cell
const start = (720 - glyphs.length * glyphWidth - (glyphs.length - 1) * gap) / 2
const wordmark = glyphs
  .flatMap((glyph, glyphIndex) =>
    glyph.flatMap((row, rowIndex) =>
      Array.from(row).flatMap((pixel, columnIndex) => {
        if (pixel === "0") return []
        const x = start + glyphIndex * (glyphWidth + gap) + columnIndex * cell
        const y = 18 + rowIndex * cell
        return [`M${x} ${y}h${cell}v${cell}h-${cell}Z`]
      }),
    ),
  )
  .join(" ")

export function RainnyWordmarkV2(props: Pick<ComponentProps<"svg">, "class">) {
  const mask = createUniqueId()
  const maskGradient = createUniqueId()

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 720 129"
      fill="none"
      aria-label="Rainny"
      role="img"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <g opacity="0.6" mask={`url(#${mask})`}>
        <path opacity="0.112" d={wordmark} fill="currentColor" />
      </g>
      <defs>
        <mask id={mask} style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="129">
          <rect width="720" height="129" fill={`url(#${maskGradient})`} />
        </mask>
        <linearGradient id={maskGradient} x1="360" y1="68" x2="360" y2="129" gradientUnits="userSpaceOnUse">
          <stop stop-color="white" stop-opacity="0.7" />
          <stop offset="1" stop-color="white" stop-opacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}
