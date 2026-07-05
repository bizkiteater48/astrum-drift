import { useState } from "react";
import { Flag, X } from "lucide-react";
import { ApiError } from "@workspace/api-client-react";
import {
  REPORT_REASON_LABELS,
  submitPlayerReport,
  type ReportReason,
} from "@/lib/moderation-api";

type ReportPlayerDialogProps = {
  defaultUsername?: string;
  channel?: string;
  messageId?: number;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReportPlayerDialog({
  defaultUsername = "",
  channel,
  messageId,
  onClose,
  onSubmitted,
}: ReportPlayerDialogProps) {
  const [reportedUsername, setReportedUsername] = useState(defaultUsername);
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedUsername = reportedUsername.trim();
    if (!trimmedUsername) {
      setError("Enter the player username to report.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await submitPlayerReport({
        reportedUsername: trimmedUsername,
        reason,
        details: details.trim() || undefined,
        channel,
        messageId,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.data as { error?: string } | null)?.error ?? err.message
          : "Failed to submit report",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-black/70 flex items-center justify-center p-4">
      <div className="glass-panel border border-primary/20 rounded-lg w-full max-w-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-destructive" />
            <h2 className="text-sm text-primary font-bold uppercase tracking-widest">
              Report Player
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded border border-primary/20 text-primary hover:bg-primary/10"
            aria-label="Close report dialog"
          >
            <X className="size-3.5 mx-auto" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Username
            </span>
            <input
              type="text"
              value={reportedUsername}
              onChange={(event) => setReportedUsername(event.target.value)}
              className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Reason
            </span>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-3 text-xs font-mono outline-none"
            >
              {Object.entries(REPORT_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Details (optional)
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-background/60 border border-primary/20 rounded-lg px-3 py-2 text-xs font-mono outline-none resize-none"
            />
          </label>
        </div>

        {error && (
          <p className="text-[10px] text-destructive uppercase tracking-widest">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded border border-primary/20 text-primary/70 text-xs uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void handleSubmit()}
            className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10 disabled:opacity-50"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
