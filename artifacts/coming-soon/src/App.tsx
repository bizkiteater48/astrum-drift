import { Rocket } from "lucide-react";
import astrumLogo from "./assets/astrum-logo.png";

const buttonClass = [
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full",
  "min-h-10 px-8 text-sm font-medium",
  "bg-primary text-primary-foreground border border-primary-border",
  "font-mono uppercase tracking-widest",
  "transition-[color,background-color,box-shadow,filter,transform] duration-200 ease-out",
  "hover:brightness-110 hover:-translate-y-px hover:scale-[1.01] active:translate-y-0 active:scale-100",
  "hover:shadow-[0_0_18px_2px_hsl(var(--primary)/0.55),0_0_36px_4px_hsl(var(--primary)/0.25)]",
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
].join(" ");

export default function App() {
  return (
    <div className="min-h-[100dvh] nebula-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="nebula-stars" />

      <main className="w-full max-w-xl z-10 space-y-8">
        <div className="text-center space-y-3">
          <h1
            role="img"
            aria-label="Astrum Drift"
            className="mx-auto w-40 md:w-52 aspect-[419/304] bg-primary [filter:drop-shadow(0_0_12px_hsl(var(--primary)/0.55))_drop-shadow(0_0_24px_hsl(var(--primary)/0.35))_drop-shadow(0_0_32px_hsl(280_70%_55%/0.3))]"
            style={{
              maskImage: `url(${astrumLogo})`,
              WebkitMaskImage: `url(${astrumLogo})`,
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
          <p className="text-base md:text-lg italic text-[hsl(280_85%_75%)] [text-shadow:0_0_10px_hsl(280_85%_60%/0.55)]">
            A New Dawn Among the Stars
          </p>
        </div>

        <section className="glass-panel rounded-lg p-8 md:p-10 text-center space-y-6">
          <div className="space-y-3">
            <p className="font-mono uppercase tracking-[0.4em] text-xs text-primary/70">
              // Transmission Incoming
            </p>
            <h2 className="text-3xl md:text-4xl font-bold uppercase tracking-[0.18em] text-primary text-glow font-mono">
              Launching Soon
            </h2>
            <p className="text-base md:text-lg text-foreground/85 leading-relaxed max-w-md mx-auto">
              The terminal is warming up. Stand by, Commander — the stars are
              aligning for first contact.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 pt-2">
            <a
              href="/game/"
              className={buttonClass}
              data-testid="button-play-tester-build"
            >
              <Rocket className="h-4 w-4" />
              Play Tester Build
            </a>
          </div>
        </section>
      </main>

      <footer className="absolute bottom-0 inset-x-0 z-10 p-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.3em] text-foreground/40">
        © {new Date().getFullYear()} Astrum Drift. All rights reserved.
      </footer>
    </div>
  );
}
