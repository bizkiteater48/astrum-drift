import { useState } from "react";
import {
  Flag,
  History,
  Inbox,
  Mail,
  MessageSquare,
  X,
} from "lucide-react";
import { getChatHistoryUrl } from "@/lib/chat";

export type MessagesPanelView =
  | "menu"
  | "compose"
  | "historical"
  | "report";

type MessagesPanelProps = {
  onClose: () => void;
  onReportPlayer: () => void;
};

export function MessagesPanel({ onClose, onReportPlayer }: MessagesPanelProps) {
  const [view, setView] = useState<MessagesPanelView>("menu");
  const [recipient, setRecipient] = useState("");
  const [draft, setDraft] = useState("");
  const [composeNotice, setComposeNotice] = useState<string | null>(null);

  const handleBack = () => {
    setView("menu");
    setComposeNotice(null);
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
      label: "Historical Messages",
      description: "View your private message history",
      Icon: Inbox,
      onSelect: () => {
        setView("historical");
        setComposeNotice(null);
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
                {view === "historical" && "Historical Messages"}
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
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-primary">
                        {item.label}
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
                <input
                  type="text"
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  placeholder="Pilot username"
                  className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
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
            <div className="text-center py-8 space-y-2">
              <MessageSquare className="size-8 text-primary/40 mx-auto" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                No private message history yet.
              </p>
              <p className="text-[10px] text-muted-foreground/80 uppercase tracking-widest px-4">
                Direct messages will appear here once private messaging is enabled.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
