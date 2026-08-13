import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Dataset, KBRule } from "../../shared/types";

function clean(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function loadDataset(file: File): Promise<Dataset> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = file.name.toLowerCase().split(".").pop();

  let rows: Record<string, unknown>[] = [];

  if (ext === "csv") {
    const text = new TextDecoder().decode(bytes);
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });
    rows = parsed.data;
  } else {
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: ""
    });
  }

  const columns = Array.from(
    new Set(rows.flatMap(r => Object.keys(r).map(String)))
  );

  return {
    id: crypto.randomUUID(),
    path: file.name,
    name: file.name,
    rows: rows.length,
    columns,
    data: rows
  };
}

export async function loadMappingWorkbook(file: File): Promise<{
  mappings: { source: string; destination: string }[];
  rules: KBRule[];
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ""
  });

  const headers = Object.keys(rows[0] || {});
  const find = (...names: string[]) =>
    headers.find(h => names.includes(h.trim().toLowerCase()));

  const sourceColumn = find("source column", "source_column", "source");
  const destinationColumn = find(
    "destination column",
    "destination_column",
    "destination"
  );
  const sourceValue = find("source value", "source_value");
  const destinationValue = find(
    "destination value",
    "destination_value",
    "mapped value",
    "mapped_value"
  );
  const organization = find("organization", "org");

  const mappings: { source: string; destination: string }[] = [];
  const rules: KBRule[] = [];

  for (const row of rows) {
    const sc = sourceColumn ? clean(row[sourceColumn]) : "";
    const dc = destinationColumn ? clean(row[destinationColumn]) : "";

    if (sc && dc && !sourceValue) {
      mappings.push({ source: sc, destination: dc });
    }

    if (sc && dc && sourceValue && destinationValue) {
      rules.push({
        organization: organization ? clean(row[organization]) : undefined,
        sourceColumn: sc,
        sourceValue: clean(row[sourceValue]),
        destinationColumn: dc,
        destinationValue: clean(row[destinationValue])
      });
    }
  }

  return { mappings, rules };
}
