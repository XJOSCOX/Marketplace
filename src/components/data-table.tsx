"use client";
import { useState, type ReactNode } from "react";
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  const [q, setQ] = useState("");
  const searchable = (v: ReactNode): string =>
    typeof v === "string" || typeof v === "number" ? String(v) : "";
  const filtered = rows.filter(
    (row) =>
      !q ||
      row.some((v) => searchable(v).toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="panel table-panel">
      <div className="table-toolbar">
        <h3>{rows.length} records</h3>
        <input
          aria-label="Filter records"
          placeholder="Filter records…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="table-empty">No matching records.</p>
        )}
      </div>
    </div>
  );
}
