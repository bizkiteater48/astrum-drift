import {
  isMainGamePlaceholderImage,
  type MainGameImageKey,
} from "@/lib/main-game";
import { cn } from "@/lib/utils";

type SurveyArtPlaceholderProps = {
  subtitle?: string;
  className?: string;
  variant?: "default" | "compact";
};

export function SurveyArtPlaceholder({
  subtitle,
  className,
  variant = "default",
}: SurveyArtPlaceholderProps) {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-br from-background via-primary/5 to-background text-center",
          className,
        )}
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          TBD
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-background via-primary/10 to-background text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,180,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(120,180,255,0.15) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-25">
        <div className="h-24 w-24 rounded-full border border-primary/30" />
        <div className="absolute h-px w-16 bg-primary/40" />
        <div className="absolute h-16 w-px bg-primary/40" />
      </div>
      <p className="relative z-[1] text-sm font-bold uppercase tracking-[0.25em] text-primary">
        Image Coming Soon
      </p>
      {subtitle && (
        <p className="relative z-[1] max-w-[90%] text-[10px] uppercase tracking-widest text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function shouldUsePlaceholderArt(
  imageKey?: MainGameImageKey,
  forceShow = false,
): boolean {
  return forceShow || (imageKey ? isMainGamePlaceholderImage(imageKey) : false);
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
  const usePlaceholder = shouldUsePlaceholderArt(imageKey);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {usePlaceholder ? (
        <SurveyArtPlaceholder subtitle={alt} variant={variant} />
      ) : (
        <img src={src} alt={alt} className={className} />
      )}
    </div>
  );
}
