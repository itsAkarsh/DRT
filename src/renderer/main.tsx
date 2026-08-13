import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell, CalendarClock, Check, ChevronDown, FileSpreadsheet,
  GitCompareArrows, KeyRound, Plus, Settings2, Trash2, Upload
} from "lucide-react";
import "./styles.css";
import UploadCard from "./components/UploadCard";
import Results from "./components/Results";
import { loadDataset, loadMappingWorkbook } from "./services/dataService";
import { reconcile } from "./services/reconciliationService";
import { createReportWorkbook } from "./services/reportService";
import {
  deleteConfiguration, getConfigurations, saveConfiguration,
  SavedConfiguration
} from "./services/storeService";
import {
  ColumnMapping, ComparisonMode, Dataset, KeyMapping, ReconciliationResult
} from "../shared/types";

type Tab = "reconcile" | "results" | "schedules" | "alerts" | "settings";

function App() {
  const [tab, setTab] = useState<Tab>("reconcile");
  const [source, setSource] = useState<Dataset|null>(null);
  const [destination, setDestination] = useState<Dataset|null>(null);
  const [mappingFile, setMappingFile] = useState<string>("");
  const [kbFile, setKbFile] = useState<string>("");
  const [keys, setKeys] = useState<KeyMapping[]>([{source:"",destination:""}]);
  const [verifyColumns, setVerifyColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [mode, setMode] = useState<ComparisonMode>("general");
  const [kbRules, setKbRules] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ReconciliationResult|null>(null);
  const [configs, setConfigs] = useState<SavedConfiguration[]>(getConfigurations());

  const destinationColumns = destination?.columns || [];
  const sourceColumns = source?.columns || [];

  async function chooseDataset(type:"source"|"destination") {
    const file = await pickFile(".csv,.xlsx,.xls");
    if (!file) return;
    try {
      setMessage("");
      const dataset = await loadDataset(file);
      if (type === "source") {
        setSource(dataset);
        setVerifyColumns(dataset.columns);
      } else {
        setDestination(dataset);
      }
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function chooseMapping() {
    const file = await pickFile(".xlsx,.xls");
    if (!file) return;
    try {
      setMappingFile(file.name);
      const loaded = await loadMappingWorkbook(file);
      if (loaded.mappings.length) {
        setMappings(prev => {
          const merged = [...prev];
          for (const m of loaded.mappings) {
            const i = merged.findIndex(x => x.source === m.source);
            if (i >= 0) merged[i] = m; else merged.push(m);
          }
          return merged;
        });
      }
      setMessage(`Loaded ${loaded.mappings.length} column mappings.`);
    } catch(e) { setMessage(String(e)); }
  }

  async function chooseKB() {
    const file = await pickFile(".xlsx,.xls");
    if (!file) return;
    try {
      setKbFile(file.name);
      const loaded = await loadMappingWorkbook(file);
      setKbRules(loaded.rules);
      if (loaded.mappings.length) {
        setMappings(prev => {
          const merged = [...prev];
          for (const m of loaded.mappings) {
            const i = merged.findIndex(x => x.source === m.source);
            if (i >= 0) merged[i] = m; else merged.push(m);
          }
          return merged;
        });
      }
      setMessage(`Loaded ${loaded.rules.length} KB value rules.`);
    } catch(e) { setMessage(String(e)); }
  }

  function autoCreateMappings() {
    const result: ColumnMapping[] = verifyColumns.map(s => ({
      source: s,
      destination: destinationColumns.includes(s) ? s : ""
    }));
    setMappings(result);
  }

  async function run() {
    setMessage("");
    if (!source || !destination) return setMessage("Upload Source and Destination first.");
    if (!keys.length || keys.some(k => !k.source || !k.destination))
      return setMessage("Complete all key mappings.");
    const selected = mappings.filter(m => verifyColumns.includes(m.source) && m.destination);
    if (!selected.length) return setMessage("Map at least one source column.");
    if (mode === "kb" && !kbRules.length)
      return setMessage("KB Doc mode requires a KB workbook with value mappings.");

    setBusy(true);
    try {
      const r = reconcile(source, destination, keys, selected, mode, kbRules);
      setResult(r);
      setTab("results");
    } catch(e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function exportResult() {
    if (!result) return;
    const bytes = createReportWorkbook(result);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DRT_Reconciliation_${new Date().toISOString().slice(0,10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function saveCurrent() {
    if (!source || !destination) {
      setMessage("Upload Source and Destination before saving.");
      return;
    }
    const config: SavedConfiguration = {
      id: crypto.randomUUID(),
      name: `${source.name} → ${destination.name}`,
      sourcePath: source.path,
      destinationPath: destination.path,
      mappingPath: mappingFile || undefined,
      kbPath: kbFile || undefined,
      mode,
      keys,
      mappings,
      verifyColumns
    };
    saveConfiguration(config);
    setConfigs(getConfigurations());
    setMessage("Reconciliation configuration saved locally.");
  }

  function loadConfig(c: SavedConfiguration) {
    setKeys(c.keys);
    setMappings(c.mappings);
    setVerifyColumns(c.verifyColumns);
    setMode(c.mode);
    setMessage(`Configuration "${c.name}" loaded. Re-select the source and destination files before running.`);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">DR</div>
          <div><b>DRT</b><span>Data Reconciliation</span></div>
        </div>

        <nav>
          <Nav active={tab==="reconcile"} icon={<GitCompareArrows/>} text="Reconcile" onClick={()=>setTab("reconcile")}/>
          <Nav active={tab==="results"} icon={<FileSpreadsheet/>} text="Results" onClick={()=>setTab("results")}/>
          <Nav active={tab==="schedules"} icon={<CalendarClock/>} text="Schedules" onClick={()=>setTab("schedules")}/>
          <Nav active={tab==="alerts"} icon={<Bell/>} text="Alerts" onClick={()=>setTab("alerts")}/>
          <Nav active={tab==="settings"} icon={<Settings2/>} text="Settings" onClick={()=>setTab("settings")}/>
        </nav>

        <div className="side-status"><span className="dot"/> Local processing engine</div>
      </aside>

      <main>
        <header>
          <div>
            <div className="eyebrow">DESKTOP RECONCILIATION WORKSPACE</div>
            <h1>Compare. Validate. Explain.</h1>
            <p>Local-first CSV/XLSX reconciliation with manual mappings and organization-specific KB rules.</p>
          </div>
          <div className="engine"><span className="dot"/> No backend • Local engine</div>
        </header>

        {message && <div className="message">{message}</div>}

        {tab === "reconcile" && (
          <section className="workspace">
            <Step n="01" title="Upload datasets" sub="CSV / XLSX">
              <div className="upload-grid">
                <UploadCard title="Source dataset" dataset={source} onChoose={()=>chooseDataset("source")}/>
                <UploadCard title="Destination dataset" dataset={destination} onChoose={()=>chooseDataset("destination")}/>
              </div>
            </Step>

            <Step n="02" title="Select match keys" sub="Keys identify the corresponding record">
              <div className="card">
                {keys.map((k,i)=>
                  <div className="key-row" key={i}>
                    <Select value={k.source} placeholder="Source key" options={sourceColumns}
                      onChange={v=>setKeys(x=>x.map((a,n)=>n===i?{...a,source:v}:a))}/>
                    <span className="arrow">→</span>
                    <Select value={k.destination} placeholder="Destination key" options={destinationColumns}
                      onChange={v=>setKeys(x=>x.map((a,n)=>n===i?{...a,destination:v}:a))}/>
                    {keys.length>1 && <button className="icon-btn" onClick={()=>setKeys(x=>x.filter((_,n)=>n!==i))}><Trash2 size={16}/></button>}
                  </div>
                )}
                <button className="ghost" onClick={()=>setKeys([...keys,{source:"",destination:""}])}><Plus size={15}/> Add another key</button>
              </div>
            </Step>

            <Step n="03" title="Select source columns to verify" sub="Each selected field is reconciled independently">
              <div className="card">
                <div className="checks">
                  {sourceColumns.map(c=>
                    <label className="check" key={c}>
                      <input type="checkbox" checked={verifyColumns.includes(c)}
                        onChange={e=>setVerifyColumns(v=>e.target.checked?[...v,c]:v.filter(x=>x!==c))}/>
                      {c}
                    </label>
                  )}
                </div>
                <button className="ghost mt12" onClick={()=>setVerifyColumns(sourceColumns)}>Select all source columns</button>
              </div>
            </Step>

            <Step n="04" title="Map columns" sub="Manual mapping or upload your mapping workbook">
              <div className="card">
                <div className="mapping-head">
                  <button className="secondary" onClick={chooseMapping}><Upload size={15}/> Upload Mapping Excel</button>
                  <button className="ghost" onClick={autoCreateMappings}>Auto-map identical names</button>
                  {mappingFile && <span className="file-tag">{mappingFile.split(/[\\/]/).pop()}</span>}
                </div>
                <div className="mapping-list">
                  {verifyColumns.map(s=>{
                    const current = mappings.find(m=>m.source===s)?.destination || "";
                    return <div className="map-row" key={s}>
                      <div className="source-name">{s}</div><span className="arrow">→</span>
                      <Select value={current} placeholder="Destination column" options={destinationColumns}
                        onChange={v=>setMappings(prev=>{
                          const exists=prev.some(m=>m.source===s);
                          return exists ? prev.map(m=>m.source===s?{source:s,destination:v}:m) : [...prev,{source:s,destination:v}]
                        })}/>
                    </div>
                  })}
                </div>
              </div>
            </Step>

            <Step n="05" title="Comparison intelligence" sub="Choose one comparison rule per reconciliation">
              <div className="mode-grid">
                <ModeCard active={mode==="general"} icon={<GitCompareArrows/>} title="General Equal"
                  text="Normalized equality. Values must resolve to the same semantic text."
                  onClick={()=>setMode("general")}/>
                <ModeCard active={mode==="kb"} icon={<KeyRound/>} title="KB Doc"
                  text="Translate source values through organization-specific KB rules before comparing."
                  onClick={()=>setMode("kb")}/>
              </div>
              {mode==="kb" && <div className="kb-panel">
                <KeyRound size={19}/>
                <div><b>KB Doc enabled</b><p>Upload a workbook containing Source Column, Source Value, Destination Column and Destination Value.</p></div>
                <button className="secondary" onClick={chooseKB}>Upload KB Excel</button>
                {kbRules.length>0 && <span className="rule-count">{kbRules.length} rules</span>}
              </div>}
            </Step>

            <div className="action-row">
              <button className="ghost" onClick={saveCurrent}>Save configuration</button>
              <button className="primary" disabled={busy} onClick={run}>
                {busy ? "Reconciling..." : <><GitCompareArrows size={17}/> Run reconciliation</>}
              </button>
            </div>
          </section>
        )}

        {tab==="results" && <Results result={result} onExport={exportResult}/>}

        {tab==="schedules" && <Schedules configs={configs} onLoad={loadConfig} onDelete={id=>{deleteConfiguration(id);setConfigs(getConfigurations())}}/>}

        {tab==="alerts" && <InfoPage title="Mismatch Alerts" text="The alert service is isolated from the reconciliation engine. In production, configure SMTP/OAuth credentials in the Electron main process and store secrets in the operating-system credential store."/>}

        {tab==="settings" && <InfoPage title="Settings" text="Recommended production settings include report retention, duplicate-key policy, KB fallback policy, alert thresholds, and secure email credentials."/>}
      </main>
    </div>
  );
}

function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function Nav({active,icon,text,onClick}:{active:boolean;icon:React.ReactNode;text:string;onClick:()=>void}) {
  return <button className={`nav ${active?"active":""}`} onClick={onClick}>{icon}<span>{text}</span></button>
}
function Step({n,title,sub,children}:{n:string;title:string;sub:string;children:React.ReactNode}) {
  return <><div className="step"><span>{n}</span><div><h2>{title}</h2><p>{sub}</p></div></div>{children}</>
}
function Select({value,placeholder,options,onChange}:{value:string;placeholder:string;options:string[];onChange:(v:string)=>void}) {
  return <div className="select-wrap"><select value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select><ChevronDown size={14}/></div>
}
function ModeCard({active,icon,title,text,onClick}:{active:boolean;icon:React.ReactNode;title:string;text:string;onClick:()=>void}) {
  return <button className={`mode-card ${active?"selected":""}`} onClick={onClick}><div className="mode-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div>{active&&<Check className="selected-icon" size={17}/>}</button>
}
function Schedules({configs,onLoad,onDelete}:{configs:SavedConfiguration[];onLoad:(c:SavedConfiguration)=>void;onDelete:(id:string)=>void}) {
  return <section className="results"><div className="eyebrow">LOCAL CONFIGURATIONS</div><h2>Saved reconciliation jobs</h2><p className="section-copy">Configurations are stored locally in this desktop application. OS-level scheduling can invoke the packaged application for unattended runs.</p>
    <div className="card config-list">{configs.length===0?<div className="empty">No saved configurations.</div>:configs.map(c=><div className="config" key={c.id}><div><b>{c.name}</b><span>{c.mode==="kb"?"KB Doc":"General Equal"} • {c.mappings.length} mappings</span></div><div><button className="ghost" onClick={()=>onLoad(c)}>Load</button><button className="icon-btn" onClick={()=>onDelete(c.id)}><Trash2 size={16}/></button></div></div>)}</div>
  </section>
}
function InfoPage({title,text}:{title:string;text:string}) {
  return <section className="results"><div className="eyebrow">DRT MODULE</div><h2>{title}</h2><div className="card info"><p>{text}</p></div></section>
}
createRoot(document.getElementById("root")!).render(<App/>);
