import { customFetch } from "@workspace/api-client-react";

export type InboxMessage = {
  id: number;
  senderLabel: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function getInboxMessages() {
  return customFetch<{ messages: InboxMessage[] }>("/api/inbox/messages", {
    method: "GET",
  });
}

export function getInboxUnreadCount() {
  return customFetch<{ count: number }>("/api/inbox/unread-count", {
    method: "GET",
  });
}

export function markInboxMessageRead(messageId: number) {
  return customFetch<{ message: InboxMessage }>(
    `/api/inbox/messages/${messageId}/read`,
    { method: "POST" },
  );
}
