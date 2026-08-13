import {
  ColumnMapping,
  ComparisonMode,
  Dataset,
  DetailResult,
  FieldResult,
  KeyMapping,
  KBRule,
  ReconciliationResult
} from "../../shared/types";

const normalize = (v: unknown): string =>
  String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

function makeKey(row: Record<string, unknown>, keys: KeyMapping[]) {
  return keys.map(k => normalize(row[k.source])).join("¦");
}

function makeDestinationKey(row: Record<string, unknown>, keys: KeyMapping[]) {
  return keys.map(k => normalize(row[k.destination])).join("¦");
}

function kbExpected(
  rules: KBRule[],
  sourceColumn: string,
  destinationColumn: string,
  sourceValue: string
): { value: string; mapped: boolean } {
  const rule = rules.find(
    r =>
      r.sourceColumn.toLowerCase() === sourceColumn.toLowerCase() &&
      r.destinationColumn.toLowerCase() === destinationColumn.toLowerCase() &&
      normalize(r.sourceValue) === normalize(sourceValue)
  );

  if (!rule) return { value: sourceValue, mapped: false };
  return { value: rule.destinationValue, mapped: true };
}

export function reconcile(
  source: Dataset,
  destination: Dataset,
  keys: KeyMapping[],
  mappings: ColumnMapping[],
  mode: ComparisonMode,
  kbRules: KBRule[] = []
): ReconciliationResult {
  const destinationMap = new Map<string, Record<string, unknown>[]>();

  for (const row of destination.data) {
    const key = makeDestinationKey(row, keys);
    const bucket = destinationMap.get(key) || [];
    bucket.push(row);
    destinationMap.set(key, bucket);
  }

  const sourceKeyCount = new Map<string, number>();
  source.data.forEach(row => {
    const key = makeKey(row, keys);
    sourceKeyCount.set(key, (sourceKeyCount.get(key) || 0) + 1);
  });

  const matchedDestinationKeys = new Set<string>();
  const details: DetailResult[] = [];
  const fields = new Map<string, FieldResult>();

  for (const mapping of mappings) {
    fields.set(mapping.source, {
      sourceColumn: mapping.source,
      destinationColumn: mapping.destination,
      matched: 0,
      different: 0,
      missing: 0,
      destinationOnly: 0,
      unmapped: 0
    });
  }

  let matches = 0;
  let differences = 0;
  let missingInDestination = 0;
  let duplicateKeys = 0;
  let unmappedValues = 0;

  for (const sourceRow of source.data) {
    const key = makeKey(sourceRow, keys);
    const candidates = destinationMap.get(key) || [];
    const duplicate = candidates.length > 1 || (sourceKeyCount.get(key) || 0) > 1;

    if (duplicate) duplicateKeys++;

    if (!candidates.length) {
      missingInDestination++;
      details.push({
        key,
        status: "MISSING_IN_DESTINATION",
        fields: mappings.map(m => {
          const f = fields.get(m.source)!;
          f.missing++;
          return {
            sourceColumn: m.source,
            destinationColumn: m.destination,
            sourceValue: String(sourceRow[m.source] ?? ""),
            expectedValue: "",
            destinationValue: "",
            status: "MISSING",
            reason: "Matching key was not found in destination."
          };
        })
      });
      continue;
    }

    const destinationRow = candidates[0];
    matchedDestinationKeys.add(key);

    let rowHasDifference = false;
    const rowFields: DetailResult["fields"] = [];

    for (const mapping of mappings) {
      const sourceValue = String(sourceRow[mapping.source] ?? "");
      const destinationValue = String(destinationRow[mapping.destination] ?? "");
      let expectedValue = sourceValue;
      let isMapped = true;

      if (mode === "kb") {
        const expected = kbExpected(
          kbRules,
          mapping.source,
          mapping.destination,
          sourceValue
        );
        expectedValue = expected.value;
        isMapped = expected.mapped;

        if (!isMapped && normalize(sourceValue) !== normalize(destinationValue)) {
          unmappedValues++;
          fields.get(mapping.source)!.unmapped++;
        }
      }

      const equal =
        normalize(expectedValue) === normalize(destinationValue);

      const f = fields.get(mapping.source)!;

      if (equal) {
        f.matched++;
        rowFields.push({
          sourceColumn: mapping.source,
          destinationColumn: mapping.destination,
          sourceValue,
          expectedValue,
          destinationValue,
          status: "MATCH",
          reason: mode === "kb" && isMapped ? "Matched through KB rule." : "Exact normalized match."
        });
      } else {
        f.different++;
        rowHasDifference = true;
        rowFields.push({
          sourceColumn: mapping.source,
          destinationColumn: mapping.destination,
          sourceValue,
          expectedValue,
          destinationValue,
          status: isMapped ? "DIFFERENCE" : "UNMAPPED",
          reason: !isMapped && mode === "kb"
            ? "No KB mapping exists for this source value."
            : "Destination value differs from expected value."
        });
      }
    }

    if (duplicate) {
      details.push({ key, status: "DUPLICATE_KEY", fields: rowFields });
    } else if (rowHasDifference) {
      differences++;
      details.push({ key, status: "DIFFERENCE", fields: rowFields });
    } else {
      matches++;
      details.push({ key, status: "MATCH", fields: rowFields });
    }
  }

  let destinationOnly = 0;
  for (const [key, rows] of destinationMap.entries()) {
    if (!matchedDestinationKeys.has(key)) {
      destinationOnly += rows.length;
      details.push({
        key,
        status: "DESTINATION_ONLY",
        fields: mappings.map(m => {
          const f = fields.get(m.source)!;
          f.destinationOnly++;
          return {
            sourceColumn: m.source,
            destinationColumn: m.destination,
            sourceValue: "",
            expectedValue: "",
            destinationValue: String(rows[0][m.destination] ?? ""),
            status: "DIFFERENCE",
            reason: "Destination row has no matching source key."
          };
        })
      });
    }
  }

  return {
    id: crypto.randomUUID(),
    mode,
    totalSourceRows: source.rows,
    totalDestinationRows: destination.rows,
    summary: {
      matches,
      differences,
      missingInDestination,
      destinationOnly,
      duplicateKeys,
      unmappedValues
    },
    fields: Array.from(fields.values()),
    details
  };
}
