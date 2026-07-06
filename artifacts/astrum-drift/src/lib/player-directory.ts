import { searchPlayers, type PlayerSearchResult } from "@/lib/players-api";

/** How often the shared pilot list refreshes in the background. */
export const PLAYER_DIRECTORY_REFRESH_MS = 30_000;

/** Max pilots loaded into the shared background directory cache. */
export const PLAYER_DIRECTORY_FETCH_LIMIT = 100;

type DirectorySnapshot = {
  players: PlayerSearchResult[];
  loaded: boolean;
  error: string | null;
};

let snapshot: DirectorySnapshot = {
  players: [],
  loaded: false,
  error: null,
};

let refreshPromise: Promise<void> | null = null;
let refreshTimer: number | null = null;
let subscriberCount = 0;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

async function refreshPlayerDirectory(options?: { silent?: boolean }) {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await searchPlayers({
        query: "",
        limit: PLAYER_DIRECTORY_FETCH_LIMIT,
        excludeSelf: false,
      });
      snapshot = {
        players: response.players,
        loaded: true,
        error: null,
      };
    } catch {
      if (!options?.silent || !snapshot.loaded) {
        snapshot = {
          ...snapshot,
          loaded: true,
          error: "Could not load pilots.",
        };
      }
    } finally {
      notifyListeners();
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function startBackgroundRefresh() {
  if (refreshTimer != null) {
    return;
  }

  void refreshPlayerDirectory();
  refreshTimer = window.setInterval(() => {
    void refreshPlayerDirectory({ silent: true });
  }, PLAYER_DIRECTORY_REFRESH_MS);
}

function stopBackgroundRefresh() {
  if (refreshTimer != null) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export function subscribePlayerDirectory(listener: () => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    startBackgroundRefresh();
  }

  return () => {
    listeners.delete(listener);
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0) {
      stopBackgroundRefresh();
    }
  };
}

export function getPlayerDirectorySnapshot(): DirectorySnapshot {
  return snapshot;
}

export function filterPlayerDirectory(
  players: PlayerSearchResult[],
  options: {
    query?: string;
    excludeSelf?: boolean;
    selfUsername?: string;
    limit?: number;
  },
): PlayerSearchResult[] {
  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";
  const selfUsername = options.selfUsername?.trim().toLowerCase();

  let filtered = players;
  if (options.excludeSelf && selfUsername) {
    filtered = filtered.filter(
      (player) => player.username.toLowerCase() !== selfUsername,
    );
  }
  if (normalizedQuery) {
    filtered = filtered.filter((player) =>
      player.username.toLowerCase().includes(normalizedQuery),
    );
  }

  if (options.limit != null) {
    return filtered.slice(0, options.limit);
  }

  return filtered;
}
