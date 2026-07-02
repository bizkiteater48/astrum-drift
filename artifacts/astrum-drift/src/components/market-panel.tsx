import {
  formatMarketTaxRate,
  getMainGameLocation,
  getMarketTaxRate,
  isNpcExchangeLocation,
  type MainGameLocationId,
} from "@/lib/main-game";
import {
  listNpcExchangeListings,
  type NpcExchangeListing,
} from "@/lib/npc-economy";

type MarketPanelProps = {
  locationId: MainGameLocationId;
  inventory: Record<string, number>;
  getAvailableQuantity: (itemName: string) => number;
  onNpcSell: (itemName: string, quantity: number) => void;
  onClose: () => void;
};

function NpcExchangeSection({
  listings,
  onSell,
}: {
  listings: NpcExchangeListing[];
  onSell: (itemName: string, quantity: number) => void;
}) {
  if (listings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground uppercase tracking-widest text-center py-6">
        No vendor-priced materials in inventory
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
      {listings.map((listing) => (
        <div
          key={listing.itemName}
          className="rounded-lg border border-primary/15 bg-background/40 px-3 py-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">
                {listing.itemName}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {listing.quantity} × {listing.unitPrice} cr
              </p>
            </div>
            <p className="text-xs text-chart-2 font-bold uppercase tracking-widest shrink-0">
              {listing.lineTotal} cr
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => onSell(listing.itemName, 1)}
              className="flex-1 rounded border border-primary/25 px-2 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10"
            >
              Sell 1
            </button>
            <button
              type="button"
              onClick={() => onSell(listing.itemName, listing.quantity)}
              className="flex-1 rounded border border-chart-2/30 px-2 py-1 text-[10px] uppercase tracking-widest text-chart-2 hover:bg-chart-2/10"
            >
              Sell All
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketPanel({
  locationId,
  inventory,
  getAvailableQuantity,
  onNpcSell,
  onClose,
}: MarketPanelProps) {
  const location = getMainGameLocation(locationId);
  const taxRate = getMarketTaxRate(location);
  const showNpcExchange = isNpcExchangeLocation(location);
  const npcListings = showNpcExchange
    ? listNpcExchangeListings(inventory, getAvailableQuantity)
    : [];
  const credits = inventory.Credits ?? 0;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {showNpcExchange ? "Trade Hub" : "Player Market"}
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              {location.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Credits: {credits.toLocaleString()} · P2P tax{" "}
              {formatMarketTaxRate(taxRate)}
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

        <div className="p-4 space-y-5 overflow-y-auto custom-scrollbar">
          {showNpcExchange && (
            <section className="space-y-2">
              <div>
                <p className="text-xs text-chart-2 font-bold uppercase tracking-widest">
                  NPC Exchange
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  Instant sell at vendor buy-floor prices
                </p>
              </div>
              <NpcExchangeSection listings={npcListings} onSell={onNpcSell} />
            </section>
          )}

          <section className="space-y-2 border-t border-primary/15 pt-4">
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">
                Player Market
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {location.systemName}
              </p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Player listings coming soon. Trades here will be subject to a{" "}
              {formatMarketTaxRate(taxRate)} transaction tax.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
