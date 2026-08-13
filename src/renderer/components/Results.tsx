import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, Search, XCircle } from "lucide-react";
import { ReconciliationResult } from "../../shared/types";

export default function Results({
  result,
  onExport
}: {
  result: ReconciliationResult | null;
  onExport: () => void;
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!result) return [];
    const q = query.toLowerCase();
    return result.details.filter(d =>
      !q ||
      d.key.toLowerCase().includes(q) ||
      d.status.toLowerCase().includes(q) ||
      d.fields.some(f =>
        `${f.sourceValue} ${f.destinationValue} ${f.sourceColumn}`
          .toLowerCase()
          .includes(q)
      )
    ).slice(0, 500);
  }, [result, query]);

  if (!result) {
    return (
      <div className="empty-large">
        <Database size={46}/>
        <h2>No reconciliation result</h2>
        <p>Configure your datasets and run reconciliation.</p>
      </div>
    );
  }

  return (
    <section className="results">
      <div className="result-head">
        <div>
          <div className="eyebrow">RECONCILIATION RESULT</div>
          <h2>{result.totalSourceRows.toLocaleString()} source rows evaluated</h2>
          <p>Mode: <b>{result.mode === "kb" ? "KB Doc" : "General Equal"}</b></p>
        </div>
        <button className="primary small" onClick={onExport}>
          <Download size={16}/> Export Excel
        </button>
      </div>

      <div className="stat-grid">
        <Stat icon={<CheckCircle2/>} label="Matches" value={result.summary.matches}/>
        <Stat icon={<XCircle/>} label="Differences" value={result.summary.differences}/>
        <Stat icon={<AlertTriangle/>} label="Missing" value={result.summary.missingInDestination}/>
        <Stat icon={<Database/>} label="Destination Only" value={result.summary.destinationOnly}/>
      </div>

      <div className="card">
        <div className="table-toolbar">
          <h3>Detailed comparison</h3>
          <div className="search"><Search size={15}/><input placeholder="Search key, value, status..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Key</th><th>Row Status</th><th>Source Column</th>
                <th>Source</th><th>Expected</th><th>Destination</th><th>Field</th>
              </tr>
            </thead>
            <tbody>
              {rows.flatMap((d, i) =>
                d.fields.length
                  ? d.fields.map((f, j) => (
                    <tr key={`${i}-${j}`}>
                      <td>{d.key}</td>
                      <td><Status status={d.status}/></td>
                      <td>{f.sourceColumn}</td>
                      <td>{f.sourceValue}</td>
                      <td>{f.expectedValue}</td>
                      <td>{f.destinationValue}</td>
                      <td><Status status={f.status}/></td>
                    </tr>
                  ))
                  : <tr key={i}><td>{d.key}</td><td><Status status={d.status}/></td><td colSpan={5}>No field detail</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: {icon: React.ReactNode;label:string;value:number}) {
  return <div className="stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value.toLocaleString()}</strong></div></div>;
}

function Status({status}:{status:string}) {
  const cls = status.includes("MATCH") ? "good" : status.includes("MISSING") ? "warn" : "bad";
  return <span className={`status ${cls}`}>{status.replaceAll("_"," ")}</span>;
}
