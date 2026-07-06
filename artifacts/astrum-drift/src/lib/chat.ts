export const CHAT_CHANNELS = [
  { id: "global", label: "Global" },
  { id: "trade", label: "Trade" },
  { id: "clan", label: "Clan" },
  { id: "help", label: "Help" },
] as const;

export type ChatChannelId = (typeof CHAT_CHANNELS)[number]["id"];

export const LIVE_CHAT_LIMIT = 100;
export const HISTORY_CHAT_HOURS = 24;
export const HISTORY_CHAT_LIMIT = 500;

export function formatUtcChatTime(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) return "—";

  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function getChatHistoryUrl(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/chat-history`;
}
