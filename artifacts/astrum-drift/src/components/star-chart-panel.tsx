import { Button } from "@/components/ui/button";
import {
  getMainGameLocation,
  type MainGameLocationId,
  type MainGameTravelLink,
} from "@/lib/main-game";

type StarChartPanelProps = {
  currentLocationId: MainGameLocationId;
  isTraveling: boolean;
  onTravel: (destination: MainGameTravelLink) => void;
  onClose: () => void;
};

export function StarChartPanel({
  currentLocationId,
  isTraveling,
  onTravel,
  onClose,
}: StarChartPanelProps) {
  const currentLocation = getMainGameLocation(currentLocationId);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/20 p-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Navigation
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              Star Chart
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Current: {currentLocation.name}
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

        <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Verdant Rim · Tier 1 destinations
          </p>

          {currentLocation.travelDestinations.map((destination) => (
            <div
              key={destination.locationId}
              className="rounded-lg border border-primary/15 bg-background/40 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-widest">
                  {destination.label}
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  Travel time: {destination.timerSec}s
                </p>
              </div>

              <Button
                variant="outline"
                disabled={
                  isTraveling || destination.locationId === currentLocationId
                }
                onClick={() => onTravel(destination)}
                className="font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
              >
                {destination.locationId === currentLocationId
                  ? "You are here"
                  : "Engage Drive"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
