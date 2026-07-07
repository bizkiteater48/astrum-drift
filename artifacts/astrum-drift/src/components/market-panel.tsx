import { useState } from "react";
import { Loader2 } from "lucide-react";
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

export type MarketPanelView = "npc" | "player";

type MarketPanelProps = {
  locationId: MainGameLocationId;
  view: MarketPanelView;
  inventory: Record<string, number>;
  getAvailableQuantity: (itemName: string) => number;
  onNpcSell: (itemName: string, quantity: number) => Promise<void>;
  onClose: () => void;
};

function NpcExchangeSection({
  listings,
  onSell,
}: {
  listings: NpcExchangeListing[];
  onSell: (itemName: string, quantity: number) => Promise<void>;
}) {
  const [sellingKey, setSellingKey] = useState<string | null>(null);

  const handleSell = async (itemName: string, quantity: number) => {
    const key = `${itemName}:${quantity}`;
    setSellingKey(key);
    try {
      await onSell(itemName, quantity);
    } finally {
      setSellingKey(null);
    }
  };

  if (listings.length === 0) {
    return (
      <p className="text-xs text-muted-foreground uppercase tracking-widest text-center py-6">
        No vendor-priced materials in inventory
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
      {listings.map((listing) => {
        const sellOneKey = `${listing.itemName}:1`;
        const sellAllKey = `${listing.itemName}:${listing.quantity}`;
        const isSellingOne = sellingKey === sellOneKey;
        const isSellingAll = sellingKey === sellAllKey;
        const isBusy = sellingKey !== null;

        return (
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
              disabled={isBusy}
              onClick={() => void handleSell(listing.itemName, 1)}
              className="flex-1 rounded border border-primary/25 px-2 py-1 text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
            >
              {isSellingOne ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Sell 1
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleSell(listing.itemName, listing.quantity)}
              className="flex-1 rounded border border-chart-2/30 px-2 py-1 text-[10px] uppercase tracking-widest text-chart-2 hover:bg-chart-2/10 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
            >
              {isSellingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              Sell All
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

export function MarketPanel({
  locationId,
  view,
  inventory,
  getAvailableQuantity,
  onNpcSell,
  onClose,
}: MarketPanelProps) {
  const location = getMainGameLocation(locationId);
  const taxRate = getMarketTaxRate(location);
  const canUseNpcExchange = isNpcExchangeLocation(location);
  const npcListings =
    view === "npc" && canUseNpcExchange
      ? listNpcExchangeListings(inventory, getAvailableQuantity)
      : [];
  const credits = inventory.Credits ?? 0;
  const panelTitle =
    view === "npc" ? "NPC Vendor" : "Player Market";
  const panelSubtitle =
    view === "npc"
      ? "Instant sell at vendor buy-floor prices"
      : `${location.systemName} · P2P tax ${formatMarketTaxRate(taxRate)}`;

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">
              {panelTitle}
            </p>
            <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
              {location.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
              Credits: {credits.toLocaleString()}
              {view === "npc" ? "" : ` · ${panelSubtitle}`}
            </p>
            {view === "npc" && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">
                {panelSubtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
          >
            Close
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar">
          {view === "npc" ? (
            <NpcExchangeSection listings={npcListings} onSell={onNpcSell} />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Player listings coming soon. Trades here will be subject to a{" "}
              {formatMarketTaxRate(taxRate)} transaction tax.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
