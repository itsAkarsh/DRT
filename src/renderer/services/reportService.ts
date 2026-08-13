import * as XLSX from "xlsx";
import { ReconciliationResult } from "../../shared/types";

export function createReportWorkbook(result: ReconciliationResult): Uint8Array {
  const wb = XLSX.utils.book_new();

  const summary = [{
    "Comparison Mode": result.mode === "kb" ? "KB Doc" : "General Equal",
    "Source Rows": result.totalSourceRows,
    "Destination Rows": result.totalDestinationRows,
    "Matches": result.summary.matches,
    "Differences": result.summary.differences,
    "Missing in Destination": result.summary.missingInDestination,
    "Destination Only": result.summary.destinationOnly,
    "Duplicate Keys": result.summary.duplicateKeys,
    "Unmapped KB Values": result.summary.unmappedValues
  }];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(result.fields), "Field Summary");

  const details = result.details.flatMap(d =>
    d.fields.length
      ? d.fields.map(f => ({
          Key: d.key,
          "Row Status": d.status,
          "Source Column": f.sourceColumn,
          "Destination Column": f.destinationColumn,
          "Source Value": f.sourceValue,
          "Expected Value": f.expectedValue,
          "Destination Value": f.destinationValue,
          "Field Status": f.status,
          Reason: f.reason || ""
        }))
      : [{
          Key: d.key,
          "Row Status": d.status,
          "Source Column": "",
          "Destination Column": "",
          "Source Value": "",
          "Expected Value": "",
          "Destination Value": "",
          "Field Status": "",
          Reason: ""
        }]
  );

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(details), "Details");

  const bytes = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Uint8Array(bytes);
}
