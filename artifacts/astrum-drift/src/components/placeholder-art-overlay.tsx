import {
  isMainGamePlaceholderImage,
  type MainGameImageKey,
} from "@/lib/main-game";
import { cn } from "@/lib/utils";

type PlaceholderArtOverlayProps = {
  imageKey?: MainGameImageKey;
  /** Use for frames that reuse tutorial art without an image key (e.g. travel). */
  forceShow?: boolean;
  className?: string;
  variant?: "default" | "compact";
};

export function PlaceholderArtOverlay({
  imageKey,
  forceShow = false,
  className,
  variant = "default",
}: PlaceholderArtOverlayProps) {
  const show =
    forceShow || (imageKey ? isMainGamePlaceholderImage(imageKey) : false);
  if (!show) return null;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "absolute top-0.5 right-0.5 z-10 pointer-events-none",
          className,
        )}
        title="Placeholder survey art"
      >
        <span className="flex items-center gap-0.5 rounded border border-amber-400/40 bg-black/70 px-1 py-px">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-[7px] font-bold uppercase tracking-widest text-amber-200">
            Draft
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("absolute inset-0 z-10 pointer-events-none", className)}
    >
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded border border-amber-400/40 bg-black/55 backdrop-blur-sm px-2 py-1">
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-100">
          Draft Survey Art
        </span>
      </div>
    </div>
  );
}

type LocationSurveyImageProps = {
  src: string;
  alt: string;
  imageKey: MainGameImageKey;
  className?: string;
  containerClassName?: string;
  variant?: "default" | "compact";
};

export function LocationSurveyImage({
  src,
  alt,
  imageKey,
  className,
  containerClassName,
  variant = "default",
}: LocationSurveyImageProps) {
  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      <img src={src} alt={alt} className={className} />
      <PlaceholderArtOverlay imageKey={imageKey} variant={variant} />
    </div>
  );
}
