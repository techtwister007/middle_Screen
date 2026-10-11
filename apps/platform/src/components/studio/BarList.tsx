/**
 * Single-series horizontal bar list: one hue (the brand colour), values in ink,
 * thin bars with rounded data ends, a hover title on every row, and the numbers
 * printed so the chart doubles as its own table.
 */
export const BarList = ({ rows, format }: { rows: { label: string; value: number }[]; format: (v: number) => string }) => {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li className="group" key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <div className="flex justify-between text-sm">
            <span className="truncate">{r.label}</span>
            <span className="tabular-nums text-muted group-hover:text-ink">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-tint">
            <div className="h-2 rounded-full bg-brand transition-[width]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
