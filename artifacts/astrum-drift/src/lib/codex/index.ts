import { ENEMY_ENTRIES } from "./enemies";
import { LOCATION_ENTRIES } from "./locations";
import { MATERIAL_ENTRIES } from "./materials";
import { TOOL_ENTRIES } from "./tools";
import type { CodexCategory, CodexEntry } from "./types";

export * from "./types";

export const CODEX_ENTRIES: CodexEntry[] = [
  ...TOOL_ENTRIES,
  ...ENEMY_ENTRIES,
  ...MATERIAL_ENTRIES,
  ...LOCATION_ENTRIES,
];

export function getCodexEntriesByCategory(
  category: CodexCategory,
): CodexEntry[] {
  return CODEX_ENTRIES.filter((entry) => entry.category === category);
}

export function getCodexEntryById(id: string): CodexEntry | undefined {
  return CODEX_ENTRIES.find((entry) => entry.id === id);
}

export function searchCodexEntries(
  query: string,
  category?: CodexCategory,
): CodexEntry[] {
  const normalized = query.trim().toLowerCase();
  const pool = category
    ? getCodexEntriesByCategory(category)
    : CODEX_ENTRIES;

  if (!normalized) return pool;

  return pool.filter((entry) => {
    const haystack = [
      entry.name,
      entry.subtitle ?? "",
      entry.description,
      entry.skill ?? "",
      entry.intelNotes ?? "",
      entry.materialGroup ?? "",
      entry.planet ?? "",
      entry.locationLayer ?? "",
      entry.recipe ?? "",
      entry.drops ?? "",
      entry.codeNote ?? "",
      entry.sourceDoc ?? "",
      entry.requirements ?? "",
      ...(entry.enabledActions ?? []),
      ...entry.tags,
      ...Object.entries(entry.stats ?? {}).map(([k, v]) => `${k} ${v}`),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  });
}

export { CODEX_CATEGORIES } from "./types";
