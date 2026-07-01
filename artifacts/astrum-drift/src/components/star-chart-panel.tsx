import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import {
  formatMarketTaxRate,
  getMainGameLocation,
  getMarketTaxRate,
  getStarChartContextForLocation,
  getStarChartPlanetDetail,
  getStarChartSystemDetail,
  isMarketLocation,
  listStarChartSystems,
  type MainGameImageKey,
  type MainGameLocationId,
  type MainGamePlanetId,
  type MainGameSystemId,
} from "@/lib/main-game";

type StarChartPanelProps = {
  currentLocationId: MainGameLocationId;
  getLocationImage: (imageKey: MainGameImageKey) => string;
  onClose: () => void;
};

type StarChartView =
  | { level: "systems" }
  | { level: "system"; systemId: MainGameSystemId }
  | { level: "planet"; planetId: MainGamePlanetId };

function NavButton({
  title,
  subtitle,
  meta,
  isHighlighted,
  onClick,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  isHighlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
        isHighlighted
          ? "border-chart-2/40 bg-chart-2/10 text-chart-2"
          : "border-primary/15 bg-background/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest">{title}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
          {subtitle}
        </p>
      )}
      {meta && (
        <p className="text-[10px] text-primary/80 uppercase tracking-widest mt-1">
          {meta}
        </p>
      )}
    </button>
  );
}

export function StarChartPanel({
  currentLocationId,
  getLocationImage,
  onClose,
}: StarChartPanelProps) {
  const currentContext = getStarChartContextForLocation(currentLocationId);
  const [view, setView] = useState<StarChartView>({ level: "systems" });

  const systems = listStarChartSystems();

  const goBack = () => {
    if (view.level === "planet") {
      const planetDetail = getStarChartPlanetDetail(view.planetId);
      const orbit = getMainGameLocation(planetDetail.planet.orbitLocationId);
      setView({ level: "system", systemId: orbit.systemId });
      return;
    }
    setView({ level: "systems" });
  };

  const headerSubtitle =
    view.level === "systems"
      ? "Solar systems · survey navigation"
      : view.level === "system"
        ? `${getStarChartSystemDetail(view.systemId).system.name} · orbital chart`
        : `${getStarChartPlanetDetail(view.planetId).planet.name} · settlements`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/20 p-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Survey Archive
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {view.level !== "systems" && (
                <button
                  type="button"
                  onClick={goBack}
                  className="h-7 w-7 shrink-0 rounded border border-primary/30 text-primary hover:bg-primary/10 flex items-center justify-center"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <h2 className="text-xl text-primary font-bold uppercase tracking-widest truncate">
                Star Chart
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              {headerSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10 shrink-0"
          >
            Close
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar min-h-0">
          {view.level === "systems" && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Charted Systems
              </p>
              {systems.map((system) => (
                <NavButton
                  key={system.id}
                  title={system.name}
                  subtitle={system.description}
                  meta={`${system.planetCount} planets`}
                  isHighlighted={currentContext.systemId === system.id}
                  onClick={() =>
                    setView({ level: "system", systemId: system.id })
                  }
                />
              ))}
            </div>
          )}

          {view.level === "system" && (
            <SystemView
              systemId={view.systemId}
              currentLocationId={currentLocationId}
              currentContext={currentContext}
              getLocationImage={getLocationImage}
              onSelectPlanet={(planetId) =>
                setView({ level: "planet", planetId })
              }
            />
          )}

          {view.level === "planet" && (
            <PlanetView
              planetId={view.planetId}
              currentLocationId={currentLocationId}
              getLocationImage={getLocationImage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SystemView({
  systemId,
  currentLocationId,
  currentContext,
  getLocationImage,
  onSelectPlanet,
}: {
  systemId: MainGameSystemId;
  currentLocationId: MainGameLocationId;
  currentContext: ReturnType<typeof getStarChartContextForLocation>;
  getLocationImage: (imageKey: MainGameImageKey) => string;
  onSelectPlanet: (planetId: MainGamePlanetId) => void;
}) {
  const { system, spaceport, planets } = getStarChartSystemDetail(systemId);
  const isAtSpaceport = currentLocationId === spaceport.id;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Orbital Hub
        </p>
        <div className="rounded-lg border border-primary/20 overflow-hidden bg-black/40">
          <div className="relative aspect-[21/9] w-full">
            <img
              src={getLocationImage(spaceport.imageKey)}
              alt={`${spaceport.name} survey map`}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-sm text-primary font-bold uppercase tracking-widest">
                {spaceport.name}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                Spaceport · P2P Tax{" "}
                {formatMarketTaxRate(getMarketTaxRate(spaceport))}
              </p>
              {isAtSpaceport && (
                <p className="text-[10px] text-chart-2 uppercase tracking-widest mt-1">
                  Current position
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Planets · {system.name}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {planets.map((planet) => {
            const settlementCount = getStarChartPlanetDetail(
              planet.id,
            ).settlements.length;
            const isCurrentPlanet = currentContext.planetId === planet.id;

            return (
              <NavButton
                key={planet.id}
                title={planet.name}
                subtitle={planet.subtitle}
                meta={`${settlementCount} settlements`}
                isHighlighted={isCurrentPlanet}
                onClick={() => onSelectPlanet(planet.id)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlanetView({
  planetId,
  currentLocationId,
  getLocationImage,
}: {
  planetId: MainGamePlanetId;
  currentLocationId: MainGameLocationId;
  getLocationImage: (imageKey: MainGameImageKey) => string;
}) {
  const { planet, settlements } = getStarChartPlanetDetail(planetId);
  const orbit = getMainGameLocation(planet.orbitLocationId);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-primary/20 bg-black">
        <img
          src={getLocationImage(orbit.imageKey)}
          alt={`${planet.name} orbital survey`}
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm text-primary font-bold uppercase tracking-widest">
            {planet.name}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
            {planet.subtitle}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Surface Settlements
        </p>
        <div className="space-y-3">
          {settlements.map(({ location, actions }) => {
            const isCurrent = location.id === currentLocationId;
            const marketNote =
              isMarketLocation(location) && location.isMainSettlement
                ? `P2P Trade Hub · Tax ${formatMarketTaxRate(getMarketTaxRate(location))}`
                : undefined;

            return (
              <div
                key={location.id}
                className={`rounded-lg border p-3 ${
                  isCurrent
                    ? "border-chart-2/40 bg-chart-2/5"
                    : "border-primary/15 bg-background/40"
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-20 h-14 shrink-0 rounded overflow-hidden border border-primary/20 bg-black">
                    <img
                      src={getLocationImage(location.imageKey)}
                      alt={location.name}
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      {location.name}
                    </p>
                    {marketNote && (
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                        {marketNote}
                      </p>
                    )}
                    {isCurrent && (
                      <p className="text-[10px] text-chart-2 uppercase tracking-widest mt-1">
                        Current position
                      </p>
                    )}
                  </div>
                </div>

                {actions.length > 0 ? (
                  <div className="mt-3 rounded border border-primary/10 bg-background/30 p-2 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Field Actions
                    </p>
                    {actions.map((action) => (
                      <div
                        key={action.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
                      >
                        <p className="text-xs text-chart-2 uppercase tracking-widest">
                          {action.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {action.skill} · {action.timerSec}s
                          {action.requiredHandItem
                            ? ` · ${action.requiredHandItem}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                    {location.isMainSettlement
                      ? "Trade hub — no field actions"
                      : "No field actions charted"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
