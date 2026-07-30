import {
  AddButton,
  EmptyState,
  ItemCard,
  LabeledField,
  asRecord,
  moveItem,
  valueAsString,
} from "./shared";

const MAX_COLUMNS = 8;
const MAX_ROWS = 12;

function rowCells(value: unknown): unknown[] {
  return Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];
}

export function TableSlotEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const table = asRecord(value);
  const headers = Array.isArray(table.headers) ? table.headers : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const hasMismatchedRows = rows.some(
    (row) => !Array.isArray(row) || row.length !== headers.length,
  );

  const commit = (updates: Record<string, unknown>) => {
    onChange({ ...table, ...updates });
  };

  const updateHeader = (index: number, nextValue: string) => {
    const next = [...headers];
    next[index] = nextValue;
    commit({ headers: next });
  };

  const moveColumn = (index: number, to: number) => {
    if (to < 0 || to >= headers.length) return;
    const nextHeaders = moveItem(headers, index, to);
    const nextRows = rows.map((row) =>
      Array.isArray(row) ? moveItem(row, index, to) : row,
    );
    commit({ headers: nextHeaders, rows: nextRows });
  };

  const removeColumn = (index: number) => {
    commit({
      headers: headers.filter((_, headerIndex) => headerIndex !== index),
      rows: rows.map((row) =>
        Array.isArray(row)
          ? row.filter((_, cellIndex) => cellIndex !== index)
          : row,
      ),
    });
  };

  const addColumn = () => {
    if (headers.length >= MAX_COLUMNS) return;
    const nextHeaders = [...headers, `第 ${headers.length + 1} 列`];
    const nextRows = rows.map((row) => {
      const normalized = rowCells(row)
        .slice(0, headers.length)
        .map(valueAsString);
      while (normalized.length < headers.length) normalized.push("");
      return [...normalized, ""];
    });
    commit({ headers: nextHeaders, rows: nextRows });
  };

  const updateCell = (
    rowIndex: number,
    columnIndex: number,
    nextValue: string,
  ) => {
    const nextRows = [...rows];
    const nextRow = rowCells(rows[rowIndex]).map(valueAsString);
    while (nextRow.length < headers.length) nextRow.push("");
    nextRow[columnIndex] = nextValue;
    nextRows[rowIndex] = nextRow;
    commit({ rows: nextRows });
  };

  const normalizeRows = () => {
    const nextRows = rows.map((row) => {
      const nextRow = rowCells(row).slice(0, headers.length).map(valueAsString);
      while (nextRow.length < headers.length) nextRow.push("");
      return nextRow;
    });
    commit({ rows: nextRows });
  };

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700">表头与列</h4>
          <span className="text-[10px] text-slate-400">
            {headers.length}/{MAX_COLUMNS} 列
          </span>
        </div>
        {headers.length === 0 && (
          <EmptyState>请先添加至少一列表头。</EmptyState>
        )}
        {headers.map((header, index) => (
          <ItemCard
            key={index}
            title={`第 ${index + 1} 列`}
            index={index}
            count={headers.length}
            onMove={(to) => moveColumn(index, to)}
            onRemove={() => removeColumn(index)}
          >
            <LabeledField
              label="表头名称"
              required
              value={valueAsString(header)}
              onChange={(nextValue) => updateHeader(index, nextValue)}
              error={
                valueAsString(header).trim() ? undefined : "表头名称不能为空"
              }
            />
          </ItemCard>
        ))}
        <AddButton
          label="添加一列"
          onClick={addColumn}
          disabled={headers.length >= MAX_COLUMNS}
          hint={`为保证投影可读，最多 ${MAX_COLUMNS} 列`}
        />
      </section>

      <section className="space-y-2 border-t border-slate-200 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-700">数据行</h4>
          <span className="text-[10px] text-slate-400">
            {rows.length}/{MAX_ROWS} 行
          </span>
        </div>
        {hasMismatchedRows && headers.length > 0 && (
          <button
            type="button"
            onClick={normalizeRows}
            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-700 transition hover:bg-amber-100"
          >
            按当前表头修整所有行
          </button>
        )}
        {rows.length === 0 && <EmptyState>还没有数据行。</EmptyState>}
        {rows.map((row, rowIndex) => {
          const cells = rowCells(row);
          return (
            <ItemCard
              key={rowIndex}
              title={`第 ${rowIndex + 1} 行`}
              index={rowIndex}
              count={rows.length}
              onMove={(to) => commit({ rows: moveItem(rows, rowIndex, to) })}
              onRemove={() =>
                commit({ rows: rows.filter((_, index) => index !== rowIndex) })
              }
            >
              {headers.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-amber-600">
                  添加表头后即可编辑这一行的单元格。
                </p>
              ) : (
                headers.map((header, columnIndex) => (
                  <LabeledField
                    key={columnIndex}
                    label={
                      valueAsString(header).trim() || `第 ${columnIndex + 1} 列`
                    }
                    value={valueAsString(cells[columnIndex])}
                    onChange={(nextValue) =>
                      updateCell(rowIndex, columnIndex, nextValue)
                    }
                    placeholder="输入单元格内容"
                  />
                ))
              )}
            </ItemCard>
          );
        })}
        <AddButton
          label="添加一行"
          onClick={() =>
            rows.length < MAX_ROWS &&
            commit({ rows: [...rows, headers.map(() => "")] })
          }
          disabled={rows.length >= MAX_ROWS || headers.length === 0}
          hint={
            headers.length === 0
              ? "请先添加表头"
              : `播放器最多展示 ${MAX_ROWS} 行`
          }
        />
      </section>
    </div>
  );
}
