import { customFetch } from "@workspace/api-client-react";

export type ChatIgnore = {
  playerId: number;
  username: string;
};

export function listChatIgnores() {
  return customFetch<{ ignores: ChatIgnore[] }>("/api/players/chat-ignores", {
    method: "GET",
  });
}

export function addChatIgnore(username: string) {
  return customFetch<{ ignore: ChatIgnore }>("/api/players/chat-ignores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
}

export function removeChatIgnore(playerId: number) {
  return customFetch<{ success: boolean }>(
    `/api/players/chat-ignores/${playerId}`,
    { method: "DELETE" },
  );
}

export function canBeChatIgnored(role?: string | null): boolean {
  return role !== "admin" && role !== "mod";
}
