import type { MainGameLocationId } from "@/lib/main-game";

export type CodexCategory = "tools" | "enemies" | "materials" | "locations";

export type CodexThreatLevel = "low" | "moderate" | "high" | "extreme";

export type CodexEntry = {
  id: string;
  category: CodexCategory;
  name: string;
  subtitle?: string;
  description: string;
  tags: string[];
  /** Key-value stats shown in the detail panel */
  stats?: Record<string, string | number>;
  /** Crafting or unlock requirements */
  recipe?: string;
  requirements?: string;
  /** Documented drop or loot notes */
  drops?: string;
  /** Design workbook this entry was sourced from */
  sourceDoc?: string;
  /** In-game id/name when it differs from design docs */
  codeNote?: string;
  skill?: string;
  enabledActions?: string[];
  tier?: "training" | "field" | string;
  intelNotes?: string;
  threatLevel?: CodexThreatLevel;
  materialGroup?: string;
  locationId?: MainGameLocationId;
  locationLayer?: string;
  planet?: string;
  contentTier?: number;
  /** Tools tab section header (Mining Tools, Melee Weapons, etc.) */
  toolGroup?: string;
};

export const CODEX_CATEGORIES: {
  id: CodexCategory;
  label: string;
  blurb: string;
}[] = [
  {
    id: "tools",
    label: "Tools",
    blurb: "Equipment, weapons, armor, and field kits",
  },
  {
    id: "enemies",
    label: "Enemies",
    blurb: "Hostile contacts from the combat benchmark",
  },
  {
    id: "materials",
    label: "Materials",
    blurb: "Ores, bars, salvage, harvest, gems, and consumables",
  },
  {
    id: "locations",
    label: "Locations",
    blurb: "Verdant Rim settlements and mining sites",
  },
];
