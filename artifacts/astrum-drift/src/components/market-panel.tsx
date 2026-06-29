import {
  formatMarketTaxRate,
  getMainGameLocation,
  getMarketTaxRate,
  type MainGameLocationId,
} from "@/lib/main-game";

type MarketPanelProps = {
  locationId: MainGameLocationId;
  onClose: () => void;
};

export function MarketPanel({ locationId, onClose }: MarketPanelProps) {
  const location = getMainGameLocation(locationId);
  const taxRate = getMarketTaxRate(location);

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/20 p-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              Player Market
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              {location.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Trade tax: {formatMarketTaxRate(taxRate)}
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

        <div className="p-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Player market listings coming soon. Listings placed here will be
            subject to a {formatMarketTaxRate(taxRate)} transaction tax.
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            {location.systemName}
          </p>
        </div>
      </div>
    </div>
  );
}
