import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  dismissReport,
  formatMuteDuration,
  getPlayerModerationRecords,
  listPendingReports,
  muteFromReport,
  MUTE_ESCALATION_LABELS,
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
    } catch {
      setRecords([]);
      setMuteCount(0);
    }
  };

  const handleMute = async (report: PlayerReport) => {
    setIsActing(true);
    setError(null);
    try {
      const result = await muteFromReport(report.id);
      await loadReports();
      setSelectedReportId(null);
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

  const nextMuteLabel =
    MUTE_ESCALATION_LABELS[Math.min(muteCount, MUTE_ESCALATION_LABELS.length - 1)];

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
            Escalating mutes: {MUTE_ESCALATION_LABELS.join(" → ")} (repeat offenses)
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
                        Report #{report.id} · {report.reason}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {report.reporterUsername ?? "Unknown"} reported{" "}
                        <span className="text-foreground">{report.reportedUsername}</span>
                      </p>
                      {report.details && (
                        <p className="text-xs text-foreground/80 mt-1">{report.details}</p>
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
                        Prior mutes: {muteCount} · Next mute: {nextMuteLabel}
                      </p>
                      {records.slice(0, 5).map((record) => (
                        <p key={record.id} className="text-[10px] font-mono text-muted-foreground">
                          {record.action} — {record.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isActing}
                      onClick={() => void handleMute(report)}
                      className="h-7 px-3 rounded border border-destructive/40 text-destructive text-[10px] uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Mute ({nextMuteLabel})
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
