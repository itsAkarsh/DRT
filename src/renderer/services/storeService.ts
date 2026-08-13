export interface SavedConfiguration {
  id: string;
  name: string;
  sourcePath: string;
  destinationPath: string;
  mappingPath?: string;
  kbPath?: string;
  mode: "general" | "kb";
  keys: { source: string; destination: string }[];
  mappings: { source: string; destination: string }[];
  verifyColumns: string[];
}

const KEY = "drt.saved.configurations";

export function getConfigurations(): SavedConfiguration[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveConfiguration(config: SavedConfiguration) {
  const current = getConfigurations().filter(x => x.id !== config.id);
  localStorage.setItem(KEY, JSON.stringify([config, ...current]));
}

export function deleteConfiguration(id: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(getConfigurations().filter(x => x.id !== id))
  );
}
