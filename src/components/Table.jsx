function Table({ columns, data, emptyTitle = "No data found", emptyText = "Try adjusting your filters." }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/50 bg-white/85 shadow-soft dark:border-white/5 dark:bg-slate-900/80">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50/80 dark:bg-slate-950/70">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <p className="text-base font-medium text-slate-700 dark:text-slate-200">{emptyTitle}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.id || index}
                  className="border-t border-slate-100 transition hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
