import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  getGetMeQueryKey,
  useLogout,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Power, Terminal, Pickaxe, Battery, MapPin, Award, Zap, Square } from "lucide-react";
import earthOrbitImg from "@/assets/earth-orbit.png";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMiningTimer } from "@/hooks/use-mining-timer";

export default function PlayPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Array<{id: string, text: string, time: string}>>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const { data: player, isLoading: meLoading, error: meError } = useGetMe({ 
    query: { 
      queryKey: getGetMeQueryKey(),
      retry: false,
    } 
  });

  const logoutMutation = useLogout();

  const addMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      text,
      time: new Date().toLocaleTimeString([], { hour12: false })
    }].slice(-50)); // Keep last 50
  };

  const {
    isMining,
    hasInProgressCycle,
    timeLeft,
    handleStart,
    handleStop,
    isBusy,
  } = useMiningTimer(player ?? null, addMessage);

  useEffect(() => {
    if (meError) {
      setLocation("/");
    }
  }, [meError, setLocation]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    if (player && messages.length === 0) {
      addMessage(`[SYSTEM] Authentication successful. Welcome aboard, Commander ${player.username}.`);
      addMessage(`[SYSTEM] Ship systems online. Current location: ${player.currentLocation}.`);
    }
  }, [player, messages.length]);

  if (meLoading) {
    return (
      <div className="min-h-[100dvh] nebula-bg flex flex-col items-center justify-center relative overflow-hidden">
        <div className="nebula-stars" />
        <Loader2 className="h-8 w-8 animate-spin text-primary z-10" />
      </div>
    );
  }

  if (!player) return null;

  const onLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      queryClient.setQueryData(getGetMeQueryKey(), null);
      queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/");
    } catch (e) {
      addMessage("[ERROR] Disconnect failed. Retrying...");
    }
  };


  return (
    <div className="min-h-[100dvh] nebula-bg text-foreground flex flex-col relative font-mono overflow-hidden">
      <div className="nebula-stars" />

      {/* Header */}
      <header className="border-b border-primary/20 glass-panel px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold uppercase tracking-widest text-primary text-glow">Astrum Drift</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-primary/80">
          <span className="hidden md:inline-block tracking-wider uppercase"><span className="text-muted-foreground mr-2">CMDR</span>{player.username}</span>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-destructive/50 text-destructive hover:bg-destructive/20 font-mono uppercase tracking-widest h-8"
            onClick={onLogout}
            disabled={logoutMutation.isPending}
          >
            <Power className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 z-10 overflow-hidden h-[calc(100dvh-60px)]">
        
        {/* Left Column: Viewport & Stats */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Viewport */}
          <div className="relative flex-1 min-h-[30vh] border border-primary/30 bg-black box-glow overflow-hidden group rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20 z-10 pointer-events-none" />
            <img 
              src={earthOrbitImg} 
              alt="Earth Orbit Viewport" 
              className="w-full h-full object-cover opacity-80 mix-blend-screen scale-105 transition-transform duration-[20s] group-hover:scale-110 ease-linear"
            />
            
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg">
              <MapPin className="h-4 w-4 text-chart-2" />
              <span className="uppercase tracking-widest text-sm text-chart-2 text-glow-amber">LOC: {player.currentLocation}</span>
            </div>

            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="uppercase tracking-widest text-sm text-primary">Sensors Active</span>
            </div>
            
            {/* Viewport Overlay HUD elements */}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary/10 to-transparent z-10 pointer-events-none" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/20 rounded-full flex items-center justify-center opacity-30 z-10 pointer-events-none">
              <div className="w-1 h-2 bg-primary absolute top-0" />
              <div className="w-1 h-2 bg-primary absolute bottom-0" />
              <div className="h-1 w-2 bg-primary absolute left-0" />
              <div className="h-1 w-2 bg-primary absolute right-0" />
            </div>
          </div>

          {/* Stats Panel */}
          <div className="h-28 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="glass-panel p-3 flex flex-col justify-center relative overflow-hidden rounded-lg">
              <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1 z-10">Credits</span>
              <div className="flex items-center gap-2 z-10">
                <Battery className="h-4 w-4 text-chart-3" />
                <span className="text-xl font-bold text-chart-3">{player.credits.toLocaleString()}</span>
              </div>
              <div className="absolute right-0 bottom-0 text-[4rem] font-bold text-chart-3/5 select-none -mb-4 -mr-2">CR</div>
            </div>
            <div className="glass-panel p-3 flex flex-col justify-center relative overflow-hidden rounded-lg">
              <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1 z-10">Experience</span>
              <div className="flex items-center gap-2 z-10">
                <Zap className="h-4 w-4 text-chart-4" />
                <span className="text-xl font-bold text-chart-4">{player.experience.toLocaleString()}</span>
              </div>
              <div className="absolute right-0 bottom-0 text-[4rem] font-bold text-chart-4/5 select-none -mb-4 -mr-2">XP</div>
            </div>
            <div className="glass-panel p-3 flex flex-col justify-center col-span-2 md:col-span-2 relative overflow-hidden rounded-lg">
              <span className="text-xs text-muted-foreground uppercase tracking-widest mb-1 z-10">Mining Level {player.miningLevel}</span>
              <div className="flex items-center gap-2 z-10">
                <Award className="h-4 w-4 text-primary" />
                <Progress value={(player.experience % 1000) / 10} className="h-2 bg-background/60 border border-primary/20" />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Console & Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Mining Controls */}
          <div className="glass-panel p-4 flex flex-col gap-4 flex-shrink-0 rounded-lg">
            <div className="flex items-center justify-between">
              <h2 className="uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                <Pickaxe className="h-4 w-4" /> Extractor Array
              </h2>
              <span className="text-xs text-muted-foreground uppercase">
                Cycle: <span className="text-primary">{player.cycleDurationSec}s</span>
              </span>
            </div>

            <div className="space-y-2 bg-background/50 border border-primary/10 p-3 rounded-lg">
              <div className="flex justify-between text-sm uppercase">
                <span className="text-muted-foreground">Status:</span>
                <span className={
                  isMining ? "text-primary text-glow animate-pulse"
                  : hasInProgressCycle ? "text-chart-2 text-glow-amber"
                  : "text-muted-foreground"
                }>
                  {isMining ? "ACTIVE" : hasInProgressCycle ? "PAUSED" : "STANDBY"}
                </span>
              </div>

              {hasInProgressCycle && (
                <div className="flex justify-between text-sm uppercase">
                  <span className="text-muted-foreground">
                    {timeLeft !== null && timeLeft <= 0 ? "Ready:" : "Next Yield:"}
                  </span>
                  <span className="text-primary font-bold">
                    {timeLeft !== null && timeLeft > 0 ? `${timeLeft}s` : "Claim Now"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 mt-2">
              {!isMining ? (
                <Button
                  onClick={handleStart}
                  disabled={isBusy}
                  className="w-full font-mono uppercase tracking-widest border border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                  variant="outline"
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pickaxe className="h-4 w-4 mr-2" />}
                  Start Mining
                </Button>
              ) : (
                <Button
                  onClick={handleStop}
                  className="w-full font-mono uppercase tracking-widest border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
                  variant="outline"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Mining
                </Button>
              )}
            </div>
          </div>

          {/* Command Console Log */}
          <div className="flex-1 glass-panel p-4 flex flex-col overflow-hidden relative rounded-lg">
            <h3 className="uppercase tracking-widest text-xs text-primary/60 border-b border-primary/20 pb-2 mb-2 sticky top-0">Terminal Log</h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className="text-xs break-words leading-relaxed opacity-90 hover:opacity-100 hover:bg-primary/5 p-1 transition-colors">
                  <span className="text-primary/70 mr-2">[{msg.time}]</span>
                  <span className={
                    msg.text.includes("[ERROR]") ? "text-destructive" :
                    msg.text.includes("[REWARD]") || msg.text.includes("[LEVEL UP]") ? "text-chart-2 text-glow-amber" :
                    msg.text.includes("[SYSTEM]") ? "text-primary/80" :
                    "text-primary"
                  }>
                    {msg.text}
                  </span>
                </div>
              ))}
              <div ref={logEndRef} className="h-1" />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
