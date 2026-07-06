import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Loader2 } from "lucide-react";
import {
  filterPlayerDirectory,
  getPlayerDirectorySnapshot,
  subscribePlayerDirectory,
} from "@/lib/player-directory";
import type { PlayerSearchResult } from "@/lib/players-api";
import { cn } from "@/lib/utils";

type PlayerUsernameSelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeSelf?: boolean;
  selfUsername?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  onSelect?: (player: PlayerSearchResult) => void;
};

export function PlayerUsernameSelect({
  value,
  onChange,
  placeholder = "Search pilot username…",
  disabled = false,
  excludeSelf = true,
  selfUsername,
  className,
  inputClassName,
  id,
  onSelect,
}: PlayerUsernameSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const directory = useSyncExternalStore(
    subscribePlayerDirectory,
    getPlayerDirectorySnapshot,
    getPlayerDirectorySnapshot,
  );

  const results = useMemo(
    () =>
      filterPlayerDirectory(directory.players, {
        query: value,
        excludeSelf,
        selfUsername,
      }),
    [directory.players, excludeSelf, selfUsername, value],
  );

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const showDropdown = open && !disabled;
  const isFiltering = value.trim().length > 0;

  const handleSelect = (player: PlayerSearchResult) => {
    onChange(player.username);
    onSelect?.(player);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <input
        id={inputId}
        type="text"
        value={value}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        className={cn(
          "w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none disabled:opacity-40",
          inputClassName,
        )}
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[120] rounded-lg border border-primary/25 bg-background shadow-lg overflow-hidden">
          <p className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-muted-foreground border-b border-primary/10">
            {isFiltering ? "Matching pilots (A–Z)" : "All pilots (A–Z)"}
          </p>
          {!directory.loaded ? (
            <div className="flex items-center justify-center gap-2 px-3 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading pilots…
            </div>
          ) : directory.error ? (
            <p className="px-3 py-3 text-[10px] uppercase tracking-widest text-destructive">
              {directory.error}
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              {isFiltering ? "No pilots found" : "No pilots available"}
            </p>
          ) : (
            <ul className="max-h-44 overflow-y-auto custom-scrollbar py-1">
              {results.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(player)}
                    className="w-full px-3 py-2 text-left text-xs font-mono text-primary hover:bg-primary/10"
                  >
                    {player.username}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
