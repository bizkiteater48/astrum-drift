import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  dismissReport,
  formatMuteDuration,
  formatMuteDurationLabel,
  getPlayerModerationRecords,
  getSuggestedMuteMinutes,
  listPendingReports,
  muteFromReport,
  MUTE_DURATION_PRESETS,
  REPORT_REASON_LABELS,
  type ModerationRecord,
  type PlayerReport,
} from "@/lib/moderation-api";

type ModerationPanelProps = {
  onClose: () => void;
};

export function ModerationPanel({ onClose }: ModerationPanelProps) {
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [muteTargetReportId, setMuteTargetReportId] = useState<number | null>(null);
  const [muteReason, setMuteReason] = useState("");
  const [muteDurationMinutes, setMuteDurationMinutes] = useState(
    getSuggestedMuteMinutes(0),
  );
  const [records, setRecords] = useState<ModerationRecord[]>([]);
  const [muteCount, setMuteCount] = useState(0);
  const [isActing, setIsActing] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPendingReports();
      setReports(data.reports);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to load reports",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

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
      await loadReports();
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
      await loadReports();
      setSelectedReportId(null);
      closeMuteForm();
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

        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
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
          ) : reports.length === 0 ? (
            <p className="text-xs text-muted-foreground uppercase tracking-widest text-center py-8">
              No pending player reports.
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-primary/20 rounded-lg p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-primary">
                        Report #{report.id} ·{" "}
                        {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.reporterUsername ?? "Unknown"} reported{" "}
                        <span className="text-foreground">{report.reportedUsername}</span>
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
                        <p key={record.id} className="text-[10px] font-mono text-muted-foreground">
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
                  ) : (
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isActing}
                        onClick={() => void openMuteForm(report)}
                        className="h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Mute
                      </button>
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
        </div>
      </div>
    </div>
  );
}
