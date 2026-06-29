import { useState } from "react";
import {
  getMainGameLocation,
  listStarChartLocations,
  type MainGameImageKey,
  type MainGameLocationId,
} from "@/lib/main-game";

type StarChartPanelProps = {
  currentLocationId: MainGameLocationId;
  getLocationImage: (imageKey: MainGameImageKey) => string;
  onClose: () => void;
};

export function StarChartPanel({
  currentLocationId,
  getLocationImage,
  onClose,
}: StarChartPanelProps) {
  const chartLocations = listStarChartLocations();
  const initialChartLocationId =
    chartLocations.find((location) => location.id === currentLocationId)?.id ??
    chartLocations[0]?.id ??
    currentLocationId;
  const [selectedLocationId, setSelectedLocationId] =
    useState<MainGameLocationId>(initialChartLocationId);
  const selectedLocation = getMainGameLocation(selectedLocationId);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/20 p-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Survey Archive
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              Star Chart
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Planetary & settlement maps · Verdant Rim · 5 Planets
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
          >
            Close
          </button>
        </div>

        <div className="p-4 flex flex-col sm:flex-row gap-4 overflow-y-auto custom-scrollbar min-h-0">
          <div className="sm:w-44 shrink-0 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Charted Areas
            </p>

            {chartLocations.map((location) => {
              const isSelected = location.id === selectedLocationId;
              const isCurrent = location.id === currentLocationId;
              const layerLabel =
                location.locationType === "planet_orbit"
                  ? "Orbital"
                  : "Settlement";

              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => setSelectedLocationId(location.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {location.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                    {layerLabel}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-chart-2 uppercase tracking-widest mt-1">
                      Current position
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-primary/20 bg-black">
              <img
                src={getLocationImage(selectedLocation.imageKey)}
                alt={`${selectedLocation.name} survey map`}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm text-primary font-bold uppercase tracking-widest">
                  {selectedLocation.name}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  {selectedLocation.systemName}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Tactical survey map for {selectedLocation.name}. Travel from the
              Location panel to reach charted orbital zones and settlements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
