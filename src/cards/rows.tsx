"use client"


export function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="mt-2 grid gap-1 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="text-right font-medium tabular-nums">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
