const SUIT_SYMBOLS: Record<string, string> = {
  c: "♣",
  d: "♦",
  h: "♥",
  s: "♠",
};

type PokerCardProps = {
  card: string;
  size?: "md" | "lg";
};

export function PokerCard({ card, size = "lg" }: PokerCardProps) {
  const suit = card[1] ?? "";
  const isRed = suit === "h" || suit === "d";
  const rank = card[0] === "T" ? "10" : card[0];
  const symbol = SUIT_SYMBOLS[suit] ?? suit;

  const sizeClasses =
    size === "lg"
      ? "h-16 w-11 text-lg"
      : "h-12 w-9 text-sm";

  return (
    <span
      className={`inline-flex flex-col items-center justify-center rounded-md border border-slate-300 bg-white font-bold shadow-md ${sizeClasses} ${
        isRed ? "text-red-600" : "text-slate-900"
      }`}
      aria-label={`${rank} of ${suit}`}
    >
      <span className="leading-none">{rank}</span>
      <span className="leading-none text-[0.85em]">{symbol}</span>
    </span>
  );
}

export function PokerCardBack({ size = "lg" }: { size?: "md" | "lg" }) {
  const sizeClasses =
    size === "lg"
      ? "h-16 w-11 text-[10px]"
      : "h-12 w-9 text-[9px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/15 font-bold uppercase tracking-widest text-primary/70 ${sizeClasses}`}
    >
      ??
    </span>
  );
}
