import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  ADMIN_ASSIGNABLE_ROLES,
  formatPlayerRoleLabel,
  getPlayerSupportSnapshot,
  grantToPlayer,
  listAdminGrants,
  updatePlayerRole,
  type AdminAssignableRole,
  type AdminGrantRecord,
  type PlayerSupportSnapshot,
} from "@/lib/admin-api";
import { MATERIAL_INVENTORY_GROUPS } from "@/lib/main-game";
import { MINOR_MED_GEL_ITEM } from "@/lib/npc-economy";
import { PlayerUsernameSelect } from "@/components/player-username-select";

const COMMON_GRANT_ITEMS = [
  ...MATERIAL_INVENTORY_GROUPS.Ores,
  ...MATERIAL_INVENTORY_GROUPS.Bars,
  ...MATERIAL_INVENTORY_GROUPS.Harvest,
  ...MATERIAL_INVENTORY_GROUPS.Salvage,
  MINOR_MED_GEL_ITEM,
  "Training Blade",
  "Basic Mining Tool",
  "Basic Harvesting Tool",
  "Basic Salvage Tool",
  "Basic Repair Kit",
  "Basic Weapon",
  "Iron Ore",
  "Refined Iron",
];

type PlayerSupportPanelProps = {
  onClose: () => void;
  onNotice: (message: string) => void;
  onGrantApplied?: () => void;
  selfUsername?: string | null;
};

export function PlayerSupportPanel({
  onClose,
  onNotice,
  onGrantApplied,
  selfUsername,
}: PlayerSupportPanelProps) {
  const [username, setUsername] = useState("");
  const [lookupUsername, setLookupUsername] = useState("");
  const [snapshot, setSnapshot] = useState<PlayerSupportSnapshot | null>(null);
  const [recentGrants, setRecentGrants] = useState<AdminGrantRecord[]>([]);
  const [creditsDelta, setCreditsDelta] = useState("0");
  const [silverCoinsDelta, setSilverCoinsDelta] = useState("0");
  const [grantItem, setGrantItem] = useState(COMMON_GRANT_ITEMS[0] ?? "Copper Ore");
  const [grantItemQty, setGrantItemQty] = useState("1");
  const [pendingItems, setPendingItems] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminAssignableRole>("player");
  const [error, setError] = useState<string | null>(null);

  const itemOptions = useMemo(
    () => [...new Set(COMMON_GRANT_ITEMS)].sort(),
    [],
  );

  const loadRecentGrants = useCallback(async () => {
    try {
      const data = await listAdminGrants(20);
      setRecentGrants(data.grants);
    } catch {
      setRecentGrants([]);
    }
  }, []);

  useEffect(() => {
    void loadRecentGrants();
  }, [loadRecentGrants]);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) {
      return (err.data as { error?: string } | null)?.error ?? err.message;
    }
    return fallback;
  };

  const handleLookup = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Enter a username to look up.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getPlayerSupportSnapshot(trimmed);
      setSnapshot(data);
      setLookupUsername(trimmed);
      setSelectedRole(normalizeAssignableRole(data.player.role));
      setPendingItems({});
    } catch (err) {
      setSnapshot(null);
      setLookupUsername("");
      setError(getErrorMessage(err, "Failed to load player snapshot."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    const quantity = Number(grantItemQty);
    if (!grantItem || !Number.isInteger(quantity) || quantity <= 0) {
      setError("Enter a valid item quantity.");
      return;
    }

    setPendingItems((prev) => ({
      ...prev,
      [grantItem]: (prev[grantItem] ?? 0) + quantity,
    }));
    setError(null);
  };

  const handleRemovePendingItem = (itemName: string) => {
    setPendingItems((prev) => {
      const next = { ...prev };
      delete next[itemName];
      return next;
    });
  };

  const handleGrant = async () => {
    if (!lookupUsername) {
      setError("Look up a player first.");
      return;
    }

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setError("A support note is required for every grant.");
      return;
    }

    const credits = Number(creditsDelta) || 0;
    const coins = Number(silverCoinsDelta) || 0;
    const hasItems = Object.keys(pendingItems).length > 0;

    if (credits === 0 && coins === 0 && !hasItems) {
      setError("Add credits, silver coins, or at least one item.");
      return;
    }

    setIsGranting(true);
    setError(null);
    try {
      const result = await grantToPlayer(lookupUsername, {
        note: trimmedNote,
        creditsDelta: credits,
        silverCoinsDelta: coins,
        items: pendingItems,
      });
      setSnapshot(result.snapshot);
      setPendingItems({});
      setCreditsDelta("0");
      setSilverCoinsDelta("0");
      setNote("");
      onNotice(`Grant applied to ${lookupUsername}.`);
      onGrantApplied?.();
      await loadRecentGrants();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to apply grant."));
    } finally {
      setIsGranting(false);
    }
  };

  const handleRoleChange = async () => {
    if (!lookupUsername || !snapshot) {
      setError("Look up a player first.");
      return;
    }

    if (snapshot.player.role === "admin") {
      setError("Admin roles cannot be changed here.");
      return;
    }

    if (
      selfUsername &&
      lookupUsername.toLowerCase() === selfUsername.toLowerCase()
    ) {
      setError("You cannot change your own role.");
      return;
    }

    if (selectedRole === normalizeAssignableRole(snapshot.player.role)) {
      setError("Select a different role to apply.");
      return;
    }

    setIsUpdatingRole(true);
    setError(null);
    try {
      const result = await updatePlayerRole(lookupUsername, selectedRole);
      setSnapshot(result.snapshot);
      setSelectedRole(normalizeAssignableRole(result.snapshot.player.role));
      onNotice(
        `${lookupUsername} is now ${formatPlayerRoleLabel(selectedRole)}.`,
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update staff role."));
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const inventoryEntries = Object.entries(snapshot?.inventory ?? {})
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Admin
              </p>
              <h2 className="text-lg text-primary font-bold uppercase tracking-widest">
                Player Support
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded border border-primary/20 text-primary hover:bg-primary/10"
            aria-label="Close player support panel"
          >
            <X className="size-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-4">
          <div className="flex gap-2">
            <PlayerUsernameSelect
              className="flex-1"
              value={username}
              onChange={setUsername}
              excludeSelf={false}
              placeholder="Pilot username"
            />
            <button
              type="button"
              onClick={() => void handleLookup()}
              disabled={isLoading}
              className="h-8 px-3 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Look Up"}
            </button>
          </div>

          {snapshot && (
            <div className="rounded-lg border border-primary/20 bg-background/40 p-3 space-y-2">
              <p className="text-xs uppercase tracking-widest text-primary font-bold">
                {snapshot.player.username}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-muted-foreground">Server Credits</span>
                  <p className="text-chart-3 font-bold">
                    {snapshot.player.credits.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Silver Coins</span>
                  <p className="text-chart-3 font-bold">
                    {(snapshot.player.silverCoins ?? 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Staff Role</span>
                  <p className="text-primary font-bold uppercase tracking-widest">
                    {formatPlayerRoleLabel(snapshot.player.role)}
                  </p>
                </div>
              </div>
              {snapshot.creditsDesync && (
                <p className="text-[10px] text-destructive uppercase tracking-widest">
                  Credits desync — inventory shows {snapshot.inventoryCredits.toLocaleString()}
                </p>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                  Inventory
                </p>
                {inventoryEntries.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    No inventory items saved.
                  </p>
                ) : (
                  <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-0.5">
                    {inventoryEntries.map(([itemName, qty]) => (
                      <div
                        key={itemName}
                        className="flex justify-between text-[11px] font-mono"
                      >
                        <span>{itemName}</span>
                        <span className="text-primary">{qty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {snapshot && (
            <div className="space-y-2 border-t border-primary/10 pt-4">
              <h3 className="text-xs uppercase tracking-widest text-primary/80">
                Staff Role
              </h3>
              {snapshot.player.role === "admin" ? (
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Admin accounts cannot be promoted or demoted here.
                </p>
              ) : selfUsername &&
                lookupUsername.toLowerCase() === selfUsername.toLowerCase() ? (
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  You cannot change your own role.
                </p>
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Promote or demote between Player, Moderator, and Guide.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedRole}
                      onChange={(event) =>
                        setSelectedRole(event.target.value as AdminAssignableRole)
                      }
                      className="flex-1 h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs font-mono outline-none"
                    >
                      {ADMIN_ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {formatPlayerRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void handleRoleChange()}
                      disabled={
                        isUpdatingRole ||
                        selectedRole ===
                          normalizeAssignableRole(snapshot.player.role)
                      }
                      className="h-8 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
                    >
                      {isUpdatingRole ? "Saving…" : "Apply Role"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2 border-t border-primary/10 pt-4">
            <h3 className="text-xs uppercase tracking-widest text-primary/80">
              Apply Grant
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Credits (+/-)
                </span>
                <input
                  type="number"
                  value={creditsDelta}
                  onChange={(event) => setCreditsDelta(event.target.value)}
                  className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Silver Coins (+/-)
                </span>
                <input
                  type="number"
                  value={silverCoinsDelta}
                  onChange={(event) => setSilverCoinsDelta(event.target.value)}
                  className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <select
                value={grantItem}
                onChange={(event) => setGrantItem(event.target.value)}
                className="flex-1 h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs font-mono outline-none"
              >
                {itemOptions.map((itemName) => (
                  <option key={itemName} value={itemName}>
                    {itemName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={grantItemQty}
                onChange={(event) => setGrantItemQty(event.target.value)}
                className="w-20 h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="h-8 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10"
              >
                Add
              </button>
            </div>

            {Object.keys(pendingItems).length > 0 && (
              <div className="space-y-1">
                {Object.entries(pendingItems).map(([itemName, qty]) => (
                  <div
                    key={itemName}
                    className="flex items-center justify-between text-[11px] font-mono border border-primary/15 rounded px-2 py-1"
                  >
                    <span>
                      {itemName} x{qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingItem(itemName)}
                      className="text-destructive text-[10px] uppercase tracking-widest"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="block space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Support Note (required)
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Why is this grant being applied?"
                className="w-full bg-background/60 border border-primary/20 rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleGrant()}
              disabled={isGranting || !lookupUsername}
              className="w-full h-9 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10 disabled:opacity-40"
            >
              {isGranting ? "Applying Grant…" : "Apply Grant"}
            </button>
          </div>

          {recentGrants.length > 0 && (
            <div className="space-y-2 border-t border-primary/10 pt-4">
              <h3 className="text-xs uppercase tracking-widest text-primary/80">
                Recent Grants
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {recentGrants.map((grant) => (
                  <div
                    key={grant.id}
                    className="rounded border border-primary/15 bg-background/30 p-2 text-[10px] font-mono"
                  >
                    <p className="text-primary uppercase tracking-widest">
                      #{grant.id} · {grant.targetUsername}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {grant.creditsDelta !== 0 && `Credits ${formatDelta(grant.creditsDelta)} `}
                      {grant.silverCoinsDelta !== 0 &&
                        `Coins ${formatDelta(grant.silverCoinsDelta)} `}
                      {Object.entries(grant.items).map(([item, qty]) => `${item} +${qty} `)}
                    </p>
                    <p className="text-foreground/80 mt-1">{grant.note}</p>
                    <p className="text-muted-foreground/70 mt-1">
                      by {grant.adminUsername} · {new Date(grant.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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

function formatDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function normalizeAssignableRole(role?: string | null): AdminAssignableRole {
  if (role === "mod" || role === "guide") return role;
  return "player";
}
