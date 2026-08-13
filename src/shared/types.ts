export type ComparisonMode = "general" | "kb";

export interface Dataset {
  id: string;
  path: string;
  name: string;
  rows: number;
  columns: string[];
  data: Record<string, unknown>[];
}

export interface KeyMapping {
  source: string;
  destination: string;
}

export interface ColumnMapping {
  source: string;
  destination: string;
}

export interface KBRule {
  organization?: string;
  sourceColumn: string;
  sourceValue: string;
  destinationColumn: string;
  destinationValue: string;
}

export type RowStatus =
  | "MATCH"
  | "DIFFERENCE"
  | "MISSING_IN_DESTINATION"
  | "DESTINATION_ONLY"
  | "DUPLICATE_KEY";

export interface FieldResult {
  sourceColumn: string;
  destinationColumn: string;
  matched: number;
  different: number;
  missing: number;
  destinationOnly: number;
  unmapped: number;
}

export interface DetailResult {
  key: string;
  status: RowStatus;
  fields: {
    sourceColumn: string;
    destinationColumn: string;
    sourceValue: string;
    expectedValue: string;
    destinationValue: string;
    status: "MATCH" | "DIFFERENCE" | "MISSING" | "UNMAPPED";
    reason?: string;
  }[];
}

export interface ReconciliationResult {
  id: string;
  mode: ComparisonMode;
  totalSourceRows: number;
  totalDestinationRows: number;
  summary: {
    matches: number;
    differences: number;
    missingInDestination: number;
    destinationOnly: number;
    duplicateKeys: number;
    unmappedValues: number;
  };
  fields: FieldResult[];
  details: DetailResult[];
}
