import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  getGetMeQueryKey,
  useGetChatMessages,
  type ChatChannel,
} from "@workspace/api-client-react";
import { Loader2, TerminalSquare } from "lucide-react";
import {
  CHAT_CHANNELS,
  formatUtcChatTime,
  HISTORY_CHAT_HOURS,
  HISTORY_CHAT_LIMIT,
  type ChatChannelId,
} from "@/lib/chat";

export default function ChatHistoryPage() {
  const [, setLocation] = useLocation();
  const [activeChannel, setActiveChannel] = useState<ChatChannelId>("global");

  const { data: player, isLoading: meLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const {
    data: chatData,
    isLoading: isChatLoading,
    isError: isChatError,
  } = useGetChatMessages(
    activeChannel as ChatChannel,
    { hours: HISTORY_CHAT_HOURS, limit: HISTORY_CHAT_LIMIT },
    {
      query: {
        enabled: Boolean(player?.username),
        refetchInterval: 30_000,
      },
    },
  );

  useEffect(() => {
    if (!meLoading && !player) {
      setLocation("/");
    }
  }, [meLoading, player, setLocation]);

  if (meLoading || !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const messages = chatData?.messages ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="glass-panel border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TerminalSquare className="size-5 text-primary" />
            <h1 className="text-xl font-bold text-primary uppercase tracking-widest">
              Chat History
            </h1>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            Last {HISTORY_CHAT_HOURS} hours · {player.username}
          </p>
        </header>

        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
          {CHAT_CHANNELS.map((channel) => {
            const isActive = activeChannel === channel.id;

            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannel(channel.id)}
                className={`h-8 px-3 rounded border text-xs uppercase tracking-widest whitespace-nowrap shrink-0 ${
                  isActive
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-primary/20 text-primary/60 hover:bg-primary/10"
                }`}
              >
                {channel.label}
              </button>
            );
          })}
        </div>

        <div className="glass-panel border border-primary/20 rounded-lg p-4 min-h-[50vh]">
          {isChatLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : isChatError ? (
            <p className="text-xs text-destructive uppercase tracking-widest">
              Unable to load chat history.
            </p>
          ) : messages.length === 0 ? (
            <p className="text-xs text-muted-foreground uppercase tracking-widest text-center py-12">
              No messages in {activeChannel} chat for the last {HISTORY_CHAT_HOURS}{" "}
              hours.
            </p>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="text-sm font-mono leading-relaxed border-l-2 border-l-primary/30 pl-3 py-0.5"
                >
                  <span className="text-primary/70">
                    [{formatUtcChatTime(message.sentAt)}]
                  </span>{" "}
                  <span className="text-primary font-semibold">{message.author}</span>
                  <span className="text-primary/70 mx-1">·</span>
                  <span className="text-foreground/90">{message.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
