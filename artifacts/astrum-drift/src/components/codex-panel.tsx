import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  CODEX_CATEGORIES,
  getCodexEntriesByCategory,
  searchCodexEntries,
  type CodexCategory,
  type CodexEntry,
} from "@/lib/codex";

type CodexPanelProps = {
  onClose: () => void;
};

const THREAT_LABELS: Record<
  NonNullable<CodexEntry["threatLevel"]>,
  { label: string; className: string }
> = {
  low: {
    label: "Low Threat",
    className: "border-chart-2/40 text-chart-2 bg-chart-2/10",
  },
  moderate: {
    label: "Moderate Threat",
    className: "border-primary/40 text-primary bg-primary/10",
  },
  high: {
    label: "High Threat",
    className: "border-destructive/40 text-destructive bg-destructive/10",
  },
  extreme: {
    label: "Extreme Threat",
    className: "border-destructive/60 text-destructive bg-destructive/15",
  },
};

function CodexEntryDetail({ entry }: { entry: CodexEntry }) {
  const threat = entry.threatLevel ? THREAT_LABELS[entry.threatLevel] : null;

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {entry.tier && (
            <Badge
              variant="outline"
              className={
                entry.tier === "training"
                  ? "border-chart-2/40 text-chart-2 uppercase tracking-widest text-[10px]"
                  : "border-primary/40 text-primary uppercase tracking-widest text-[10px]"
              }
            >
              {entry.tier === "training" ? "Training" : "Field Gear"}
            </Badge>
          )}
          {entry.skill && (
            <Badge
              variant="outline"
              className="border-primary/30 text-muted-foreground uppercase tracking-widest text-[10px]"
            >
              {entry.skill}
            </Badge>
          )}
          {threat && (
            <Badge
              variant="outline"
              className={`uppercase tracking-widest text-[10px] ${threat.className}`}
            >
              {threat.label}
            </Badge>
          )}
          {entry.materialGroup && (
            <Badge
              variant="outline"
              className="border-primary/30 text-muted-foreground uppercase tracking-widest text-[10px]"
            >
              {entry.materialGroup}
            </Badge>
          )}
          {entry.locationLayer && (
            <Badge
              variant="outline"
              className="border-primary/30 text-muted-foreground uppercase tracking-widest text-[10px]"
            >
              {entry.locationLayer}
            </Badge>
          )}
        </div>

        <h3 className="text-lg text-primary font-bold uppercase tracking-widest">
          {entry.name}
        </h3>
        {entry.subtitle && (
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
            {entry.subtitle}
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {entry.description}
      </p>

      {entry.enabledActions && entry.enabledActions.length > 0 && (
        <div className="rounded-lg border border-primary/15 bg-background/40 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Enabled Actions
          </p>
          <ul className="space-y-1">
            {entry.enabledActions.map((action) => (
              <li
                key={action}
                className="text-xs text-chart-2 uppercase tracking-widest"
              >
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.intelNotes && (
        <div className="rounded-lg border border-chart-2/25 bg-chart-2/5 p-3 space-y-2">
          <p className="text-[10px] text-chart-2 uppercase tracking-widest font-bold">
            Intel Notes
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {entry.intelNotes}
          </p>
        </div>
      )}

      {entry.planet && (
        <div className="rounded-lg border border-primary/10 bg-background/30 px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Planet
          </p>
          <p className="text-xs text-primary uppercase tracking-widest mt-0.5">
            {entry.planet}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {entry.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] text-muted-foreground/80 uppercase tracking-widest px-2 py-0.5 rounded border border-primary/10"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CodexPanel({ onClose }: CodexPanelProps) {
  const [activeCategory, setActiveCategory] =
    useState<CodexCategory>("tools");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const filteredEntries = useMemo(
    () => searchCodexEntries(searchQuery, activeCategory),
    [searchQuery, activeCategory],
  );

  const selectedEntry = useMemo(() => {
    if (selectedEntryId) {
      const match = filteredEntries.find((entry) => entry.id === selectedEntryId);
      if (match) return match;
    }
    return filteredEntries[0] ?? null;
  }, [filteredEntries, selectedEntryId]);

  const handleCategoryChange = (category: CodexCategory) => {
    setActiveCategory(category);
    setSelectedEntryId(null);
  };

  const activeCategoryMeta = CODEX_CATEGORIES.find(
    (category) => category.id === activeCategory,
  );

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-2 sm:p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-4xl max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-primary/20 p-4 shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Field Manual
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              Codex
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Tools · Enemies · Materials · Verdant Rim
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 shrink-0 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
          >
            Close
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search codex..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9 font-mono text-xs uppercase tracking-widest border-primary/20 bg-background/40 focus-visible:ring-primary/40"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
            {CODEX_CATEGORIES.map((category) => {
              const count = getCodexEntriesByCategory(category.id).length;
              const isActive = category.id === activeCategory;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(category.id)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest">
                    {category.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    {count} entries
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-0 sm:gap-4 px-4 pb-4 overflow-hidden">
          <div className="sm:w-52 shrink-0 flex flex-col min-h-0 border-b sm:border-b-0 sm:border-r border-primary/15 pb-3 sm:pb-0 sm:pr-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 shrink-0">
              {activeCategoryMeta?.label ?? "Entries"}
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-1.5 max-h-[28vh] sm:max-h-none">
              {filteredEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center uppercase tracking-widest">
                  No matches
                </p>
              ) : (
                filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary/50 bg-primary/15 text-primary"
                          : "border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
                      }`}
                    >
                      <p className="text-xs font-bold uppercase tracking-widest truncate">
                        {entry.name}
                      </p>
                      {entry.subtitle && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 truncate">
                          {entry.subtitle}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar pt-3 sm:pt-0">
            {selectedEntry ? (
              <CodexEntryDetail entry={selectedEntry} />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[12rem]">
                <p className="text-xs text-muted-foreground uppercase tracking-widest text-center px-4">
                  {searchQuery
                    ? "No codex entries match your search."
                    : "Select an entry to view details."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
