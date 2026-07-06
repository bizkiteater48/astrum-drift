import { useCallback, useEffect, useState } from "react";
import {
  Flag,
  History,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  X,
} from "lucide-react";
import { getChatHistoryUrl } from "@/lib/chat";
import {
  getInboxMessages,
  markInboxMessageRead,
  type InboxMessage,
} from "@/lib/inbox-api";
import { PlayerUsernameSelect } from "@/components/player-username-select";

export type MessagesPanelView =
  | "menu"
  | "compose"
  | "historical"
  | "report";

type MessagesPanelProps = {
  onClose: () => void;
  onReportPlayer: () => void;
  onInboxRead?: () => void;
  onUnreadCountChange?: (count: number) => void;
  inboxUnreadCount?: number;
  selfUsername?: string;
};

function formatInboxTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessagesPanel({
  onClose,
  onReportPlayer,
  onInboxRead,
  onUnreadCountChange,
  inboxUnreadCount = 0,
  selfUsername,
}: MessagesPanelProps) {
  const [view, setView] = useState<MessagesPanelView>("menu");
  const [recipient, setRecipient] = useState("");
  const [draft, setDraft] = useState("");
  const [composeNotice, setComposeNotice] = useState<string | null>(null);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(
    null,
  );

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    setInboxError(null);
    try {
      const result = await getInboxMessages();
      setInboxMessages(result.messages);
      const unread = result.messages.filter((message) => !message.readAt).length;
      onUnreadCountChange?.(unread);
    } catch {
      setInboxError("Could not load inbox messages.");
    } finally {
      setInboxLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (view !== "historical") return;
    void loadInbox();
  }, [view, loadInbox]);

  const handleBack = () => {
    setView("menu");
    setComposeNotice(null);
    setSelectedMessageId(null);
  };

  const handleComposeSubmit = () => {
    const trimmedRecipient = recipient.trim();
    const trimmedDraft = draft.trim();
    if (!trimmedRecipient || !trimmedDraft) {
      setComposeNotice("Enter a player username and message.");
      return;
    }

    setComposeNotice(
      "Private messaging is coming soon. Use Global or Help chat to reach other pilots for now.",
    );
  };

  const handleOpenChatHistory = () => {
    window.open(getChatHistoryUrl(), "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleSelectInboxMessage = async (message: InboxMessage) => {
    setSelectedMessageId(message.id);
    if (!message.readAt) {
      try {
        await markInboxMessageRead(message.id);
        setInboxMessages((current) => {
          const next = current.map((entry) =>
            entry.id === message.id
              ? { ...entry, readAt: new Date().toISOString() }
              : entry,
          );
          onUnreadCountChange?.(next.filter((entry) => !entry.readAt).length);
          return next;
        });
        onInboxRead?.();
      } catch {
        // Keep message visible even if mark-read fails.
      }
    }
  };

  const selectedMessage =
    inboxMessages.find((message) => message.id === selectedMessageId) ?? null;

  const menuItems = [
    {
      id: "compose" as const,
      label: "Message a Player",
      description: "Send a private message to another pilot",
      Icon: Mail,
      onSelect: () => {
        setView("compose");
        setComposeNotice(null);
      },
    },
    {
      id: "historical" as const,
      label: "Inbox",
      description: "System messages from Admin and Moderation Team",
      Icon: Inbox,
      onSelect: () => {
        setView("historical");
        setComposeNotice(null);
        setSelectedMessageId(null);
      },
    },
    {
      id: "chat-history" as const,
      label: "Chat History",
      description: "Open last 24 hours of channel chat in a new tab",
      Icon: History,
      onSelect: handleOpenChatHistory,
    },
    {
      id: "report" as const,
      label: "Report a Player",
      description: "Submit a report to staff moderators",
      Icon: Flag,
      onSelect: () => {
        onReportPlayer();
        onClose();
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {view !== "menu" && (
              <button
                type="button"
                onClick={handleBack}
                className="text-[10px] text-primary/70 uppercase tracking-widest hover:text-primary shrink-0"
              >
                Back
              </button>
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Utility
              </p>
              <h2 className="text-lg text-primary font-bold uppercase tracking-widest truncate">
                {view === "menu" && "Messages"}
                {view === "compose" && "Message a Player"}
                {view === "historical" && "Inbox"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded border border-primary/20 text-primary hover:bg-primary/10 shrink-0"
            aria-label="Close messages panel"
          >
            <X className="size-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {view === "menu" && (
            <div className="space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  className="w-full text-left rounded-lg border border-primary/20 bg-background/40 px-3 py-3 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <item.Icon className="size-4 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        {item.label}
                        {item.id === "historical" && inboxUnreadCount > 0 && (
                          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chart-2 px-1 text-[9px] font-bold text-background">
                            {inboxUnreadCount > 9 ? "9+" : inboxUnreadCount}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {view === "compose" && (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Player Username
                </span>
                <PlayerUsernameSelect
                  value={recipient}
                  onChange={setRecipient}
                  selfUsername={selfUsername}
                  placeholder="Pilot username"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Message
                </span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Type your message…"
                  className="w-full bg-background/60 border border-primary/20 rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none"
                />
              </label>
              {composeNotice && (
                <p className="text-[10px] text-primary/80 uppercase tracking-widest">
                  {composeNotice}
                </p>
              )}
              <button
                type="button"
                onClick={handleComposeSubmit}
                className="w-full h-9 rounded border border-primary/30 text-primary text-xs uppercase tracking-widest hover:bg-primary/10"
              >
                Send Message
              </button>
            </div>
          )}

          {view === "historical" && (
            <div className="space-y-3">
              {inboxLoading && (
                <div className="flex items-center justify-center py-8 text-primary/70">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              )}

              {!inboxLoading && inboxError && (
                <p className="text-[10px] text-destructive uppercase tracking-widest text-center py-6">
                  {inboxError}
                </p>
              )}

              {!inboxLoading && !inboxError && inboxMessages.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <MessageSquare className="size-8 text-primary/40 mx-auto" />
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    No inbox messages yet.
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 uppercase tracking-widest px-4">
                    Admin grants and moderation notices will appear here.
                  </p>
                </div>
              )}

              {!inboxLoading && !inboxError && inboxMessages.length > 0 && (
                <div className="space-y-2">
                  {!selectedMessage && (
                    <>
                      {inboxMessages.map((message) => (
                        <button
                          key={message.id}
                          type="button"
                          onClick={() => void handleSelectInboxMessage(message)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                            message.readAt
                              ? "border-primary/10 bg-background/30"
                              : "border-primary/30 bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] text-primary/70 uppercase tracking-widest">
                                {message.senderLabel}
                              </p>
                              <p className="text-xs text-primary font-bold truncate">
                                {message.subject}
                              </p>
                            </div>
                            <span className="text-[9px] text-muted-foreground shrink-0">
                              {formatInboxTime(message.createdAt)}
                            </span>
                          </div>
                          {!message.readAt && (
                            <p className="text-[9px] text-chart-2 uppercase tracking-widest mt-1">
                              Unread
                            </p>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {selectedMessage && (
                    <div className="rounded-lg border border-primary/20 bg-background/40 p-3 space-y-2">
                      <div>
                        <p className="text-[10px] text-primary/70 uppercase tracking-widest">
                          From: {selectedMessage.senderLabel}
                        </p>
                        <p className="text-sm text-primary font-bold">
                          {selectedMessage.subject}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {formatInboxTime(selectedMessage.createdAt)}
                        </p>
                      </div>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
                        {selectedMessage.body}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedMessageId(null)}
                        className="text-[10px] text-primary/70 uppercase tracking-widest hover:text-primary"
                      >
                        Back to list
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
