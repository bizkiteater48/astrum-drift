import { customFetch } from "@workspace/api-client-react";

export type PlayerSearchResult = {
  id: number;
  username: string;
};

export type PlayerSearchResponse = {
  players: PlayerSearchResult[];
  mode?: "directory" | "search";
};

export function searchPlayers(params: {
  query: string;
  limit?: number;
  excludeSelf?: boolean;
}) {
  const search = new URLSearchParams();
  search.set("q", params.query);
  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }
  if (params.excludeSelf === false) {
    search.set("excludeSelf", "false");
  }

  return customFetch<PlayerSearchResponse>(
    `/api/players/search?${search.toString()}`,
    { method: "GET" },
  );
}
