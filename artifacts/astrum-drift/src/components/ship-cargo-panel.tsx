import { useMemo, useState } from "react";
import { Loader2, Package, Rocket, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  getShipCargoStackCount,
  listStoredItemEntries,
  listStorableInventoryEntries,
  STARTER_SHUTTLE_CARGO_SLOT_LIMIT,
  STARTER_SHUTTLE_NAME,
  transferShipCargo,
  type ShipCargoTransferDirection,
} from "@/lib/ship-cargo-api";
import {
  getInventoryStackCount,
  MAIN_GAME_INVENTORY_SLOT_LIMIT,
  type MainGameLocationId,
} from "@/lib/main-game";

type ShipCargoPanelProps = {
  onClose: () => void;
  locationId: MainGameLocationId;
  personalInventory: Record<string, number>;
  shipCargo: Record<string, number>;
  getAvailableQuantity: (itemName: string) => number;
  canAccessCargo: boolean;
  onTransferComplete: (result: {
    tutorialInventory: Record<string, number>;
    shipCargo: Record<string, number>;
    progressVersion: number;
  }) => void;
  onNotice: (message: string) => void;
};

export function ShipCargoPanel({
  onClose,
  locationId,
  personalInventory,
  shipCargo,
  getAvailableQuantity,
  canAccessCargo,
  onTransferComplete,
  onNotice,
}: ShipCargoPanelProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personalEntries = useMemo(
    () => listStorableInventoryEntries(personalInventory, getAvailableQuantity),
    [personalInventory, getAvailableQuantity],
  );

  const cargoEntries = useMemo(
    () => listStoredItemEntries(shipCargo),
    [shipCargo],
  );

  const personalStackCount = getInventoryStackCount(personalInventory);
  const cargoStackCount = getShipCargoStackCount(shipCargo);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      return (err.data as { error?: string } | null)?.error ?? err.message;
    }
    return fallback;
  };

  const handleTransfer = async (direction: ShipCargoTransferDirection) => {
    if (!canAccessCargo) {
      setError("Ship cargo is only available at spaceports and landing sites.");
      return;
    }

    if (!selectedItem) {
      setError("Select an item to transfer.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Enter a valid quantity.");
      return;
    }

    setIsTransferring(true);
    setError(null);

    try {
      const result = await transferShipCargo(
        selectedItem,
        qty,
        direction,
        locationId,
      );
      onTransferComplete(result);
      onNotice(
        direction === "deposit"
          ? `Loaded ${selectedItem} ×${qty} into ship cargo.`
          : `Unloaded ${selectedItem} ×${qty} from ship cargo.`,
      );
      setQuantity("1");
    } catch (err) {
      setError(getErrorMessage(err, "Transfer failed."));
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedAvailable =
    selectedItem !== null
      ? {
          deposit: getAvailableQuantity(selectedItem),
          withdraw: shipCargo[selectedItem] ?? 0,
        }
      : { deposit: 0, withdraw: 0 };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <Rocket className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Active Ship
              </p>
              <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
                Ship Cargo
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded border border-primary/20 text-primary hover:bg-primary/10"
            aria-label="Close ship cargo"
          >
            <X className="size-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
          {!canAccessCargo && (
            <p className="text-[10px] text-destructive uppercase tracking-widest">
              Travel to a spaceport or landing site to load or unload cargo.
            </p>
          )}

          <div className="rounded-lg border border-primary/10 bg-background/40 px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-primary uppercase tracking-widest">
              {STARTER_SHUTTLE_NAME}
            </span>
            <span className="text-chart-3 font-bold font-mono">
              {cargoStackCount} / {STARTER_SHUTTLE_CARGO_SLOT_LIMIT}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <section className="rounded-lg border border-primary/15 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">
                    Personal Inventory
                  </p>
                </div>
                <span className="text-[10px] text-chart-3 font-mono">
                  {personalStackCount} / {MAIN_GAME_INVENTORY_SLOT_LIMIT}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                {personalEntries.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    No storable items available.
                  </p>
                ) : (
                  personalEntries.map(([itemName]) => {
                    const available = getAvailableQuantity(itemName);
                    const isSelected = selectedItem === itemName;
                    return (
                      <button
                        key={itemName}
                        type="button"
                        onClick={() => {
                          setSelectedItem(itemName);
                          setError(null);
                        }}
                        className={`w-full flex items-center justify-between rounded border px-2 py-1 text-[11px] font-mono ${
                          isSelected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-primary/15 hover:bg-primary/5"
                        }`}
                      >
                        <span>{itemName}</span>
                        <span>{available}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-lg border border-primary/15 bg-background/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Rocket className="size-4 text-primary" />
                  <p className="text-xs uppercase tracking-widest text-primary font-bold">
                    Ship Cargo
                  </p>
                </div>
                <span className="text-[10px] text-chart-3 font-mono">
                  {cargoStackCount} / {STARTER_SHUTTLE_CARGO_SLOT_LIMIT}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                {cargoEntries.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Cargo hold: empty
                  </p>
                ) : (
                  cargoEntries.map(([itemName, qty]) => {
                    const isSelected = selectedItem === itemName;
                    return (
                      <button
                        key={itemName}
                        type="button"
                        onClick={() => {
                          setSelectedItem(itemName);
                          setError(null);
                        }}
                        className={`w-full flex items-center justify-between rounded border px-2 py-1 text-[11px] font-mono ${
                          isSelected
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-primary/15 hover:bg-primary/5"
                        }`}
                      >
                        <span>{itemName}</span>
                        <span>{qty}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="rounded-lg border border-primary/10 bg-background/30 p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {selectedItem
                ? `Selected: ${selectedItem}`
                : "Select an item from either list."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-24 h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs font-mono outline-none"
              />
              <button
                type="button"
                disabled={isTransferring || !canAccessCargo || !selectedItem}
                onClick={() => void handleTransfer("deposit")}
                className="h-8 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
              >
                Load
              </button>
              <button
                type="button"
                disabled={isTransferring || !canAccessCargo || !selectedItem}
                onClick={() => void handleTransfer("withdraw")}
                className="h-8 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
              >
                Unload
              </button>
              {isTransferring && (
                <Loader2 className="size-4 animate-spin text-primary" />
              )}
            </div>
            {selectedItem && (
              <p className="text-[10px] text-muted-foreground font-mono">
                Max load: {selectedAvailable.deposit} · Max unload:{" "}
                {selectedAvailable.withdraw}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Credits and silver coins stay on your person. Equipped items cannot be loaded.
            </p>
          </div>

          {error && (
            <p className="text-[10px] text-destructive uppercase tracking-widest">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
