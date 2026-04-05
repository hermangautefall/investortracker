export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8 bg-white/3">
            {/* Column header skeletons */}
            {[40, 80, 160, 80, 60, 70, 60].map((w, i) => (
              <th key={i} className="px-4 py-3">
                <div
                  className="h-3 rounded bg-white/10 animate-pulse"
                  style={{ width: w }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {/* Date */}
              <td className="px-4 py-3">
                <div className="h-3 w-16 rounded bg-white/8 animate-pulse" />
              </td>
              {/* Name */}
              <td className="px-4 py-3">
                <div className="h-3 rounded bg-white/8 animate-pulse" style={{ width: 90 + (rowIdx % 3) * 20 }} />
              </td>
              {/* Ticker + company */}
              <td className="px-4 py-3">
                <div className="h-3 w-12 rounded bg-white/8 animate-pulse mb-1.5" />
                <div className="h-2 w-24 rounded bg-white/5 animate-pulse" />
              </td>
              {/* Badge */}
              <td className="px-4 py-3">
                <div className="h-5 w-10 rounded bg-white/8 animate-pulse" />
              </td>
              {/* Shares */}
              <td className="px-4 py-3 text-right">
                <div className="h-3 w-14 rounded bg-white/8 animate-pulse ml-auto" />
              </td>
              {/* Value */}
              <td className="px-4 py-3 text-right">
                <div className="h-3 w-12 rounded bg-white/8 animate-pulse ml-auto" />
              </td>
              {/* Icon */}
              <td className="px-4 py-3 text-center">
                <div className="h-3 w-3 rounded bg-white/8 animate-pulse mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
