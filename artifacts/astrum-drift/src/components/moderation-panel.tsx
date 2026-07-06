import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  BAN_DURATION_PRESETS,
  banFromReport,
  clearChat,
  dismissReport,
  type BanDuration,
  type BannedPlayer,
  type CheatReport,
  type ClearChatChannel,
  formatBanTimeRemaining,
  formatMuteDuration,
  formatMuteDurationLabel,
  formatMuteTimeRemaining,
  getPlayerModerationRecords,
  getSuggestedMuteMinutes,
  listBannedPlayers,
  listCheatReports,
  listMutedPlayers,
  listPendingReports,
  muteFromReport,
  unbanPlayer,
  unmutePlayer,
  MUTE_DURATION_PRESETS,
  REPORT_REASON_LABELS,
  type ModerationRecord,
  type MutedPlayer,
  type PlayerReport,
} from "@/lib/moderation-api";

type ModerationPanelProps = {
  onClose: () => void;
  canUnmute: boolean;
  canClearChat: boolean;
  canBan: boolean;
};

export function ModerationPanel({
  onClose,
  canUnmute,
  canClearChat,
  canBan,
}: ModerationPanelProps) {
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [cheatReports, setCheatReports] = useState<CheatReport[]>([]);
  const [mutedPlayers, setMutedPlayers] = useState<MutedPlayer[]>([]);
  const [bannedPlayers, setBannedPlayers] = useState<BannedPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [muteTargetReportId, setMuteTargetReportId] = useState<number | null>(null);
  const [banTargetReportId, setBanTargetReportId] = useState<number | null>(null);
  const [muteReason, setMuteReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<BanDuration>(10080);
  const [muteDurationMinutes, setMuteDurationMinutes] = useState(
    getSuggestedMuteMinutes(0),
  );
  const [records, setRecords] = useState<ModerationRecord[]>([]);
  const [muteCount, setMuteCount] = useState(0);
  const [isActing, setIsActing] = useState(false);
  const [chatClearChannel, setChatClearChannel] = useState<ClearChatChannel>("global");
  const [, setMuteCountdownTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMuteCountdownTick((tick) => tick + 1);
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const loadPanelData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requests: Promise<unknown>[] = [
        listPendingReports(),
        listMutedPlayers(),
        listCheatReports(),
      ];
      if (canBan) {
        requests.push(listBannedPlayers());
      }
      const results = await Promise.all(requests);
      const reportsData = results[0] as Awaited<ReturnType<typeof listPendingReports>>;
      const mutedData = results[1] as Awaited<ReturnType<typeof listMutedPlayers>>;
      const cheatData = results[2] as Awaited<ReturnType<typeof listCheatReports>>;
      setReports(reportsData.reports);
      setMutedPlayers(mutedData.players);
      setCheatReports(cheatData.reports);
      if (canBan) {
        const bannedData = results[3] as Awaited<ReturnType<typeof listBannedPlayers>>;
        setBannedPlayers(bannedData.players);
      } else {
        setBannedPlayers([]);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to load moderation data",
      );
    } finally {
      setIsLoading(false);
    }
  }, [canBan]);

  useEffect(() => {
    void loadPanelData();
  }, [loadPanelData]);

  const sortedReports = [...reports].sort((left, right) => {
    if (left.reason === "cheating" && right.reason !== "cheating") return -1;
    if (right.reason === "cheating" && left.reason !== "cheating") return 1;
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const loadRecords = async (report: PlayerReport) => {
    setSelectedReportId(report.id);
    setRecords([]);
    try {
      const data = await getPlayerModerationRecords(report.reportedPlayerId);
      setRecords(data.records);
      setMuteCount(data.player.muteCount);
      if (muteTargetReportId === report.id) {
        setMuteDurationMinutes(getSuggestedMuteMinutes(data.player.muteCount));
      }
    } catch {
      setRecords([]);
      setMuteCount(0);
    }
  };

  const openMuteForm = async (report: PlayerReport) => {
    setMuteTargetReportId(report.id);
    setBanTargetReportId(null);
    setMuteReason("");
    setError(null);
    await loadRecords(report);
    try {
      const data = await getPlayerModerationRecords(report.reportedPlayerId);
      setMuteDurationMinutes(getSuggestedMuteMinutes(data.player.muteCount));
    } catch {
      setMuteDurationMinutes(getSuggestedMuteMinutes(0));
    }
  };

  const closeMuteForm = () => {
    setMuteTargetReportId(null);
    setMuteReason("");
  };

  const openBanForm = (report: PlayerReport) => {
    setBanTargetReportId(report.id);
    setBanReason(
      report.reason === "cheating"
        ? "Cheating / exploit use"
        : `Violation: ${REPORT_REASON_LABELS[report.reason] ?? report.reason}`,
    );
    setBanDuration(report.reason === "cheating" ? 10080 : 1440);
    setMuteTargetReportId(null);
    setError(null);
  };

  const closeBanForm = () => {
    setBanTargetReportId(null);
    setBanReason("");
  };

  const handleMute = async (report: PlayerReport) => {
    const trimmedReason = muteReason.trim();
    if (!trimmedReason) {
      setError("Mute reason is required.");
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      const result = await muteFromReport(report.id, {
        reason: trimmedReason,
        durationMinutes: muteDurationMinutes,
      });
      await loadPanelData();
      setSelectedReportId(null);
      closeMuteForm();
      setError(
        `Muted ${report.reportedUsername} for ${formatMuteDuration(result.mute.durationMinutes)} (offense #${result.mute.offenseNumber}).`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to mute player",
      );
    } finally {
      setIsActing(false);
    }
  };

  const handleDismiss = async (report: PlayerReport) => {
    setIsActing(true);
    setError(null);
    try {
      await dismissReport(report.id);
      await loadPanelData();
      setSelectedReportId(null);
      closeMuteForm();
      closeBanForm();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to dismiss report",
      );
    } finally {
      setIsActing(false);
    }
  };

  const handleBan = async (report: PlayerReport) => {
    const trimmedReason = banReason.trim();
    if (!trimmedReason) {
      setError("Ban reason is required.");
      return;
    }

    setIsActing(true);
    setError(null);
    try {
      const result = await banFromReport(report.id, {
        reason: trimmedReason,
        durationMinutes: banDuration,
      });
      await loadPanelData();
      setSelectedReportId(null);
      closeBanForm();
      const durationLabel = result.ban.permanent
        ? "permanent"
        : formatBanTimeRemaining(result.ban.bannedUntil);
      setError(
        `Banned ${report.reportedUsername} (${durationLabel}).`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to ban player",
      );
    } finally {
      setIsActing(false);
    }
  };

  const handleUnban = async (banned: BannedPlayer) => {
    setIsActing(true);
    setError(null);
    try {
      await unbanPlayer(banned.id);
      await loadPanelData();
      setError(`Unbanned ${banned.username}.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to unban player",
      );
    } finally {
      setIsActing(false);
    }
  };

  const handleUnmute = async (muted: MutedPlayer) => {
    setIsActing(true);
    setError(null);
    try {
      await unmutePlayer(muted.id);
      await loadPanelData();
      setError(`Unmuted ${muted.username}.`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to unmute player",
      );
    } finally {
      setIsActing(false);
    }
  };

  const handleClearChat = async () => {
    setIsActing(true);
    setError(null);
    try {
      const result = await clearChat(chatClearChannel);
      setError(
        `Cleared ${result.clearedCount} message${result.clearedCount === 1 ? "" : "s"} from ${result.channel} chat.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to clear chat",
      );
    } finally {
      setIsActing(false);
    }
  };

  const suggestedMuteMinutes = getSuggestedMuteMinutes(muteCount);

  return (
    <div className="fixed inset-0 z-[85] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/20 rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-primary/20 p-4 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-primary" />
            <h2 className="text-lg text-primary font-bold uppercase tracking-widest">
              Staff Moderation
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded border border-primary/20 text-primary hover:bg-primary/10"
            aria-label="Close moderation panel"
          >
            <X className="size-4 mx-auto" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar space-y-6">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Mute durations are chosen per action (5-minute increments). First offense
            defaults to 5 minutes.
          </p>

          {error && (
            <p className="text-xs text-destructive uppercase tracking-widest">{error}</p>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {canClearChat && (
                <section className="space-y-3 border border-destructive/20 rounded-lg p-3">
                  <h3 className="text-xs text-destructive uppercase tracking-widest font-bold">
                    Admin Chat Controls
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Clears visible messages from the selected chat channel.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={chatClearChannel}
                      onChange={(event) =>
                        setChatClearChannel(event.target.value as ClearChatChannel)
                      }
                      className="h-7 rounded border border-primary/20 bg-background/60 px-2 text-xs text-foreground font-mono outline-none"
                    >
                      <option value="global">Global</option>
                      <option value="trade">Trade</option>
                      <option value="help">Help</option>
                      <option value="clan">Clan</option>
                      <option value="staff">Staff</option>
                      <option value="all">All Channels</option>
                    </select>
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => void handleClearChat()}
                      className="h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Clear Chat
                    </button>
                  </div>
                </section>
              )}

              {cheatReports.length > 0 && (
                <section className="space-y-3 border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                  <h3 className="text-xs text-destructive uppercase tracking-widest font-bold">
                    Cheating Reports ({cheatReports.length})
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Pending anti-cheat reports — review history before banning.
                  </p>
                  <div className="space-y-2">
                    {cheatReports.map((report) => (
                      <div
                        key={`cheat-${report.id}`}
                        className="border border-destructive/20 rounded p-2 text-xs"
                      >
                        <p className="font-mono text-destructive">
                          #{report.id} · {report.reportedUsername}
                          {report.reportedPlayerBanned && (
                            <span className="ml-2 text-muted-foreground">(already banned)</span>
                          )}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {report.reporterUsername ?? "Unknown"} — {report.details ?? "No details"}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-xs text-primary uppercase tracking-widest font-bold">
                  Pending Player Reports
                </h3>
                {sortedReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    No pending player reports.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sortedReports.map((report) => (
                      <div
                        key={report.id}
                        className={`border rounded-lg p-3 space-y-2 ${
                          report.reason === "cheating"
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-primary/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-mono text-primary">
                              Report #{report.id} ·{" "}
                              {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {report.reporterUsername ?? "Unknown"} reported{" "}
                              <span className="text-foreground">
                                {report.reportedUsername}
                              </span>
                            </p>
                            {report.details && (
                              <p className="text-xs text-foreground/80 mt-1 italic">
                                Player note: {report.details}
                              </p>
                            )}
                            {report.messageId && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Message #{report.messageId}
                                {report.channel ? ` · ${report.channel}` : ""}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void loadRecords(report)}
                            className="text-[10px] uppercase tracking-widest text-primary/70 hover:text-primary"
                          >
                            View history
                          </button>
                        </div>

                        {selectedReportId === report.id && (
                          <div className="border-t border-primary/10 pt-2 space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Prior mutes: {muteCount} · Suggested duration:{" "}
                              {formatMuteDurationLabel(suggestedMuteMinutes)}
                            </p>
                            {records.slice(0, 5).map((record) => (
                              <p
                                key={record.id}
                                className="text-[10px] font-mono text-muted-foreground"
                              >
                                {record.action} — {record.reason}
                              </p>
                            ))}
                          </div>
                        )}

                        {muteTargetReportId === report.id ? (
                          <div className="border-t border-primary/10 pt-2 space-y-2">
                            <label className="block space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                Mute reason (shown to player)
                              </span>
                              <textarea
                                value={muteReason}
                                onChange={(event) => setMuteReason(event.target.value)}
                                rows={2}
                                maxLength={500}
                                placeholder="Explain why this player is being muted…"
                                className="w-full rounded border border-primary/20 bg-background/60 px-2 py-1 text-xs text-foreground font-mono outline-none resize-none"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                Duration
                              </span>
                              <select
                                value={muteDurationMinutes}
                                onChange={(event) =>
                                  setMuteDurationMinutes(Number(event.target.value))
                                }
                                className="w-full h-7 rounded border border-primary/20 bg-background/60 px-2 text-xs text-foreground font-mono outline-none"
                              >
                                {MUTE_DURATION_PRESETS.map((minutes) => (
                                  <option key={minutes} value={minutes}>
                                    {formatMuteDurationLabel(minutes)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => void handleMute(report)}
                                className="h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                              >
                                Confirm mute
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={closeMuteForm}
                                className="h-7 px-3 rounded border border-primary/20 text-primary/70 text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : banTargetReportId === report.id ? (
                          <div className="border-t border-destructive/20 pt-2 space-y-2">
                            <label className="block space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                Ban reason (shown to player)
                              </span>
                              <textarea
                                value={banReason}
                                onChange={(event) => setBanReason(event.target.value)}
                                rows={2}
                                maxLength={500}
                                placeholder="Explain why this account is being banned…"
                                className="w-full rounded border border-destructive/30 bg-background/60 px-2 py-1 text-xs text-foreground font-mono outline-none resize-none"
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                Ban duration
                              </span>
                              <select
                                value={banDuration}
                                onChange={(event) =>
                                  setBanDuration(event.target.value as BanDuration)
                                }
                                className="w-full h-7 rounded border border-destructive/30 bg-background/60 px-2 text-xs text-foreground font-mono outline-none"
                              >
                                {BAN_DURATION_PRESETS.map((preset) => (
                                  <option key={String(preset.value)} value={preset.value}>
                                    {preset.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => void handleBan(report)}
                                className="h-7 px-3 rounded border border-destructive text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                              >
                                Confirm ban
                              </button>
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={closeBanForm}
                                className="h-7 px-3 rounded border border-primary/20 text-primary/70 text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void openMuteForm(report)}
                              className="h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                            >
                              Mute
                            </button>
                            {canBan && (
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => openBanForm(report)}
                                className="h-7 px-3 rounded border border-destructive text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/15 disabled:opacity-50"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => void handleDismiss(report)}
                              className="h-7 px-3 rounded border border-primary/20 text-primary/70 text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3 border-t border-primary/10 pt-4">
                <h3 className="text-xs text-destructive uppercase tracking-widest font-bold">
                  Currently Muted
                </h3>
                {mutedPlayers.length === 0 ? (
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    No players are currently muted.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mutedPlayers.map((muted) => (
                      <div
                        key={muted.id}
                        className="border border-destructive/20 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <p className="text-xs font-mono text-foreground">
                            {muted.username}
                            {muted.role !== "player" && (
                              <span className="text-muted-foreground ml-2 uppercase">
                                ({muted.role})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-destructive mt-1 uppercase tracking-widest">
                            {formatMuteTimeRemaining(muted.mutedUntil)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Until {new Date(muted.mutedUntil).toLocaleString()}
                          </p>
                        </div>
                        {canUnmute && (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => void handleUnmute(muted)}
                            className="h-7 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                          >
                            Unmute
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!canUnmute && mutedPlayers.length > 0 && (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Only admins can unmute players.
                  </p>
                )}
              </section>

              {canBan && (
                <section className="space-y-3 border-t border-destructive/20 pt-4">
                  <h3 className="text-xs text-destructive uppercase tracking-widest font-bold">
                    Banned Accounts
                  </h3>
                  {bannedPlayers.length === 0 ? (
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">
                      No active bans.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {bannedPlayers.map((banned) => (
                        <div
                          key={banned.id}
                          className="border border-destructive/30 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-xs font-mono text-foreground">
                              {banned.username}
                              {banned.role !== "player" && (
                                <span className="text-muted-foreground ml-2 uppercase">
                                  ({banned.role})
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-destructive mt-1 uppercase tracking-widest">
                              {formatBanTimeRemaining(banned.bannedUntil, banned.permanent)}
                            </p>
                            {banned.banReason && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Reason: {banned.banReason}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => void handleUnban(banned)}
                            className="h-7 px-3 rounded border border-primary/30 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                          >
                            Unban
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
