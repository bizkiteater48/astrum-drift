import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  getGetMeQueryKey,
  useLogout,
  useGetChatMessages,
  useSendChatMessage,
  getGetChatMessagesQueryKey,
  ApiError,
  type ChatChannel,
  type ChatMessage,
  type ChatMessageList,
  type Player,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Power,
  Terminal,
  Globe,
  Coins,
  Dices,
  Shield,
  ShieldCheck,
  CircleHelp,
  Flag,
  EyeOff,
} from "lucide-react";
import earthOrbitImg from "@/assets/earth-orbit.png";
import earthLaunchIntroImg from "@/assets/earth-launch-intro.jpg";
import industrialYardImg from "@/assets/industrial-yard.jpg";
import bioDomeImg from "@/assets/bio-dome.jpg";
import trainingGroundsImg from "@/assets/training-grounds.jpg";
import wreckSiteImg from "@/assets/wreck-site.jpg";
import outpostShopImg from "@/assets/outpost-shop.jpg";
import spaceportImg from "@/assets/spaceport.jpg";
import trainingDroneCombatImg from "@/assets/training-drone-combat.jpg";
import trainingSectorTravelImg from "@/assets/training-sector-travel.png";
import defaultAvatarImg from "@/assets/default-avatar.png";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CodexPanel } from "@/components/codex-panel";
import { MarketPanel, type MarketPanelView } from "@/components/market-panel";
import { applyNpcSell } from "@/lib/npc-economy";
import { SurveyArtPlaceholder } from "@/components/placeholder-art-overlay";
import { StarChartPanel } from "@/components/star-chart-panel";
import { ModerationPanel } from "@/components/moderation-panel";
import { MessagesPanel } from "@/components/messages-panel";
import { DriftLoungePanel } from "@/components/drift-lounge-panel";
import { PlayerSupportPanel } from "@/components/player-support-panel";
import { ReportPlayerDialog } from "@/components/report-player-dialog";
import { isAdminRole } from "@/lib/admin-api";
import {
  deleteChatMessage,
  isStaffRole,
  canAccessStaffChat,
  canShowStaffChatTag,
  getStaffChatTagPreferenceCopy,
  updatePlayerPreferences,
  getPendingReportCount,
} from "@/lib/moderation-api";
import { getInboxUnreadCount } from "@/lib/inbox-api";
import {
  applyMainGameActionInventory,
  canAffordMainGameAction,
  createDefaultSkillXp,
  getActionSkillXp,
  getMainGameActionRecipeCost,
  getEffectiveBuildTimer,
  getLocationHubActions,
  getMainGameLocation,
  isAutoLoopEligibleAction,
  isInventoryFullForAction,
  isMainGamePlaceholderImage,
  isProductionAction,
  MAIN_GAME_DIRECTIVE,
  MAIN_GAME_SKILLS,
  MAIN_GAME_START_LOCATION,
  MATERIAL_INVENTORY_GROUPS,
  normalizeMainGameLocationId,
  TUTORIAL_DEPART_TIMER_SEC,
  type MainGameAction,
  type MainGameImageKey,
  type MainGameLocationId,
  type MainGameTravelLink,
  type SkillId,
} from "@/lib/main-game";
import { formatUtcChatTime, LIVE_CHAT_LIMIT, sortChatMessagesNewestFirst } from "@/lib/chat";
import {
  addChatIgnore,
  canBeChatIgnored,
  listChatIgnores,
  removeChatIgnore,
  type ChatIgnore,
} from "@/lib/chat-ignores-api";
import { SILVER_ORE_ITEM } from "@/lib/gambling";
import { mintSilverCoins } from "@/lib/gambling-api";

type TutorialStep = {
  id: string;
  location: string;
  objective: string;
  type: "travel" | "action" | "complete";
  actionLabel?: string;
  timerSec?: number;
  requiredCompletions?: number;
};

const HAND_EQUIP_ITEMS = [
  "Training Blade",
  "Basic Mining Tool",
  "Basic Harvesting Tool",
  "Basic Salvage Tool",
  "Basic Repair Kit",
  "Basic Weapon",
] as const;

const isHandEquipItem = (itemName: string) =>
  (HAND_EQUIP_ITEMS as readonly string[]).includes(itemName);

const CHAT_CHANNELS = [
  { id: "global", label: "Global", Icon: Globe },
  { id: "trade", label: "Trade", Icon: Coins },
  { id: "clan", label: "Clan", Icon: Shield },
  { id: "help", label: "Help", Icon: CircleHelp },
  { id: "staff", label: "Staff", Icon: ShieldCheck },
] as const;

type ChatChannelId = (typeof CHAT_CHANNELS)[number]["id"];

const CHAT_CHANNEL_EMPTY_TEXT: Record<ChatChannelId, string> = {
  global: "Global chat is quiet. Say hello to the sector.",
  trade: "Trade chat — list items and deals will appear here.",
  clan: "Join a clan to unlock clan chat.",
  help: "Help chat — ask questions and share tips with other pilots.",
  staff: "Staff chat — internal coordination for moderators, guides, and admins.",
};

const CHAT_CHANNEL_PLACEHOLDER: Record<ChatChannelId, string> = {
  global: "Message Global chat…",
  trade: "Message Trade chat…",
  clan: "Clan chat unavailable",
  help: "Message Help chat…",
  staff: "Message Staff chat…",
};

const isPlayerMuted = (player: Player | null | undefined): boolean => {
  if (!player?.mutedUntil) return false;
  return new Date(player.mutedUntil).getTime() > Date.now();
};

const CHAT_CHANNEL_STYLES: Record<
  ChatChannelId,
  {
    tabActive: string;
    tabInactive: string;
    author: string;
    message: string;
    messageBorder: string;
  }
> = {
  global: {
    tabActive: "border-primary/50 bg-primary/15 text-primary",
    tabInactive: "border-primary/20 text-primary/60 hover:bg-primary/10",
    author: "text-primary font-semibold",
    message: "text-primary/80",
    messageBorder: "border-l-primary/50",
  },
  trade: {
    tabActive: "border-orange-400/50 bg-orange-400/10 text-orange-400",
    tabInactive: "border-orange-400/25 text-orange-400/60 hover:bg-orange-400/10",
    author: "text-orange-400 font-semibold",
    message: "text-orange-400/80",
    messageBorder: "border-l-orange-400/50",
  },
  clan: {
    tabActive: "border-chart-3/50 bg-chart-3/15 text-chart-3",
    tabInactive: "border-chart-3/25 text-chart-3/60 hover:bg-chart-3/10",
    author: "text-chart-3 font-semibold",
    message: "text-chart-3/80",
    messageBorder: "border-l-chart-3/50",
  },
  help: {
    tabActive: "border-chart-4/50 bg-chart-4/15 text-chart-4",
    tabInactive: "border-chart-4/25 text-chart-4/60 hover:bg-chart-4/10",
    author: "text-chart-4 font-semibold",
    message: "text-chart-4/80",
    messageBorder: "border-l-chart-4/50",
  },
  staff: {
    tabActive: "border-violet-400/50 bg-violet-400/10 text-violet-300",
    tabInactive: "border-violet-400/25 text-violet-400/60 hover:bg-violet-400/10",
    author: "text-violet-300 font-semibold",
    message: "text-violet-300/80",
    messageBorder: "border-l-violet-400/50",
  },
};

const tutorialSteps: TutorialStep[] = [
  {
    id: "mine_iron_ore",
    location: "Industrial Yard",
    objective: "Mine 6 Iron Ore.",
    type: "action",
    actionLabel: "Mine Iron Ore",
    timerSec: 5,
    requiredCompletions: 2,
  },
  {
    id: "refine_iron_ore",
    location: "Industrial Yard",
    objective: "Refine 6 Iron Ore into 2 Refined Iron.",
    type: "action",
    actionLabel: "Refine Iron Ore",
    timerSec: 5,
    requiredCompletions: 2,
  },
  {
    id: "fabricate_training_blade",
    location: "Industrial Yard",
    objective: "Fabricate a Training Blade.",
    type: "action",
    actionLabel: "Fabricate Training Blade",
    timerSec: 5,
  },
  {
    id: "travel_to_bio_dome",
    location: "Industrial Yard",
    objective: "Travel to the Bio Dome.",
    type: "travel",
    actionLabel: "Travel to Bio Dome",
    timerSec: 5,
  },
  {
    id: "harvest_bio_samples",
    location: "Bio Dome",
    objective: "Harvest materials for Life Support Gel.",
    type: "action",
    actionLabel: "Harvest Bio Samples",
    timerSec: 5,
    requiredCompletions: 2,
  },
  {
    id: "synthesize_life_support_gel",
    location: "Bio Dome",
    objective: "Synthesize Life Support Gel.",
    type: "action",
    actionLabel: "Synthesize Life Support Gel",
    timerSec: 5,
    requiredCompletions: 2,
  },
  {
    id: "travel_to_training_grounds",
    location: "Bio Dome",
    objective: "Travel to the Training Grounds.",
    type: "travel",
    actionLabel: "Travel to Training Grounds",
    timerSec: 5,
  },
  {
    id: "defeat_training_drone",
    location: "Training Grounds",
    objective: "Equip the Training Blade, then defeat a Training Drone.",
    type: "action",
    actionLabel: "Fight Training Drone",
    timerSec: 5,
  },
  {
    id: "travel_to_wreck_site",
    location: "Training Grounds",
    objective: "Travel to the Wreck Site.",
    type: "travel",
    actionLabel: "Travel to Wreck Site",
    timerSec: 5,
  },
  {
    id: "salvage_wreckage",
    location: "Wreck Site",
    objective: "Salvage the damaged wreck for repair parts.",
    type: "action",
    actionLabel: "Salvage Wreckage",
    timerSec: 5,
  },
  {
    id: "repair_training_rover",
    location: "Wreck Site",
    objective: "Use Salvage Parts to repair the Training Rover.",
    type: "action",
    actionLabel: "Repair Training Rover",
    timerSec: 5,
  },
  {
    id: "travel_to_outpost_shop",
    location: "Wreck Site",
    objective: "Travel to the Outpost Shop.",
    type: "travel",
    actionLabel: "Travel to Outpost Shop",
    timerSec: 5,
  },
  {
    id: "sell_damaged_scrap",
    location: "Outpost Shop",
    objective: "Sell Damaged Scrap to the Outpost vendor.",
    type: "action",
    actionLabel: "Sell Damaged Scrap",
  },
  {
    id: "travel_to_spaceport",
    location: "Outpost Shop",
    objective: "Travel to the Spaceport.",
    type: "travel",
    actionLabel: "Travel to Spaceport",
    timerSec: 5,
  },
  {
    id: "complete_tutorial",
    location: "Spaceport",
    objective: "Complete Outpost One training and step into the unknown...",
    type: "complete",
    actionLabel: "Complete Training",
    timerSec: TUTORIAL_DEPART_TIMER_SEC,
  },
];
export default function PlayPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);
  const [currentTutorialStepIndex, setCurrentTutorialStepIndex] = useState(0);
  type TutorialSaveData = {
    version: number;
    progressVersion?: number;
    currentTutorialStepIndex: number;
    currentTutorialActionCount: number;
    tutorialInventory: Record<string, number>;
    playerHealth: number;
    enemyHealth: number;
    targetIntel: Record<string, number>;
    equippedGear: Record<string, string | null>;
    requiresPostCombatHeal: boolean;
    postCombatRecoveryComplete: boolean;
    isTutorialComplete: boolean;
    mainGameLocationId?: MainGameLocationId;
    skillXp?: Record<string, number>;
    recentRewardMessages: string[];
    recentSystemNotice: string | null;
    lastRewardStepId: string | null;
  };

  const TUTORIAL_SAVE_VERSION = 4;
  const [currentTutorialActionCount, setCurrentTutorialActionCount] =
    useState(0);
  const [tutorialInventory, setTutorialInventory] = useState<
    Record<string, number>
  >({
    "Training Tool": 1,
    "Training Cutter": 1,
    "Training Harvester": 1,
    "Training Salvage Tool": 1,
    "Training Repair Kit": 1,
  });

  const [recentRewardMessages, setRecentRewardMessages] = useState<string[]>(
    [],
  );
  const [lastRewardStepId, setLastRewardStepId] = useState<string | null>(null);
  const [recentSystemNotice, setRecentSystemNotice] = useState<string | null>(
    null,
  );
  const [playerHealth, setPlayerHealth] = useState(100);
  const playerMaxHealth = 100;
  const getHealthTextColor = () => {
    const healthPercent = (playerHealth / playerMaxHealth) * 100;

    if (healthPercent < 30) return "text-red-500";
    if (healthPercent < 70) return "text-yellow-400";
    return "text-green-400";
  };
  const [equippedGear, setEquippedGear] = useState<
    Record<string, string | null>
  >({
    Helmet: null,
    Hand: "Training Tool",
    Suit: "Training Suit",
    "Module 1": null,
    "Module 2": null,
  });
  const equippedItemCounts = Object.values(equippedGear).reduce<
    Record<string, number>
  >((counts, itemName) => {
    if (!itemName) return counts;

    counts[itemName] = (counts[itemName] ?? 0) + 1;
    return counts;
  }, {});

  const getAvailableInventoryQuantity = (itemName: string) => {
    const ownedQuantity = tutorialInventory[itemName] ?? 0;
    const equippedQuantity = equippedItemCounts[itemName] ?? 0;

    return Math.max(0, ownedQuantity - equippedQuantity);
  };

  const handleNpcSell = (itemName: string, quantity: number) => {
    const available = getAvailableInventoryQuantity(itemName);
    const sellQty = Math.min(quantity, available);
    if (sellQty <= 0) {
      addMessage(`[ERROR] No ${itemName} available to sell.`);
      setRecentSystemNotice(`No ${itemName} available to sell.`);
      return;
    }

    const result = applyNpcSell(tutorialInventory, itemName, sellQty);
    if (!result) {
      addMessage(`[ERROR] ${itemName} cannot be sold to the NPC vendor.`);
      setRecentSystemNotice(`${itemName} is not accepted by the vendor.`);
      return;
    }

    setTutorialInventory(result.inventory);
    addMessage(
      `[MARKET] Sold ${itemName} ×${sellQty} for ${result.creditsEarned} credits.`,
    );
    setRecentRewardMessages([`Credits +${result.creditsEarned}`]);
    setRecentSystemNotice(
      `Sold ${itemName} ×${sellQty} for ${result.creditsEarned} credits.`,
    );
  };
  const [enemyHealth, setEnemyHealth] = useState(60);
  const [targetIntel, setTargetIntel] = useState<Record<string, number>>({
    "Training Drone": 0,
  });
  const [combatMessage, setCombatMessage] = useState<string | null>(null);
  const [isCombatRoundRunning, setIsCombatRoundRunning] = useState(false);
  const [combatTimerLeft, setCombatTimerLeft] = useState<number | null>(null);
  const [isInCombat, setIsInCombat] = useState(false);
  const [requiresPostCombatHeal, setRequiresPostCombatHeal] = useState(false);
  const [postCombatRecoveryComplete, setPostCombatRecoveryComplete] =
    useState(false);
  const [isTutorialComplete, setIsTutorialComplete] = useState(false);
  const [mainGameLocationId, setMainGameLocationId] =
    useState<MainGameLocationId>(MAIN_GAME_START_LOCATION);
  const [showStarChart, setShowStarChart] = useState(false);
  const [marketPanelView, setMarketPanelView] = useState<MarketPanelView | null>(
    null,
  );
  const [showCodexPanel, setShowCodexPanel] = useState(false);
  const [skillXp, setSkillXp] = useState<Record<SkillId, number>>(
    createDefaultSkillXp(),
  );
  const [isMainGameActionRunning, setIsMainGameActionRunning] = useState(false);
  const [mainGameTimerLeft, setMainGameTimerLeft] = useState<number | null>(
    null,
  );
  const [pendingMainGameAction, setPendingMainGameAction] =
    useState<MainGameAction | null>(null);
  const [pendingMainGameTravel, setPendingMainGameTravel] =
    useState<MainGameTravelLink | null>(null);
  const [isMainGameAutoLoop, setIsMainGameAutoLoop] = useState(false);
  const mainGameCancelledRef = useRef(false);
  const [isTutorialActionRunning, setIsTutorialActionRunning] = useState(false);
  const [profileView, setProfileView] = useState<
    "gear" | "skills" | "cargo" | "ship"
  >("gear");

  const [expandedInventoryGroups, setExpandedInventoryGroups] = useState<
    Record<string, boolean>
  >({
    Ores: true,
    Bars: true,
    Harvest: true,
    Salvage: true,
    Consumables: true,
    Equipment: true,
    Vehicles: true,
  });

  const [showFullInventory, setShowFullInventory] = useState(false);
  const [showShipCargoManifest, setShowShipCargoManifest] = useState(false);
  const [showStationStorage, setShowStationStorage] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [isTutorialSaveLoaded, setIsTutorialSaveLoaded] = useState(false);

  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [loadedAppVersion, setLoadedAppVersion] = useState<string | null>(null);

  const [mobilePanel, setMobilePanel] = useState<
    "action" | "location" | "character" | "chat"
  >("action");

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeChatChannel, setActiveChatChannel] =
    useState<ChatChannelId>("global");
  const [chatDraft, setChatDraft] = useState("");
  const [chatSendError, setChatSendError] = useState<string | null>(null);
  const [staffChatDisplayAs, setStaffChatDisplayAs] = useState<
    "self" | "mod" | "admin" | "guide"
  >("self");
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [staffTagSaving, setStaffTagSaving] = useState(false);
  const inboxUnreadBaselineRef = useRef<number | null>(null);
  const pendingReportBaselineRef = useRef<number | null>(null);
  const [showDriftLounge, setShowDriftLounge] = useState(false);
  const [showPlayerSupportPanel, setShowPlayerSupportPanel] = useState(false);
  const lastProgressVersionRef = useRef<number | null>(null);
  const [reportDialog, setReportDialog] = useState<{
    username: string;
    channel?: string;
    messageId?: number;
  } | null>(null);
  const [reportSubmittedNotice, setReportSubmittedNotice] = useState<
    string | null
  >(null);
  const [chatIgnores, setChatIgnores] = useState<ChatIgnore[]>([]);
  const [chatIgnoreSaving, setChatIgnoreSaving] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatSendInFlightRef = useRef(false);
  const [showLaunchIntro, setShowLaunchIntro] = useState(true);
  const [showCommandTour, setShowCommandTour] = useState(true);
  const [commandTourStep, setCommandTourStep] = useState(0);
  const [introPhase, setIntroPhase] = useState<"image" | "broadcast">("image");
  const [tutorialTimerLeft, setTutorialTimerLeft] = useState<number | null>(
    null,
  );
  const logEndRef = useRef<HTMLDivElement>(null);

  const {
    data: player,
    isLoading: meLoading,
    error: meError,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const logoutMutation = useLogout();

  const visibleChatChannels = useMemo(
    () =>
      canAccessStaffChat(player?.role)
        ? CHAT_CHANNELS
        : CHAT_CHANNELS.filter((channel) => channel.id !== "staff"),
    [player?.role],
  );

  const staffTagPreferenceCopy = useMemo(
    () =>
      player && canShowStaffChatTag(player.role)
        ? getStaffChatTagPreferenceCopy(player.role)
        : null,
    [player?.role],
  );

  const refreshInboxUnreadCount = async () => {
    try {
      const result = await getInboxUnreadCount();
      if (
        inboxUnreadBaselineRef.current !== null &&
        result.count > inboxUnreadBaselineRef.current
      ) {
        setRecentSystemNotice(
          result.count === 1
            ? "You have a new inbox message."
            : `You have ${result.count} unread inbox messages.`,
        );
      }
      inboxUnreadBaselineRef.current = result.count;
      setInboxUnreadCount(result.count);
    } catch {
      // Ignore inbox polling errors.
    }
  };

  const refreshChatIgnores = async () => {
    try {
      const result = await listChatIgnores();
      setChatIgnores(result.ignores);
    } catch {
      // Ignore chat ignore load errors.
    }
  };

  const refreshPendingReportCount = async () => {
    if (!isStaffRole(player?.role)) return;

    try {
      const result = await getPendingReportCount();
      if (
        pendingReportBaselineRef.current !== null &&
        result.count > pendingReportBaselineRef.current
      ) {
        setRecentSystemNotice(
          result.count === 1
            ? "A new player report is waiting for review."
            : `${result.count} player reports are waiting for review.`,
        );
      }
      pendingReportBaselineRef.current = result.count;
      setPendingReportCount(result.count);
    } catch {
      // Ignore report polling errors.
    }
  };

  useEffect(() => {
    if (!player) return;

    void refreshInboxUnreadCount();
    void refreshPendingReportCount();
    void refreshChatIgnores();

    const intervalId = window.setInterval(() => {
      void refreshInboxUnreadCount();
      void refreshPendingReportCount();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [player?.id, player?.role]);

  const {
    data: chatData,
    isError: isChatLoadError,
    error: chatLoadError,
  } = useGetChatMessages(
    activeChatChannel as ChatChannel,
    { limit: LIVE_CHAT_LIMIT },
    {
      query: {
        enabled:
          isChatOpen &&
          Boolean(player?.username) &&
          (activeChatChannel !== "staff" || canAccessStaffChat(player?.role)),
        refetchInterval: isChatOpen ? 3000 : false,
      },
    },
  );

  const sendChatMutation = useSendChatMessage();

  const updatePlayerFromGambling = (updatedPlayer: Player) => {
    queryClient.setQueryData(getGetMeQueryKey(), updatedPlayer);
  };

  const deductSilverOre = (quantity: number): boolean => {
    if ((tutorialInventory[SILVER_ORE_ITEM] ?? 0) < quantity) return false;
    setTutorialInventory((prev) => {
      const next = { ...prev };
      const remaining = (next[SILVER_ORE_ITEM] ?? 0) - quantity;
      if (remaining > 0) next[SILVER_ORE_ITEM] = remaining;
      else delete next[SILVER_ORE_ITEM];
      return next;
    });
    return true;
  };

  const refundSilverOre = (quantity: number) => {
    setTutorialInventory((prev) => ({
      ...prev,
      [SILVER_ORE_ITEM]: (prev[SILVER_ORE_ITEM] ?? 0) + quantity,
    }));
  };

  const mintSilverCoinsFromOre = async (quantity: number) => {
    try {
      const result = await mintSilverCoins(quantity);
      updatePlayerFromGambling(result.player);
      addMessage(`[REWARD] Minted ${quantity} Silver Coin${quantity === 1 ? "" : "s"}.`);
      addRewardMessage(`Silver Coins +${quantity}`);
      return true;
    } catch (error) {
      refundSilverOre(quantity);
      const message =
        error instanceof ApiError
          ? (error.data as { error?: string } | null)?.error ?? error.message
          : "Failed to mint silver coins.";
      addMessage(`[ERROR] ${message}`);
      setRecentSystemNotice(message);
      return false;
    }
  };

  const addMessage = (text: string) => {
    setMessages((prev) =>
      [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          text,
          time: new Date().toLocaleTimeString([], { hour12: false }),
        },
      ].slice(-50),
    ); // Keep last 50
  };

  const activeChannelMessages = chatData?.messages ?? [];
  const ignoredPlayerIds = useMemo(
    () => new Set(chatIgnores.map((entry) => entry.playerId)),
    [chatIgnores],
  );
  const liveChatMessages = useMemo(
    () =>
      sortChatMessagesNewestFirst(activeChannelMessages).filter(
        (message) =>
          message.messageKind === "moderation" ||
          message.messageKind === "staff" ||
          !ignoredPlayerIds.has(message.authorId),
      ),
    [activeChannelMessages, ignoredPlayerIds],
  );
  const chatLoadErrorMessage =
    isChatLoadError &&
    chatLoadError instanceof ApiError
      ? (chatLoadError.data as { error?: string } | null)?.error ??
        chatLoadError.message
      : isChatLoadError
        ? "Unable to load chat messages."
        : null;
  const isChatInputEnabled =
    activeChatChannel !== "clan" &&
    (activeChatChannel !== "staff" || canAccessStaffChat(player?.role)) &&
    Boolean(player?.username) &&
    !chatLoadErrorMessage &&
    !isPlayerMuted(player);
  const isChatSendEnabled =
    isChatInputEnabled &&
    !sendChatMutation.isPending &&
    chatDraft.trim().length > 0;
  const muteMessage =
    isPlayerMuted(player) && player?.mutedUntil
      ? `You are muted until ${new Date(player.mutedUntil).toLocaleString()}.`
      : null;

  const handleDeleteChatMessage = async (messageId: number) => {
    try {
      await deleteChatMessage(messageId);
      await queryClient.invalidateQueries({
        queryKey: getGetChatMessagesQueryKey(activeChatChannel as ChatChannel),
      });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? (error.data as { error?: string } | null)?.error ?? error.message
          : "Failed to delete chat message.";
      setChatSendError(message);
    }
  };

  const handleIgnoreChatPlayer = async (username: string) => {
    setChatIgnoreSaving(true);
    try {
      await addChatIgnore(username);
      await refreshChatIgnores();
      setRecentSystemNotice(`Ignored ${username} in chat.`);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? (error.data as { error?: string } | null)?.error ?? error.message
          : "Failed to ignore player.";
      setChatSendError(message);
    } finally {
      setChatIgnoreSaving(false);
    }
  };

  const handleUnignoreChatPlayer = async (playerId: number, username: string) => {
    setChatIgnoreSaving(true);
    try {
      await removeChatIgnore(playerId);
      await refreshChatIgnores();
      setRecentSystemNotice(`${username} is no longer ignored.`);
    } catch {
      setRecentSystemNotice("Failed to unignore player.");
    } finally {
      setChatIgnoreSaving(false);
    }
  };

  const renderChatMessage = (message: ChatMessage, channelId: ChatChannelId) => {
    const channelStyle = CHAT_CHANNEL_STYLES[channelId];
    const isStaff = isStaffRole(player?.role);
    const isOfficialMessage =
      message.messageKind === "moderation" || message.messageKind === "staff";
    const isOwnMessage = !isOfficialMessage && message.authorId === player?.id;
    const showPlayerActions =
      !isOwnMessage &&
      !isOfficialMessage &&
      canBeChatIgnored(message.authorRole);
    const showReportAction = showPlayerActions && channelId !== "staff";

    if (isOfficialMessage) {
      const showStaffAuthor = message.messageKind === "staff";

      return (
        <div key={message.id} className="group flex items-start gap-1">
          <div className="flex-1 min-w-0 text-[11px] font-mono leading-snug">
            <span className="whitespace-nowrap text-destructive/70">
              [{formatUtcChatTime(message.sentAt)}]
            </span>{" "}
            {showStaffAuthor && (
              <>
                <span className="text-destructive font-semibold">{message.author}</span>
                <span className="text-destructive mx-1">·</span>
              </>
            )}
            <span className="text-destructive break-words">{message.text}</span>
          </div>
          {isStaff && (
            <button
              type="button"
              aria-label="Delete message"
              onClick={() => void handleDeleteChatMessage(message.id)}
              className="h-5 w-5 shrink-0 rounded border border-destructive/30 text-destructive text-xs hover:bg-destructive/10 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      );
    }

    return (
      <div key={message.id} className="group flex items-start gap-1">
        <div
          className={`flex-1 min-w-0 text-[11px] font-mono leading-snug border-l-2 pl-1.5 break-words ${channelStyle.messageBorder}`}
        >
          <span className="whitespace-nowrap">
            <span className={`${channelStyle.message} opacity-70`}>
              [{formatUtcChatTime(message.sentAt)}]
            </span>{" "}
            <span className={channelStyle.author}>
              {message.authorStaffTag && (
                <span className="text-chart-2 mr-1">[{message.authorStaffTag}]</span>
              )}
              {message.author}
            </span>
            <span className={`${channelStyle.message} mx-1`}>·</span>
          </span>{" "}
          <span className={`${channelStyle.message} break-words`}>
            {message.text}
          </span>
        </div>
        {(isStaff || showPlayerActions) && (
          <div className="flex items-center gap-0.5 shrink-0 pt-0.5 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            {isStaff && (
              <button
                type="button"
                aria-label="Delete message"
                onClick={() => void handleDeleteChatMessage(message.id)}
                className="h-5 w-5 rounded border border-destructive/30 text-destructive text-xs hover:bg-destructive/10"
              >
                ×
              </button>
            )}
            {showPlayerActions && (
              <button
                type="button"
                aria-label="Ignore player"
                disabled={chatIgnoreSaving}
                onClick={() => void handleIgnoreChatPlayer(message.author)}
                className="h-5 w-5 rounded border border-muted-foreground/30 text-muted-foreground hover:bg-muted/20 disabled:opacity-50"
              >
                <EyeOff className="size-2.5 mx-auto" aria-hidden="true" />
              </button>
            )}
            {showReportAction && (
              <button
                type="button"
                aria-label="Report player"
                onClick={() =>
                  setReportDialog({
                    username: message.author,
                    channel: channelId,
                    messageId: message.id,
                  })
                }
                className="h-5 w-5 rounded border border-primary/20 text-primary/70 hover:bg-primary/10"
              >
                <Flag className="size-2.5 mx-auto" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const sendChatMessage = async () => {
    const trimmed = chatDraft.trim();
    if (
      !trimmed ||
      !player?.username ||
      activeChatChannel === "clan" ||
      (activeChatChannel === "staff" && !canAccessStaffChat(player.role)) ||
      chatSendInFlightRef.current ||
      !isChatInputEnabled
    ) {
      return;
    }

    chatSendInFlightRef.current = true;
    setChatSendError(null);

    try {
      const result = await sendChatMutation.mutateAsync({
        channel: activeChatChannel as ChatChannel,
        data: {
          text: trimmed,
          ...(staffChatDisplayAs !== "self"
            ? { displayAs: staffChatDisplayAs }
            : {}),
        },
      });
      setChatDraft("");

      const queryKey = getGetChatMessagesQueryKey(
        activeChatChannel as ChatChannel,
      );
      queryClient.setQueryData<ChatMessageList>(queryKey, (current) => ({
        messages: sortChatMessagesNewestFirst([
          result.message,
          ...(current?.messages ?? []),
        ]),
      }));
      await queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? (error.data as { error?: string } | null)?.error ?? error.message
          : "Failed to send chat message.";
      setChatSendError(message);
    } finally {
      chatSendInFlightRef.current = false;
      chatInputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!isChatOpen) return;
    const scrollContainer = chatScrollRef.current;
    if (!scrollContainer) return;
    scrollContainer.scrollTop = 0;
  }, [activeChatChannel, isChatOpen]);

  useEffect(() => {
    if (activeChatChannel === "staff" && !canAccessStaffChat(player?.role)) {
      setActiveChatChannel("global");
    }
  }, [activeChatChannel, player?.role]);
  const currentTutorialStep = tutorialSteps[currentTutorialStepIndex];
  const getActiveSkillFromTutorialStep = () => {
    if (!currentTutorialStep) return "Mining";

    switch (currentTutorialStep.id) {
      case "mine_iron_ore":
        return "Mining";
      case "refine_iron_ore":
        return "Fabrication";
      case "fabricate_training_blade":
        return "Fabrication";
      case "harvest_bio_samples":
        return "Harvesting";
      case "synthesize_life_support_gel":
        return "Synthesis";
      case "defeat_training_drone":
        return "Combat";
      case "salvage_wreckage":
        return "Salvaging";
      case "repair_training_rover":
        return "Engineering";
      case "sell_damaged_scrap":
        return "Trading";
      case "travel_to_bio_dome":
      case "travel_to_training_grounds":
      case "travel_to_wreck_site":
      case "travel_to_outpost_shop":
      case "travel_to_spaceport":
      case "complete_tutorial":
        return "Navigation";
      default:
        return "General";
    }
  };

  const activeSkill = isTutorialComplete
    ? (pendingMainGameAction?.skill ??
      (pendingMainGameTravel ? "Navigation" : "Operations"))
    : getActiveSkillFromTutorialStep();

  const currentMainGameLocation = getMainGameLocation(mainGameLocationId);
  const locationHubActions = isTutorialComplete
    ? getLocationHubActions(currentMainGameLocation)
    : [];

  const hasMobileStatusAlert =
    isTutorialActionRunning ||
    isMainGameActionRunning ||
    isInCombat ||
    isCombatRoundRunning ||
    requiresPostCombatHeal ||
    postCombatRecoveryComplete;

  const mobileStatusAlertText = requiresPostCombatHeal
    ? "Recovery required — use Life Support Gel"
    : postCombatRecoveryComplete
      ? "Recovery complete — return to action"
      : isInCombat || isCombatRoundRunning
        ? "Combat active — Training Drone"
        : isMainGameActionRunning && pendingMainGameTravel
          ? `Traveling — ${pendingMainGameTravel.label}`
          : isMainGameActionRunning && pendingMainGameAction
            ? `Action active — ${pendingMainGameAction.label}`
            : currentTutorialStep.type === "travel"
              ? `Traveling — ${currentTutorialStep.actionLabel ?? "In Transit"}`
              : `Action active — ${currentTutorialStep.actionLabel ?? "Training Action"}`;

  const mobileStatusTimerText =
    combatTimerLeft !== null
      ? `Next exchange ${Math.ceil(combatTimerLeft)}s`
      : mainGameTimerLeft !== null
        ? `${Math.ceil(mainGameTimerLeft)}s remaining`
        : tutorialTimerLeft !== null
          ? `${Math.ceil(tutorialTimerLeft)}s remaining`
          : "";

  const idleCommandText = isTutorialComplete
    ? currentMainGameLocation.locationType === "spaceport"
      ? "Use Travel to depart for planetary orbital zones."
      : currentMainGameLocation.locationType === "planet_orbit"
        ? "Travel to a surface settlement for field operations."
        : currentMainGameLocation.actions.length === 0 &&
            locationHubActions.length === 0
          ? "Use Travel to return to orbit or reach another settlement."
          : "Run a local action or travel to another area."
    : "Select the current training action to proceed.";

  const shouldHighlightLifeSupportGel =
    requiresPostCombatHeal && (tutorialInventory["Life Support Gel"] ?? 0) > 0;

  const shouldHighlightTrainingBladeEquip =
    currentTutorialStep.id === "defeat_training_drone" &&
    equippedGear.Hand !== "Training Blade" &&
    (tutorialInventory["Training Blade"] ?? 0) > 0;

  const getRequiredHandItemForStep = (stepId: string) => {
    switch (stepId) {
      case "mine_iron_ore":
        return "Training Cutter";
      case "refine_iron_ore":
      case "fabricate_training_blade":
      case "synthesize_life_support_gel":
        return "Training Tool";
      case "harvest_bio_samples":
        return "Training Harvester";

      case "salvage_wreckage":
        return "Training Salvage Tool";
      case "repair_training_rover":
        return "Training Repair Kit";
      default:
        return null;
    }
  };
  useEffect(() => {
    if (!currentTutorialStep) return;

    const requiredHandItem = getRequiredHandItemForStep(currentTutorialStep.id);

    if (!requiredHandItem) {
      setRecentSystemNotice(null);
      return;
    }
    const equipmentNotice =
      currentTutorialStep.id === "repair_training_rover"
        ? `${requiredHandItem} equipped. Use Salvage Parts to repair the Training Rover.`
        : `${requiredHandItem} equipped. Hand slot controls active actions.`;

    setEquippedGear((prev) => {
      if (prev.Hand === requiredHandItem) {
        setRecentSystemNotice(equipmentNotice);
        return prev;
      }

      setRecentSystemNotice(equipmentNotice);

      return {
        ...prev,
        Hand: requiredHandItem,
      };
    });
  }, [currentTutorialStep.id]);

  const activeTargetName =
    isInCombat || currentTutorialStep.id === "defeat_training_drone"
      ? "Training Drone"
      : null;

  const activeTargetIntel = activeTargetName
    ? (targetIntel[activeTargetName] ?? 0)
    : null;

  const getTutorialViewportImage = () => {
    if (!currentTutorialStep) return earthOrbitImg;

    if (currentTutorialStep.id === "defeat_training_drone" && isInCombat) {
      return trainingDroneCombatImg;
    }

    if (
      (currentTutorialStep.type === "travel" ||
        currentTutorialStep.id === "complete_tutorial") &&
      isTutorialActionRunning &&
      tutorialTimerLeft !== null
    ) {
      return trainingSectorTravelImg;
    }

    switch (currentTutorialStep.location) {
      case "Industrial Yard":
        return industrialYardImg;
      case "Bio Dome":
        return bioDomeImg;
      case "Training Grounds":
        return trainingGroundsImg;
      case "Wreck Site":
        return wreckSiteImg;
      case "Outpost Shop":
        return outpostShopImg;
      case "Spaceport":
        return spaceportImg;
      default:
        return earthOrbitImg;
    }
  };

  const tutorialViewportImage = getTutorialViewportImage();

  const getMainGameImage = (imageKey: MainGameImageKey) => {
    switch (imageKey) {
      case "spaceport":
        return spaceportImg;
      case "planet_orbit":
        return earthOrbitImg;
      case "settlement_hub":
        return outpostShopImg;
      case "mining_site":
      case "fabrication_yard":
        return industrialYardImg;
      case "bio_dome":
      case "harvest_fen":
        return bioDomeImg;
      case "wreck_site":
        return wreckSiteImg;
      case "combat_arena":
        return trainingGroundsImg;
      case "relay_station":
        return trainingSectorTravelImg;
      default:
        return spaceportImg;
    }
  };

  const awardSkillXp = (actionId: MainGameAction["id"]) => {
    const award = getActionSkillXp(actionId);
    if (!award) return;

    setSkillXp((prev) => ({
      ...prev,
      [award.skill]: (prev[award.skill] ?? 0) + award.xp,
    }));

    addMessage(
      `[XP] ${award.skill.charAt(0).toUpperCase() + award.skill.slice(1)} +${award.xp} XP.`,
    );
  };

  const displayLocationName = isTutorialComplete
    ? currentMainGameLocation.name
    : currentTutorialStep.location;

  const displayZoneName = isTutorialComplete
    ? currentMainGameLocation.systemName
    : "Outpost One Training Zone";

  const displayDirective = isTutorialComplete
    ? MAIN_GAME_DIRECTIVE
    : currentTutorialStep.objective;

  const displayViewportImage = isTutorialComplete
    ? isMainGameActionRunning && pendingMainGameTravel
      ? trainingSectorTravelImg
      : getMainGameImage(currentMainGameLocation.imageKey)
    : tutorialViewportImage;

  const showMainGameViewportPlaceholder =
    isTutorialComplete &&
    (isMainGameActionRunning && pendingMainGameTravel
      ? true
      : isMainGamePlaceholderImage(currentMainGameLocation.imageKey));

  const getRequiredHandItemNotice = (action: MainGameAction): string => {
    const tool = action.requiredHandItem!;
    const verb = action.skill.toLowerCase();
    return `Equip ${tool} from inventory before ${verb}.`;
  };

  const executeMainGameAction = (action: MainGameAction): boolean => {
    if (action.requiredHandItem && equippedGear.Hand !== action.requiredHandItem) {
      const notice = getRequiredHandItemNotice(action);
      addMessage(`[ERROR] ${notice}`);
      setRecentSystemNotice(notice);
      return false;
    }

    if (isProductionAction(action.id)) {
      if (!canAffordMainGameAction(action.id, tutorialInventory)) {
        const cost = getMainGameActionRecipeCost(action.id);
        const costText = Object.entries(cost)
          .map(([item, qty]) => `${item} x${qty}`)
          .join(", ");
        addMessage(`[ERROR] Fabrication requires ${costText}.`);
        return false;
      }
    } else if (isInventoryFullForAction(action.id, tutorialInventory)) {
      addMessage("[ERROR] Inventory full. Cannot collect more items.");
      setRecentSystemNotice("Inventory full. Clear space to continue.");
      return false;
    }

    const inventoryResult = applyMainGameActionInventory(
      action.id,
      tutorialInventory,
    );

    if (inventoryResult === null) {
      if (isProductionAction(action.id)) {
        const cost = getMainGameActionRecipeCost(action.id);
        const costText = Object.entries(cost)
          .map(([item, qty]) => `${item} x${qty}`)
          .join(", ");
        addMessage(`[ERROR] Fabrication requires ${costText}.`);
      } else {
        addMessage("[ERROR] Inventory full. Cannot collect more items.");
        setRecentSystemNotice("Inventory full. Clear space to continue.");
      }
      return false;
    }

    if (inventoryResult !== tutorialInventory) {
      setTutorialInventory(inventoryResult);
    }

    if (action.id === "mine_copper_vein") {
      addMessage("[REWARD] Mining complete: Copper Ore x1.");
      addRewardMessage("Copper Ore x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "mine_silver_vein") {
      addMessage("[REWARD] Mining complete: Silver Ore x1.");
      addRewardMessage("Silver Ore x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "mine_nickel_deposit") {
      addMessage("[REWARD] Mining complete: Nickel Ore x1.");
      addRewardMessage("Nickel Ore x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "fabricate_bronze_bar") {
      addMessage("[REWARD] Fabrication complete: Bronze Bar x1.");
      addRewardMessage("Bronze Bar x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "fabricate_iron_bar") {
      addMessage("[REWARD] Fabrication complete: Iron Bar x1.");
      addRewardMessage("Iron Bar x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "fabricate_silver_coins") {
      void mintSilverCoinsFromOre(1);
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "harvest_fiberleaf") {
      addMessage("[REWARD] Harvest complete: Fiberleaf x1.");
      addRewardMessage("Fiberleaf x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "salvage_wreck_flats") {
      addMessage(
        "[REWARD] Salvage complete: Scrap Metal x1, Wire Bundle x1.",
      );
      addRewardMessage("Scrap Metal x1, Wire Bundle x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "salvage_hulk_yard") {
      addMessage(
        "[REWARD] Salvage complete: Armor Plating x1, Circuit x1.",
      );
      addRewardMessage("Armor Plating x1, Circuit x1");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "craft_energy_cartridge") {
      addMessage(
        "[SYSTEM] Energy Cartridge recipe data coming soon. Engineering bay reserved.",
      );
      addRewardMessage("Engineering stub — coming soon");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "combat_balanced_enemy") {
      addMessage(
        "[REWARD] Combat complete: Balanced opponent defeated. Combat data logged.",
      );
      addRewardMessage("Balanced combat victory");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "combat_dangerous_enemy") {
      addMessage(
        "[REWARD] Combat complete: Dangerous hostile neutralized. High-risk engagement logged.",
      );
      addRewardMessage("Dangerous combat victory");
      awardSkillXp(action.id);
      return true;
    }

    if (action.id === "turn_in_beacon_request") {
      addMessage(
        "[NAV] Navigation request submitted at Beacon Relay. Request board turn-in coming soon.",
      );
      addRewardMessage("Navigation request logged");
      awardSkillXp(action.id);
      return true;
    }

    return false;
  };

  const executeMainGameTravel = (destination: MainGameTravelLink) => {
    setMainGameLocationId(destination.locationId);
    setRecentRewardMessages([]);
    setRecentSystemNotice(null);
    addMessage(
      `[NAV] Arrived at ${getMainGameLocation(destination.locationId).name}.`,
    );
  };

  const tryContinueMainGameAutoLoop = (
    action: MainGameAction,
    locationAtStart: MainGameLocationId,
    nextInventory: Record<string, number>,
  ) => {
    if (!isMainGameAutoLoop || mainGameCancelledRef.current) return;

    if (mainGameLocationId !== locationAtStart) {
      setIsMainGameAutoLoop(false);
      return;
    }

    const location = getMainGameLocation(locationAtStart);
    if (!location.actions.some((entry) => entry.id === action.id)) {
      setIsMainGameAutoLoop(false);
      return;
    }

    if (
      action.requiredHandItem &&
      equippedGear.Hand !== action.requiredHandItem
    ) {
      setIsMainGameAutoLoop(false);
      addMessage(
        `[SYSTEM] Auto-loop stopped — ${action.requiredHandItem} no longer equipped.`,
      );
      return;
    }

    if (isProductionAction(action.id)) {
      if (!canAffordMainGameAction(action.id, nextInventory)) {
        setIsMainGameAutoLoop(false);
        addMessage("[SYSTEM] Auto-loop stopped — insufficient materials.");
        return;
      }
    } else if (isInventoryFullForAction(action.id, nextInventory)) {
      setIsMainGameAutoLoop(false);
      addMessage("[SYSTEM] Auto-loop stopped — inventory full.");
      return;
    }

    setPendingMainGameAction(action);
    setMainGameTimerLeft(getEffectiveBuildTimer(action.timerSec));
    setIsMainGameActionRunning(true);
    addMessage(`[ACTION] Auto-loop: ${action.label} continuing...`);
  };

  const completeMainGameAction = () => {
    if (mainGameCancelledRef.current) {
      mainGameCancelledRef.current = false;
      return;
    }

    if (pendingMainGameTravel) {
      const destination = pendingMainGameTravel;
      setPendingMainGameTravel(null);
      setIsMainGameAutoLoop(false);
      executeMainGameTravel(destination);
      return;
    }

    if (!pendingMainGameAction) return;

    const action = pendingMainGameAction;
    const locationAtStart = mainGameLocationId;
    setPendingMainGameAction(null);

    const nextInventory =
      applyMainGameActionInventory(action.id, tutorialInventory) ??
      tutorialInventory;
    const success = executeMainGameAction(action);

    if (!success) {
      setIsMainGameAutoLoop(false);
      return;
    }

    if (action.timerSec > 0 && isAutoLoopEligibleAction(action.id)) {
      tryContinueMainGameAutoLoop(action, locationAtStart, nextInventory);
    }
  };

  const cancelMainGameAction = () => {
    mainGameCancelledRef.current = true;
    setIsMainGameAutoLoop(false);
    setIsMainGameActionRunning(false);
    setMainGameTimerLeft(null);
    setPendingMainGameAction(null);
    setPendingMainGameTravel(null);
    addMessage("[SYSTEM] Action cancelled.");
    setRecentSystemNotice("Action cancelled.");
  };

  const handleMainGameAction = (action: MainGameAction) => {
    if (isMainGameActionRunning) return;

    if (
      action.requiredHandItem &&
      equippedGear.Hand !== action.requiredHandItem
    ) {
      const notice = getRequiredHandItemNotice(action);
      addMessage(`[ERROR] ${notice}`);
      setRecentSystemNotice(notice);
      return;
    }

    if (
      isProductionAction(action.id) &&
      !canAffordMainGameAction(action.id, tutorialInventory)
    ) {
      const cost = getMainGameActionRecipeCost(action.id);
      const costText = Object.entries(cost)
        .map(([item, qty]) => `${item} x${qty}`)
        .join(", ");
      addMessage(`[ERROR] Fabrication requires ${costText}.`);
      return;
    }

    if (
      !isProductionAction(action.id) &&
      isInventoryFullForAction(action.id, tutorialInventory)
    ) {
      addMessage("[ERROR] Inventory full. Cannot start gathering.");
      setRecentSystemNotice("Inventory full. Clear space to continue.");
      return;
    }

    mainGameCancelledRef.current = false;
    setIsMainGameAutoLoop(isAutoLoopEligibleAction(action.id));

    addMessage(`[ACTION] ${action.label} started.`);
    setRecentRewardMessages([]);
    setRecentSystemNotice(null);
    setPendingMainGameTravel(null);

    if (action.timerSec > 0) {
      setPendingMainGameAction(action);
      setMainGameTimerLeft(getEffectiveBuildTimer(action.timerSec));
      setIsMainGameActionRunning(true);
      return;
    }

    executeMainGameAction(action);
  };

  const handleMainGameTravel = (destination: MainGameTravelLink) => {
    if (isMainGameActionRunning) return;

    mainGameCancelledRef.current = false;
    setIsMainGameAutoLoop(false);
    setShowStarChart(false);
    setShowCodexPanel(false);
    addMessage(`[NAV] Traveling to ${destination.label}...`);
    setRecentRewardMessages([]);
    setRecentSystemNotice(null);
    setPendingMainGameAction(null);
    setPendingMainGameTravel(destination);
    setMainGameTimerLeft(getEffectiveBuildTimer(destination.timerSec));
    setIsMainGameActionRunning(true);
  };

  const commandTourSteps = [
    {
      title: "Welcome to Astrum Drift",
      text: "This is your command interface. From here, you’ll complete actions, follow training directives, manage gear, and track your progress.",
    },
    {
      title: "Location & Actions",
      text: "The left panel shows your current location, travel routes, available actions, and utility tools like Messages, Star Chart, Codex, Forum, and Settings.",
    },
    {
      title: "Training Directive",
      text: "The center panel is your main activity area. It shows your current objective, action progress, story moments, and combat events.",
    },
    {
      title: "Profile View",
      text: "The right panel lets you switch between Gear Loadout, Skill Matrix, Cargo Manifest, and Ship Systems.",
    },
    {
      title: "Inventory Summary",
      text: "This area shows what you are personally carrying. Use the expand button to open your full inventory.",
    },
    {
      title: "Player Chat",
      text: "Switch between Global, Trade, Clan, Help, and Staff channels. Staff chat is visible only to moderators, guides, and admins.",
    },
    {
      title: "Begin Training",
      text: "You’re ready to begin. Follow the Training Directive in the center panel to continue your Outpost One training.",
    },
  ];

  const currentCommandTourStep = commandTourSteps[commandTourStep];

  const closeCommandTour = () => {
    if (!player) return;
    localStorage.setItem(`astrumCommandTourSeen_${player.username}`, "true");
    setShowCommandTour(false);
  };

  const openStarChart = () => {
    if (!isTutorialComplete) return;
    closeCommandTour();
    setShowStarChart(true);
  };

  const closeLaunchIntro = () => {
    if (!player) return;
    localStorage.setItem(`astrumLaunchIntroSeen_${player.username}`, "true");
    setShowLaunchIntro(false);
  };
  const getCommandTourFocus = () => {
    if (!showCommandTour || showLaunchIntro) return null;

    switch (commandTourStep) {
      case 1:
        return "left";
      case 2:
        return "directive";
      case 3:
        return "profile";
      case 4:
        return "inventory";
      case 5:
        return "chat";
      case 6:
        return null;
      default:
        return null;
    }
  };

  const getCommandTourHighlightClass = (section: string) => {
    const focus = getCommandTourFocus();

    if (focus !== section) return "";

    return "relative z-[70] rounded-xl bg-background/90 ring-2 ring-chart-2 ring-inset shadow-[0_0_30px_rgba(255,190,80,0.55)]";
  };

  const getCommandTourColumnLiftClass = (section: string) => {
    const focus = getCommandTourFocus();

    if (section === "right" && (focus === "profile" || focus === "inventory")) {
      return "relative z-[60]";
    }

    return "";
  };
  const toggleInventoryGroup = (groupTitle: string) => {
    setExpandedInventoryGroups((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };
  const equipInventoryItem = (itemName: string) => {
    const availableQuantity = getAvailableInventoryQuantity(itemName);

    if (availableQuantity <= 0) {
      setRecentSystemNotice(`${itemName} is not available to equip.`);
      return;
    }

    if (itemName === "Training Blade") {
      setEquippedGear((prev) => ({
        ...prev,
        Hand: "Training Blade",
      }));

      setRecentSystemNotice(
        "Training Blade equipped. You are ready to engage the drone.",
      );

      addMessage("[SYSTEM] Training Blade equipped from inventory.");
      return;
    }

    if (isHandEquipItem(itemName) && itemName !== "Training Blade") {
      setEquippedGear((prev) => ({
        ...prev,
        Hand: itemName,
      }));

      setRecentSystemNotice(
        `${itemName} equipped. Hand slot controls active actions.`,
      );
      addMessage(`[SYSTEM] ${itemName} equipped from inventory.`);
      return;
    }

    setRecentSystemNotice(`${itemName} cannot be equipped from here yet.`);
  };
  const inventoryGroups = [
    {
      title: "Ores",
      items: [...MATERIAL_INVENTORY_GROUPS.Ores],
    },
    {
      title: "Bars",
      items: [...MATERIAL_INVENTORY_GROUPS.Bars],
    },
    {
      title: "Harvest",
      items: [...MATERIAL_INVENTORY_GROUPS.Harvest],
    },
    {
      title: "Salvage",
      items: [...MATERIAL_INVENTORY_GROUPS.Salvage],
    },
    {
      title: "Consumables",
      items: ["Life Support Gel"],
    },
    {
      title: "Equipment",
      items: [
        "Training Tool",
        "Training Cutter",
        "Training Harvester",
        "Training Salvage Tool",
        "Training Repair Kit",
        "Training Blade",
        "Basic Weapon",
        "Basic Suit",
        "Basic Mining Tool",
        "Basic Harvesting Tool",
        "Basic Salvage Tool",
        "Basic Repair Kit",
      ],
    },
    {
      title: "Vehicles",
      items: ["Starter Shuttle", "Basic Rover", "Training Rover Repaired"],
    },
  ];

  const addRewardMessage = (message: string) => {
    setRecentRewardMessages([message]);
    setLastRewardStepId(currentTutorialStep.id);
  };
  const resetTrainingCombat = () => {
    setPlayerHealth(100);
    setEnemyHealth(60);
    setCombatMessage(null);
    setIsInCombat(false);
    setIsCombatRoundRunning(false);
    setCombatTimerLeft(null);
  };
  const useLifeSupportGelFromCombatPanel = () => {
    if (!requiresPostCombatHeal) return;

    const gelCount = tutorialInventory["Life Support Gel"] ?? 0;

    if (gelCount < 1) {
      setRecentSystemNotice("Life Support Gel required to complete recovery.");
      addMessage("[ERROR] You need 1 Life Support Gel to recover.");
      return;
    }

    const healAmount = 10;
    const nextHealth = Math.min(playerMaxHealth, playerHealth + healAmount);
    const actualHeal = nextHealth - playerHealth;
    setPlayerHealth(nextHealth);

    setTutorialInventory((prev) => ({
      ...prev,
      "Life Support Gel": Math.max(0, (prev["Life Support Gel"] ?? 0) - 1),
    }));

    setRequiresPostCombatHeal(false);
    setPostCombatRecoveryComplete(true);

    setCombatMessage(
      `Life Support Gel applied. Health restored by ${actualHeal}. Recovery complete.`,
    );

    setRecentSystemNotice(
      "Recovery complete. Proceed to the next training route.",
    );
    setRecentRewardMessages([]);
    setCurrentTutorialActionCount(0);
    setTutorialTimerLeft(null);
    setIsTutorialActionRunning(false);

    addMessage(
      `[SYSTEM] Life Support Gel used. Health restored by ${actualHeal}.`,
    );
    addMessage("[TUTORIAL] Combat recovery complete.");
  };
  const continueAfterPostCombatRecovery = () => {
    if (!postCombatRecoveryComplete) return;

    setPostCombatRecoveryComplete(false);
    setRequiresPostCombatHeal(false);
    setEnemyHealth(60);
    setCombatMessage(null);
    setRecentSystemNotice(null);
    setRecentRewardMessages([]);

    setCurrentTutorialStepIndex((prevStep) => prevStep + 1);
  };
  const startTrainingCombatRound = () => {
    if (currentTutorialStep.id !== "defeat_training_drone") return;
    if (isCombatRoundRunning) return;

    if (equippedGear.Hand !== "Training Blade") {
      setRecentSystemNotice(
        "Equip the Training Blade before engaging the drone.",
      );
      addMessage("[ERROR] Training Blade must be equipped before combat.");
      return;
    }

    setRecentRewardMessages([]);
    setIsInCombat(true);
    setCombatMessage("Combat engaged. Training Drone is hostile.");
    setCombatTimerLeft(getEffectiveBuildTimer(currentTutorialStep.timerSec ?? 5));
    setIsCombatRoundRunning(true);
  };

  const resolveTrainingCombatRound = () => {
    if (currentTutorialStep.id !== "defeat_training_drone") return;

    const playerDamage = Math.floor(Math.random() * 9) + 12; // 12-20
    const droneDamage = Math.floor(Math.random() * 6) + 3; // 3-8

    const nextEnemyHealth = Math.max(0, enemyHealth - playerDamage);

    if (nextEnemyHealth <= 0) {
      setEnemyHealth(0);
      setCombatMessage(
        `You hit the Training Drone for ${playerDamage}. Target disabled. Use Life Support Gel to complete recovery.`,
      );

      addMessage(
        `[COMBAT] You hit the Training Drone for ${playerDamage}. Target disabled.`,
      );

      setIsInCombat(false);
      setIsCombatRoundRunning(false);
      setCombatTimerLeft(null);
      completeTutorialAction();
      return;
    }

    const nextPlayerHealth = Math.max(0, playerHealth - droneDamage);

    if (nextPlayerHealth <= 0) {
      setPlayerHealth(100);
      setEnemyHealth(60);
      setCombatMessage(
        "Training failure. Medical systems restored you. Drone reset.",
      );
      addMessage("[COMBAT] Training failure. Health restored and drone reset.");

      setIsInCombat(false);
      setIsCombatRoundRunning(false);
      setCombatTimerLeft(null);
      return;
    }

    setEnemyHealth(nextEnemyHealth);
    setPlayerHealth(nextPlayerHealth);

    setCombatMessage(
      `You hit the Training Drone for ${playerDamage}. It hits you for ${droneDamage}.`,
    );

    addMessage(
      `[COMBAT] You hit the Training Drone for ${playerDamage}. Drone hit you for ${droneDamage}.`,
    );

    setCombatTimerLeft(getEffectiveBuildTimer(currentTutorialStep.timerSec ?? 5));
    setIsCombatRoundRunning(true);
  };

  const completeTutorialAction = () => {
    if (!currentTutorialStep) return;

    addMessage(
      `[TUTORIAL] ${currentTutorialStep.actionLabel ?? currentTutorialStep.objective} complete.`,
    );

    if (currentTutorialStep.id === "mine_iron_ore") {
      setTutorialInventory((prev) => ({
        ...prev,
        "Iron Ore": (prev["Iron Ore"] ?? 0) + 3,
      }));

      addMessage("[REWARD] Iron Ore x3 added to tutorial inventory.");
      addRewardMessage("Iron Ore x3");
    }
    if (currentTutorialStep.id === "refine_iron_ore") {
      const ironOreCount = tutorialInventory["Iron Ore"] ?? 0;

      if (ironOreCount < 3) {
        addMessage("[ERROR] You need 3 Iron Ore to refine Refined Iron.");
        return;
      }

      setTutorialInventory((prev) => ({
        ...prev,
        "Iron Ore": prev["Iron Ore"] - 3,
        "Refined Iron": (prev["Refined Iron"] ?? 0) + 1,
      }));

      addMessage("[REWARD] Iron Ore refined into Refined Iron x1.");
      addRewardMessage("Refined Iron x1");
    }
    if (currentTutorialStep.id === "harvest_bio_samples") {
      setTutorialInventory((prev) => ({
        ...prev,
        "Bio Fiber": (prev["Bio Fiber"] ?? 0) + 2,
        "Basic Chemical": (prev["Basic Chemical"] ?? 0) + 1,
      }));

      addMessage(
        "[REWARD] Bio Fiber x2 and Basic Chemical x1 added to tutorial inventory.",
      );
      addRewardMessage("Bio Fiber x2 | Basic Chemical x1");
    }

    if (currentTutorialStep.id === "fabricate_training_blade") {
      const refinedIronCount = tutorialInventory["Refined Iron"] ?? 0;

      if (refinedIronCount < 2) {
        addMessage(
          "[ERROR] You need 2 Refined Iron to fabricate the Training Blade.",
        );
        return;
      }

      setTutorialInventory((prev) => ({
        ...prev,
        "Refined Iron": prev["Refined Iron"] - 2,
        "Training Blade": (prev["Training Blade"] ?? 0) + 1,
      }));

      addMessage("[REWARD] Training Blade fabricated.");
      addRewardMessage("Training Blade x1");
    }

    if (currentTutorialStep.id === "synthesize_life_support_gel") {
      const bioFiberCount = tutorialInventory["Bio Fiber"] ?? 0;
      const basicChemicalCount = tutorialInventory["Basic Chemical"] ?? 0;

      if (bioFiberCount < 2 || basicChemicalCount < 1) {
        addMessage(
          "[ERROR] You need 2 Bio Fiber and 1 Basic Chemical to synthesize Life Support Gel.",
        );
        return;
      }

      setTutorialInventory((prev) => ({
        ...prev,
        "Bio Fiber": prev["Bio Fiber"] - 2,
        "Basic Chemical": prev["Basic Chemical"] - 1,
        // Tutorial bonus: normal production should create only 1 Life Support Gel at a time.
        "Life Support Gel": (prev["Life Support Gel"] ?? 0) + 1,
      }));

      addMessage("[REWARD] Life Support Gel x1 synthesized.");
      addRewardMessage("Life Support Gel x1");
    }

    if (currentTutorialStep.id === "defeat_training_drone") {
      setTutorialInventory((prev) => ({
        ...prev,
        "Damaged Scrap": (prev["Damaged Scrap"] ?? 0) + 1,
        Credits: (prev["Credits"] ?? 0) + 25,
      }));

      setTargetIntel((prev) => ({
        ...prev,
        "Training Drone": Math.min(100, (prev["Training Drone"] ?? 0) + 1),
      }));

      setRequiresPostCombatHeal(true);
      setRecentSystemNotice(
        "Training Drone disabled. Use Life Support Gel from the combat panel to recover.",
      );

      addMessage(
        "[REWARD] Training Drone defeated. Damaged Scrap x1 and Credits x25 received.",
      );

      addRewardMessage("Damaged Scrap x1 | Credits x25");

      return;
    }

    if (currentTutorialStep.id === "salvage_wreckage") {
      setTutorialInventory((prev) => ({
        ...prev,
        "Salvage Parts": (prev["Salvage Parts"] ?? 0) + 5,
      }));

      addMessage("[REWARD] Salvage Parts x5 recovered.");
      addRewardMessage("Salvage Parts x5");
    }

    if (currentTutorialStep.id === "repair_training_rover") {
      const salvagePartsCount = tutorialInventory["Salvage Parts"] ?? 0;

      if (salvagePartsCount < 5) {
        addMessage(
          "[ERROR] You need 5 Salvage Parts to repair the Training Rover.",
        );
        return;
      }

      setTutorialInventory((prev) => ({
        ...prev,
        "Salvage Parts": prev["Salvage Parts"] - 5,
        "Training Rover Repaired": 1,
      }));

      addMessage("[REWARD] Salvage Parts consumed. Training Rover repaired.");
      setRecentSystemNotice(
        "Training Rover repaired. You can now proceed to the Outpost Shop.",
      );
      addRewardMessage("Training Rover Repaired");
    }

    if (currentTutorialStep.id === "sell_damaged_scrap") {
      const damagedScrapCount = tutorialInventory["Damaged Scrap"] ?? 0;

      if (damagedScrapCount < 1) {
        addMessage(
          "[ERROR] You need 1 Damaged Scrap to sell to the NPC vendor.",
        );
        return;
      }

      setTutorialInventory((prev) => ({
        ...prev,
        "Damaged Scrap": prev["Damaged Scrap"] - 1,
        Credits: (prev["Credits"] ?? 0) + 10,
      }));

      addMessage(
        "[REWARD] Damaged Scrap sold to the Outpost vendor. Credits x10 received.",
      );
      addRewardMessage("Credits x10");
    }

    if (currentTutorialStep.id === "complete_tutorial") {
      setTutorialInventory({
        "Basic Weapon": 1,
        "Basic Suit": 1,
        "Basic Mining Tool": 1,
        "Basic Harvesting Tool": 1,
        "Basic Salvage Tool": 1,
        "Starter Shuttle": 1,
        "Basic Rover": 1,
        "Life Support Gel": 5,
        "Basic Repair Kit": 1,
        Credits: 500,
      });

      setIsTutorialComplete(true);
      setMainGameLocationId(MAIN_GAME_START_LOCATION);
      setEquippedGear({
        Helmet: null,
        Hand: "Basic Mining Tool",
        Suit: "Basic Suit",
        "Module 1": null,
        "Module 2": null,
      });

      addMessage("[SYSTEM] Outpost One training complete.");
      addMessage(
        "[SYSTEM] Temporary training equipment has been returned to Outpost One.",
      );
      addMessage("[NAV] Arrived at Outpost One Main Spaceport.");
      addMessage("[REWARD] Official starter kit issued.");
      setRecentSystemNotice(
        "Training complete. Welcome to Outpost One Main Spaceport.",
      );
      addRewardMessage("Official Starter Kit Issued");
      return;
    }

    const requiredCompletions = currentTutorialStep.requiredCompletions ?? 1;
    const nextActionCount = currentTutorialActionCount + 1;

    if (nextActionCount < requiredCompletions) {
      setCurrentTutorialActionCount(nextActionCount);
      addMessage(
        `[TUTORIAL] Progress: ${nextActionCount}/${requiredCompletions}`,
      );

      const nextTimer = getEffectiveBuildTimer(currentTutorialStep.timerSec ?? 0);

      if (nextTimer > 0) {
        setTutorialTimerLeft(nextTimer);
        setIsTutorialActionRunning(true);
      }

      return;
    }

    setCurrentTutorialActionCount(0);
    setTutorialTimerLeft(null);
    setIsTutorialActionRunning(false);

    setCurrentTutorialStepIndex((prevStep) => {
      const nextStep = prevStep + 1;

      if (nextStep >= tutorialSteps.length) {
        return prevStep;
      }

      return nextStep;
    });
  };
  const resetTutorialProgress = () => {
    setCurrentTutorialStepIndex(0);
    setCurrentTutorialActionCount(0);

    setTutorialInventory({
      "Training Tool": 1,
      "Training Cutter": 1,
      "Training Harvester": 1,
      "Training Salvage Tool": 1,
      "Training Repair Kit": 1,
    });

    setEquippedGear({
      Helmet: null,
      Hand: "Training Tool",
      Suit: "Training Suit",
      "Module 1": null,
      "Module 2": null,
    });

    setPlayerHealth(100);
    setEnemyHealth(60);
    setTargetIntel({
      "Training Drone": 0,
    });

    setCombatMessage(null);
    setIsInCombat(false);
    setIsCombatRoundRunning(false);
    setCombatTimerLeft(null);
    setRequiresPostCombatHeal(false);
    setPostCombatRecoveryComplete(false);

    setIsTutorialComplete(false);
    setMainGameLocationId(MAIN_GAME_START_LOCATION);
    setShowStarChart(false);
    setMarketPanelView(null);
    setShowCodexPanel(false);
    setSkillXp(createDefaultSkillXp());
    setIsMainGameActionRunning(false);
    setMainGameTimerLeft(null);
    setPendingMainGameAction(null);
    setPendingMainGameTravel(null);
    setIsMainGameAutoLoop(false);
    mainGameCancelledRef.current = false;
    setIsTutorialActionRunning(false);
    setTutorialTimerLeft(null);

    setRecentRewardMessages([]);
    setRecentSystemNotice(null);
    setLastRewardStepId(null);

    setProfileView("gear");
    setShowFullInventory(false);
    setShowShipCargoManifest(false);
    setShowStationStorage(false);
    setShowSettingsPanel(false);

    addMessage("[SYSTEM] Tutorial progress reset.");
  };
  const jumpToTutorialStep = (stepIndex: number) => {
    setCurrentTutorialStepIndex(stepIndex);
    setCurrentTutorialActionCount(0);
    setTutorialTimerLeft(null);
    setIsTutorialActionRunning(false);
    setRecentRewardMessages([]);
    setLastRewardStepId(null);
    setPlayerHealth(100);
    setEnemyHealth(60);
    setCombatMessage(null);
    setIsInCombat(false);
    setIsCombatRoundRunning(false);
    setCombatTimerLeft(null);
  };
  
  const saveTutorialProgressToServer = async (
    tutorialProgress: TutorialSaveData,
  ) => {
    try {
      const response = await fetch("/api/players/tutorial-progress", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ tutorialProgress }),
      });

      if (response.status === 409) {
        const data = (await response.json()) as {
          tutorialProgress?: Partial<TutorialSaveData> | null;
          progressVersion?: number;
        };

        if (data.tutorialProgress?.tutorialInventory) {
          setTutorialInventory(data.tutorialProgress.tutorialInventory);
        }

        if (typeof data.progressVersion === "number") {
          lastProgressVersionRef.current = data.progressVersion;
        }

        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        addMessage("[SYSTEM] Server progress refreshed after staff update.");
        return;
      }
    } catch {
      // Keep localStorage as fallback if the server save fails.
    }
  };
  const handleTutorialAction = () => {
    if (!currentTutorialStep || isTutorialActionRunning || isTutorialComplete)
      return;

    console.log("Tutorial action started:", currentTutorialStep);

    if (lastRewardStepId !== currentTutorialStep.id) {
      setRecentRewardMessages([]);
      setRecentSystemNotice(null);
    }

    addMessage(
      `[TUTORIAL] ${currentTutorialStep.actionLabel ?? currentTutorialStep.objective} started.`,
    );

    if (currentTutorialStep.id === "complete_tutorial") {
      addMessage(
        "[NAV] Departing training spaceport for Outpost One Main Spaceport...",
      );
    }

    const timer = getEffectiveBuildTimer(currentTutorialStep.timerSec ?? 0);

    if (timer > 0) {
      setTutorialTimerLeft(timer);
      setIsTutorialActionRunning(true);
      return;
    }

    completeTutorialAction();
  };

  useEffect(() => {
    if (meError) {
      setLocation("/");
    }
  }, [meError, setLocation]);

  useEffect(() => {
    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const possibleVersionPaths = ["/game/version.json", "/version.json"];

        let version: string | null = null;

        for (const path of possibleVersionPaths) {
          const response = await fetch(`${path}?ts=${Date.now()}`, {
            cache: "no-store",
          });

          if (!response.ok) continue;

          const data = (await response.json()) as { version?: string };

          if (data.version) {
            version = data.version;
            break;
          }
        }

        if (!version || cancelled) return;

        setLoadedAppVersion((currentVersion) => {
          if (!currentVersion) {
            return version;
          }

          if (version !== currentVersion) {
            setIsUpdateAvailable(true);
          }

          return currentVersion;
        });
      } catch {
        // Ignore update-check errors so gameplay is not affected.
      }
    };

    checkForUpdate();

    const intervalId = window.setInterval(checkForUpdate, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);
  useEffect(() => {
    if (!isTutorialActionRunning || tutorialTimerLeft === null) return;

    if (tutorialTimerLeft <= 0) {
      setIsTutorialActionRunning(false);
      completeTutorialAction();
      return;
    }

    const timer = window.setTimeout(() => {
      setTutorialTimerLeft((prev) => {
        if (prev === null) return null;

        return Math.max(0, Number((prev - 0.05).toFixed(2)));
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isTutorialActionRunning, tutorialTimerLeft]);
  useEffect(() => {
    if (!isMainGameActionRunning || mainGameTimerLeft === null) return;

    if (mainGameTimerLeft <= 0) {
      setIsMainGameActionRunning(false);
      setMainGameTimerLeft(null);
      completeMainGameAction();
      return;
    }

    const timer = window.setTimeout(() => {
      setMainGameTimerLeft((prev) => {
        if (prev === null) return null;

        return Math.max(0, Number((prev - 0.05).toFixed(2)));
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isMainGameActionRunning, mainGameTimerLeft]);
  useEffect(() => {
    if (!isCombatRoundRunning || combatTimerLeft === null) return;

    if (combatTimerLeft <= 0) {
      resolveTrainingCombatRound();
      return;
    }

    const timer = window.setTimeout(() => {
      setCombatTimerLeft((prev) => {
        if (prev === null) return null;

        return Math.max(0, Number((prev - 0.05).toFixed(2)));
      });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [isCombatRoundRunning, combatTimerLeft]);
  // Initial welcome message
  useEffect(() => {
    if (player && messages.length === 0) {
      addMessage(
        `[SYSTEM] Authentication successful. Welcome aboard, Commander ${player.username}.`,
      );
      addMessage(
        `[SYSTEM] Ship systems online. Current location: ${
          player.currentLocation === "Earth Orbit"
            ? "Outpost One"
            : player.currentLocation
        }.`,
      );
    }
  }, [player, messages.length]);

  useEffect(() => {
    if (!player?.username) return;

    const launchIntroSeen =
      localStorage.getItem(`astrumLaunchIntroSeen_${player.username}`) ===
      "true";

    const commandTourSeen =
      localStorage.getItem(`astrumCommandTourSeen_${player.username}`) ===
      "true";

    setShowLaunchIntro(!launchIntroSeen);
    setShowCommandTour(!commandTourSeen);
  }, [player?.username]);
  useEffect(() => {
    if (!player?.username) return;

    let cancelled = false;

    const applySavedProgress = (saved: Partial<TutorialSaveData>) => {
      if (
        saved.version !== 1 &&
        saved.version !== 2 &&
        saved.version !== 3 &&
        saved.version !== 4
      ) {
        return;
      }

      if (
        typeof saved.currentTutorialStepIndex === "number" &&
        saved.currentTutorialStepIndex >= 0 &&
        saved.currentTutorialStepIndex < tutorialSteps.length
      ) {
        setCurrentTutorialStepIndex(saved.currentTutorialStepIndex);
      }

      if (typeof saved.currentTutorialActionCount === "number") {
        setCurrentTutorialActionCount(saved.currentTutorialActionCount);
      }

      if (saved.tutorialInventory && typeof saved.tutorialInventory === "object") {
        setTutorialInventory(saved.tutorialInventory);
      }

      if (typeof saved.playerHealth === "number") {
        setPlayerHealth(saved.playerHealth);
      }

      if (typeof saved.enemyHealth === "number") {
        setEnemyHealth(saved.enemyHealth);
      }

      if (saved.targetIntel && typeof saved.targetIntel === "object") {
        setTargetIntel(saved.targetIntel);
      }

      if (saved.equippedGear && typeof saved.equippedGear === "object") {
        setEquippedGear(saved.equippedGear);
      }

      if (typeof saved.requiresPostCombatHeal === "boolean") {
        setRequiresPostCombatHeal(saved.requiresPostCombatHeal);
      }

      if (typeof saved.postCombatRecoveryComplete === "boolean") {
        setPostCombatRecoveryComplete(saved.postCombatRecoveryComplete);
      }

      if (typeof saved.isTutorialComplete === "boolean") {
        setIsTutorialComplete(saved.isTutorialComplete);
      }

      if (saved.mainGameLocationId) {
        setMainGameLocationId(
          normalizeMainGameLocationId(saved.mainGameLocationId),
        );
      } else if (saved.isTutorialComplete) {
        setMainGameLocationId(MAIN_GAME_START_LOCATION);
      }

      if (saved.skillXp && typeof saved.skillXp === "object") {
        setSkillXp({
          ...createDefaultSkillXp(),
          ...saved.skillXp,
        });
      }

      if (Array.isArray(saved.recentRewardMessages)) {
        setRecentRewardMessages(saved.recentRewardMessages);
      }

      if (
        typeof saved.recentSystemNotice === "string" ||
        saved.recentSystemNotice === null
      ) {
        setRecentSystemNotice(saved.recentSystemNotice);
      }

      if (
        typeof saved.lastRewardStepId === "string" ||
        saved.lastRewardStepId === null
      ) {
        setLastRewardStepId(saved.lastRewardStepId);
      }
    };

    const loadTutorialProgress = async () => {
      setIsTutorialSaveLoaded(false);

      const saveKey = `astrumTutorialProgress_${player.username}`;

      try {
        const response = await fetch("/api/players/tutorial-progress", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const data = (await response.json()) as {
            tutorialProgress?: Partial<TutorialSaveData> | null;
            progressVersion?: number;
          };

          const serverVersion = data.progressVersion ?? 0;
          let localVersion = 0;
          const rawLocalSave = localStorage.getItem(saveKey);
          if (rawLocalSave) {
            try {
              localVersion =
                (JSON.parse(rawLocalSave) as Partial<TutorialSaveData>)
                  .progressVersion ?? 0;
            } catch {
              localVersion = 0;
            }
          }

          if (!cancelled && data.tutorialProgress) {
            applySavedProgress(data.tutorialProgress);
            setIsTutorialSaveLoaded(true);
            return;
          }

          if (!cancelled && serverVersion >= localVersion) {
            setIsTutorialSaveLoaded(true);
            return;
          }
        }
      } catch {
        // Fall back to localStorage below.
      }

      const rawSave = localStorage.getItem(saveKey);

      if (!rawSave) {
        if (!cancelled) {
          setIsTutorialSaveLoaded(true);
        }
        return;
      }

      try {
        const saved = JSON.parse(rawSave) as Partial<TutorialSaveData>;

        if (!cancelled) {
          applySavedProgress(saved);
        }
      } catch {
        localStorage.removeItem(saveKey);
      } finally {
        if (!cancelled) {
          setIsTutorialSaveLoaded(true);
        }
      }
    };

    loadTutorialProgress();

    return () => {
      cancelled = true;
    };
  }, [player?.username]);

  useEffect(() => {
    if (!player?.username) return;

    const interval = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [player?.username, queryClient]);

  useEffect(() => {
    if (!player?.username || !isTutorialSaveLoaded) return;

    const version = player.progressVersion ?? 0;
    if (lastProgressVersionRef.current === null) {
      lastProgressVersionRef.current = version;
      return;
    }

    if (version <= lastProgressVersionRef.current) return;

    lastProgressVersionRef.current = version;

    void (async () => {
      try {
        const response = await fetch("/api/players/tutorial-progress", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          tutorialProgress?: Partial<TutorialSaveData> | null;
          progressVersion?: number;
        };

        if (data.tutorialProgress?.tutorialInventory) {
          setTutorialInventory(data.tutorialProgress.tutorialInventory);
        }

        if (typeof data.progressVersion === "number") {
          lastProgressVersionRef.current = data.progressVersion;
        }

        await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        addMessage("[SYSTEM] Staff compensation applied — inventory refreshed.");
        setRecentSystemNotice("Account updated by admin support.");
      } catch {
        // Ignore refresh errors; next poll will retry.
      }
    })();
  }, [
    player?.progressVersion,
    player?.username,
    isTutorialSaveLoaded,
    queryClient,
  ]);
    useEffect(() => {
      if (!player?.username || !isTutorialSaveLoaded) return;

      const saveKey = `astrumTutorialProgress_${player.username}`;

      const saveData: TutorialSaveData = {
        version: TUTORIAL_SAVE_VERSION,
        progressVersion: player.progressVersion ?? 0,
        currentTutorialStepIndex,
        currentTutorialActionCount,
        tutorialInventory,
        playerHealth,
        enemyHealth,
        targetIntel,
        equippedGear,
        requiresPostCombatHeal,
        postCombatRecoveryComplete,
        isTutorialComplete,
        mainGameLocationId,
        skillXp,
        recentRewardMessages,
        recentSystemNotice,
        lastRewardStepId,
      };

      localStorage.setItem(saveKey, JSON.stringify(saveData));

      const saveDelay = window.setTimeout(() => {
        void saveTutorialProgressToServer(saveData);
      }, 500);

      return () => {
        window.clearTimeout(saveDelay);
      };
    }, [
      player?.username,
      player?.progressVersion,
      isTutorialSaveLoaded,
      currentTutorialStepIndex,
      currentTutorialActionCount,
      tutorialInventory,
      playerHealth,
      enemyHealth,
      targetIntel,
      equippedGear,
      requiresPostCombatHeal,
      postCombatRecoveryComplete,
      isTutorialComplete,
      mainGameLocationId,
      skillXp,
      recentRewardMessages,
      recentSystemNotice,
      lastRewardStepId,
    ]);

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
  if (showLaunchIntro) {
    return (
      <div className="h-[100dvh] nebula-bg text-foreground flex flex-col relative font-mono overflow-hidden">
        <div className="nebula-stars" />

        <div className="absolute inset-0">
          <img
            src={earthLaunchIntroImg}
            alt="Earth evacuation launch"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/25 to-black/10" />
        </div>

        {introPhase === "image" && (
          <div className="relative z-10 flex-1 flex items-end justify-center p-6">
            <div className="glass-panel border border-primary/30 rounded-xl p-4 max-w-3xl w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-widest">
                Final evacuation shuttle departing Earth...
              </p>

              <Button
                variant="outline"
                onClick={() => setIntroPhase("broadcast")}
                className="font-mono uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {introPhase === "broadcast" && (
          <div className="relative z-10 flex-1 flex items-center justify-center p-6">
            <div className="glass-panel border border-destructive/40 rounded-xl p-6 md:p-8 max-w-3xl w-full">
              <p className="text-xs uppercase tracking-widest text-destructive mb-2">
                Emergency Transmission
              </p>

              <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-primary mb-4">
                Earth Fall Protocol
              </h1>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
                Commander {player.username}, Earth has fallen. Your evacuation
                shuttle has cleared the atmosphere and is being redirected to
                Outpost One for survival training and placement.
              </p>

              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex justify-between border border-primary/10 rounded-lg bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground uppercase tracking-widest">
                    Status
                  </span>
                  <span className="text-destructive uppercase tracking-widest">
                    EVACUATION CONFIRMED
                  </span>
                </div>

                <div className="flex justify-between border border-primary/10 rounded-lg bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground uppercase tracking-widest">
                    Shuttle
                  </span>
                  <span className="text-primary uppercase tracking-widest">
                    ORBITAL TRANSIT
                  </span>
                </div>

                <div className="flex justify-between border border-primary/10 rounded-lg bg-background/40 px-3 py-2">
                  <span className="text-muted-foreground uppercase tracking-widest">
                    Destination
                  </span>
                  <span className="text-chart-2 uppercase tracking-widest">
                    Outpost One
                  </span>
                </div>
              </div>

              <div className="mt-6 flex justify-between items-center gap-4">
                <p className="text-xs text-muted-foreground">
                  Arriving at training zone...
                </p>

                <Button
                  variant="outline"
                  onClick={closeLaunchIntro}
                  className="font-mono uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
                >
                  PROCEED...
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="min-h-[100dvh] nebula-bg text-foreground flex flex-col relative font-mono overflow-hidden">
      <div className="nebula-stars" />

      {/* Header */}
      <header className="border-b border-primary/20 glass-panel px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3 z-10">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold uppercase tracking-widest text-primary text-glow">
            Astrum Drift
          </h1>
        </div>

        <div className="flex justify-center">
          {isUpdateAvailable && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-chart-2/60 bg-chart-2/10 px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-chart-2 shadow-[0_0_16px_rgba(255,190,80,0.35)] hover:bg-chart-2/20"
              title="Refresh to load the latest update"
            >
              Update Available
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-primary/80 justify-end">
          <span className="hidden md:inline-block tracking-wider uppercase">
            <span className="text-muted-foreground mr-2">CMDR</span>
            {player.username}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="border-destructive/50 text-destructive hover:bg-destructive/20 font-mono uppercase tracking-widest h-8 w-8 p-0"
            onClick={onLogout}
            disabled={logoutMutation.isPending}
            title="Disconnect"
            aria-label="Disconnect"
          >
            <Power className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {inboxUnreadCount > 0 && !showMessagesPanel && (
        <button
          type="button"
          onClick={() => setShowMessagesPanel(true)}
          className="z-20 mx-3 mt-2 lg:mx-4 rounded-lg border border-chart-2/40 bg-chart-2/10 px-3 py-2 text-left hover:bg-chart-2/15 transition-colors"
        >
          <p className="text-[10px] text-chart-2 uppercase tracking-widest font-bold">
            Inbox — {inboxUnreadCount} unread message
            {inboxUnreadCount === 1 ? "" : "s"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Tap to open Messages and read system notices from Admin or Moderation.
          </p>
        </button>
      )}

      {isStaffRole(player?.role) &&
        pendingReportCount > 0 &&
        !showModerationPanel && (
          <button
            type="button"
            onClick={() => setShowModerationPanel(true)}
            className="z-20 mx-3 mt-2 lg:mx-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left hover:bg-destructive/15 transition-colors"
          >
            <p className="text-[10px] text-destructive uppercase tracking-widest font-bold">
              Moderation — {pendingReportCount} pending report
              {pendingReportCount === 1 ? "" : "s"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tap to open Staff Moderation and review player reports.
            </p>
          </button>
        )}

      {hasMobileStatusAlert && mobilePanel !== "action" && (
        <div className="lg:hidden z-20 px-3 pt-3">
          <div className="glass-panel border border-chart-2/50 rounded-lg px-3 py-2 shadow-[0_0_18px_rgba(255,190,80,0.35)]">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-chart-2 uppercase tracking-widest font-bold">
                  {mobileStatusAlertText}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`text-sm font-bold uppercase tracking-widest ${getHealthTextColor()}`}
                  >
                    HP {playerHealth}/{playerMaxHealth}
                  </span>

                  {mobileStatusTimerText && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      • {mobileStatusTimerText}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,6.5fr)_minmax(0,3fr)] gap-4 p-3 pb-24 lg:p-4 lg:pb-4 overflow-y-auto lg:overflow-hidden">
        {/* Left Column: Location & Navigation */}
        <div
          className={`${
            mobilePanel === "location" ? "flex" : "hidden"
          } lg:flex flex-col gap-4 min-h-0 lg:h-full lg:overflow-hidden ${getCommandTourHighlightClass("left")}`}
        >
          <div className="glass-panel p-3 flex flex-col gap-3 rounded-lg h-full">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                Location
              </p>
              <h2 className="text-xl font-bold text-primary uppercase tracking-widest">
                {displayLocationName}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {displayZoneName}
              </p>
            </div>
            {/* Dev Only: Tutorial Step Jump */}
            {import.meta.env.DEV &&
              ["Bizkiteater", "Tester1"].includes(player.username) && (
                <div className="border-t border-primary/20 pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                    Dev Tutorial Jump
                  </p>

                  <select
                    value={currentTutorialStepIndex}
                    onChange={(event) =>
                      jumpToTutorialStep(Number(event.target.value))
                    }
                    className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs text-primary font-mono uppercase tracking-widest outline-none hover:border-primary/40"
                  >
                    {tutorialSteps.map((step, index) => (
                      <option key={step.id} value={index}>
                        {index + 1}. {step.objective}
                      </option>
                    ))}
                  </select>
                </div>
              )}

            <div className="border-t border-primary/20 pt-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                Available Actions
              </p>

              <div className="flex flex-col gap-1.5">
                {isTutorialComplete ? (
                  <>
                    {currentMainGameLocation.actions.map((action) => (
                      <Button
                        key={action.id}
                        onClick={() => handleMainGameAction(action)}
                        disabled={isMainGameActionRunning}
                        variant="outline"
                        className="hidden lg:flex justify-start h-auto min-h-9 whitespace-normal text-left leading-tight text-[11px] font-mono uppercase tracking-wide border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-1.5 px-3"
                      >
                        {action.label}
                      </Button>
                    ))}
                    {locationHubActions.map((action) => (
                      <Button
                        key={action.id}
                        onClick={() => setMarketPanelView(action.id === "speak_vendor" ? "npc" : "player")}
                        disabled={isMainGameActionRunning}
                        variant="outline"
                        className="hidden lg:flex justify-start h-auto min-h-9 whitespace-normal text-left leading-tight text-[11px] font-mono uppercase tracking-wide border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-1.5 px-3"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </>
                ) : (
                  currentTutorialStep.actionLabel && (
                      <Button
                        onClick={
                          currentTutorialStep.id === "defeat_training_drone"
                            ? startTrainingCombatRound
                            : handleTutorialAction
                        }
                        disabled={
                          isTutorialActionRunning ||
                          isInCombat ||
                          requiresPostCombatHeal ||
                          postCombatRecoveryComplete ||
                          (currentTutorialStep.id === "defeat_training_drone" &&
                            equippedGear.Hand !== "Training Blade")
                        }
                        title={
                          currentTutorialStep.id === "defeat_training_drone" &&
                          equippedGear.Hand !== "Training Blade"
                            ? "Equip the Training Blade from Inventory Summary before engaging the drone."
                            : undefined
                        }
                        variant="outline"
                        className="hidden lg:flex justify-start h-auto min-h-9 whitespace-normal text-left leading-tight text-[11px] font-mono uppercase tracking-wide border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-1.5 px-3"
                      >
                        {currentTutorialStep.actionLabel}
                      </Button>
                  )
                )}
              </div>
            </div>

            {isTutorialComplete &&
              (currentMainGameLocation.travelDestinations.length > 0 ||
                (currentMainGameLocation.lockedPlanetDepartures?.length ?? 0) >
                  0) && (
                <div className="border-t border-primary/20 pt-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                    Travel
                  </p>

                  <div className="flex flex-col gap-1.5">
                    {currentMainGameLocation.travelDestinations.map(
                      (destination) => (
                        <Button
                          key={destination.locationId}
                          type="button"
                          onClick={() => handleMainGameTravel(destination)}
                          disabled={isMainGameActionRunning}
                          variant="outline"
                          className="justify-start h-auto min-h-8 whitespace-normal text-left leading-tight text-[11px] font-mono uppercase tracking-wide border-primary/40 text-primary hover:bg-primary/10 py-1.5 px-3"
                        >
                          {destination.label} · {getEffectiveBuildTimer(destination.timerSec)}s
                        </Button>
                      ),
                    )}
                    {currentMainGameLocation.lockedPlanetDepartures?.map(
                      (locked) => (
                        <Button
                          key={locked.planetId}
                          type="button"
                          disabled
                          variant="outline"
                          title={locked.lockedReason}
                          className="justify-start h-auto min-h-8 whitespace-normal text-left leading-tight text-[11px] font-mono uppercase tracking-wide border-primary/20 text-muted-foreground opacity-50 cursor-not-allowed py-1.5 px-3"
                        >
                          {locked.label} · {locked.lockedReason}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              )}

            <div className="border-t border-primary/20 pt-4 mt-auto">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                Utility
              </p>

              <div className="flex flex-col gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMessagesPanel(true)}
                  className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                >
                  Messages
                  {inboxUnreadCount > 0 && (
                    <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-chart-2 px-1 text-[9px] font-bold text-background">
                      {inboxUnreadCount > 99 ? "99+" : inboxUnreadCount}
                    </span>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isTutorialComplete}
                  onClick={openStarChart}
                  className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed px-3"
                  title={
                    isTutorialComplete
                      ? "View area maps for the Verdant Rim"
                      : "Complete tutorial training to unlock the Star Chart"
                  }
                >
                  Star Chart
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCodexPanel(true)}
                  className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                >
                  Codex
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                >
                  Forum
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSettingsPanel(true)}
                  className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                >
                  Settings
                </Button>

                {isStaffRole(player?.role) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowModerationPanel(true)}
                    className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                  >
                    <span className="flex items-center gap-2 w-full">
                      Staff Moderation
                      {pendingReportCount > 0 && (
                        <span className="ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/80 px-1 text-[9px] font-bold text-background">
                          {pendingReportCount > 99 ? "99+" : pendingReportCount}
                        </span>
                      )}
                    </span>
                  </Button>
                )}

                {isAdminRole(player?.role) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPlayerSupportPanel(true)}
                    className="justify-start h-8 text-[11px] font-mono uppercase tracking-wide border-primary/30 text-primary hover:bg-primary/10 px-3"
                  >
                    Player Support
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Viewport & Stats */}
        <div
          className={`${
            mobilePanel === "action" || mobilePanel === "chat"
              ? "flex"
              : "hidden"
          } lg:flex flex-col gap-4 min-h-0 lg:h-full overflow-y-auto custom-scrollbar`}
        >
          <div
            className={`${mobilePanel === "action" ? "block" : "hidden"} lg:block`}
          >
            {isInCombat ||
            requiresPostCombatHeal ||
            postCombatRecoveryComplete ? (
              <div className="glass-panel border border-destructive/30 rounded-lg overflow-hidden h-full flex flex-col">
                <div className="relative h-[42vh] min-h-[240px] max-h-[360px] bg-black overflow-hidden">
                  <img
                    src={trainingDroneCombatImg}
                    alt="Training Drone combat encounter"
                    className="w-full h-full object-cover opacity-85"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-black/40" />

                  <div className="absolute top-4 left-4 right-4 z-20 text-center">
                    <h2 className="text-2xl font-bold text-destructive uppercase tracking-widest">
                      Training Drone
                    </h2>

                    <div className="mt-3 max-w-md mx-auto">
                      <div className="flex justify-between text-xs uppercase tracking-widest mb-1">
                        <span className="text-muted-foreground">
                          Enemy Health
                        </span>
                        <span className="text-destructive font-bold">
                          {enemyHealth}/60
                        </span>
                      </div>
                      <Progress
                        value={(enemyHealth / 60) * 100}
                        className="h-3 [&>div]:bg-destructive"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-chart-2/20 bg-background/50 px-3 py-2">
                  <Progress
                    value={
                      combatTimerLeft !== null
                        ? Math.max(
                            0,
                            Math.min(
                              100,
                              (combatTimerLeft /
                                getEffectiveBuildTimer(
                                  currentTutorialStep.timerSec ?? 5,
                                )) *
                                100,
                            ),
                          )
                        : 0
                    }
                    className="h-2 [&>div]:bg-chart-2"
                  />
                </div>
                <div className="p-3 space-y-3">
                  <div className="rounded-lg border border-primary/20 bg-background/60 px-3 py-3 text-center">
                    <p className="text-xs md:text-sm text-chart-2 font-bold uppercase tracking-widest leading-snug">
                      {combatMessage ?? "Combat systems engaged."}
                    </p>
                    {postCombatRecoveryComplete && (
                      <div className="rounded-lg border border-chart-2/30 bg-chart-2/10 px-3 py-3 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                          Recovery Complete
                        </p>

                        <p className="text-sm text-primary font-bold uppercase tracking-widest mb-3">
                          You are cleared to proceed.
                        </p>

                        <Button
                          variant="outline"
                          onClick={continueAfterPostCombatRecovery}
                          className="font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                        >
                          Continue
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                      <div className="flex justify-between text-xs uppercase tracking-widest mb-2">
                        <span className="text-muted-foreground">
                          Your Health
                        </span>
                        <span className={`font-bold ${getHealthTextColor()}`}>
                          {playerHealth}/{playerMaxHealth}
                        </span>
                      </div>
                      <Progress
                        value={(playerHealth / playerMaxHealth) * 100}
                        className="h-2 [&>div]:bg-primary"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-primary/20 bg-background/50 px-3 py-2">
                    <div className="rounded-lg border border-primary/20 bg-background/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                        Healing Items
                      </p>

                      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        {[
                          {
                            name: "Life Support Gel",
                            qty: tutorialInventory["Life Support Gel"] ?? 0,
                            heal: "+10 HP",
                          },
                          { name: "Med Foam Pack", qty: 0, heal: "+25 HP" },
                          { name: "Trauma Patch", qty: 0, heal: "+40 HP" },
                          { name: "Bio-Stabilizer", qty: 0, heal: "+60 HP" },
                        ].map((item) => {
                          const isLifeSupportGel =
                            item.name === "Life Support Gel";
                          const shouldHighlightItem =
                            isLifeSupportGel && shouldHighlightLifeSupportGel;

                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => {
                                if (isLifeSupportGel) {
                                  useLifeSupportGelFromCombatPanel();
                                }
                              }}
                              disabled={
                                item.qty <= 0 ||
                                !requiresPostCombatHeal ||
                                !isLifeSupportGel
                              }
                              className={`min-w-28 rounded-lg border px-2 py-2 text-left transition-all duration-200 disabled:opacity-40 ${
                                shouldHighlightItem
                                  ? "border-chart-2 bg-chart-2/10 ring-2 ring-chart-2/70 shadow-[0_0_18px_rgba(255,190,80,0.55)] animate-pulse"
                                  : "border-primary/20 bg-background/60 hover:bg-primary/10"
                              }`}
                              title={`${item.name} ${item.heal}`}
                            >
                              <div
                                className={`h-8 w-8 rounded border mb-1 flex items-center justify-center text-xs ${
                                  shouldHighlightItem
                                    ? "border-chart-2/70 bg-chart-2/20 text-chart-2"
                                    : "border-primary/20 bg-primary/10 text-primary"
                                }`}
                              >
                                +
                              </div>

                              <p
                                className={`text-[10px] uppercase tracking-widest leading-tight ${
                                  shouldHighlightItem
                                    ? "text-chart-2 font-bold"
                                    : "text-primary"
                                }`}
                              >
                                {item.name}
                              </p>

                              <p className="text-[10px] text-muted-foreground">
                                {item.heal}
                              </p>

                              <p className="text-xs text-chart-2 font-bold text-right">
                                {item.qty}
                              </p>

                              {shouldHighlightItem && (
                                <p className="mt-1 text-[9px] text-chart-2 uppercase tracking-widest font-bold">
                                  Click to use
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Viewport */}
                <div
                  className={`rounded-xl overflow-hidden ${getCommandTourHighlightClass("directive")}`}
                >
                  <div className="relative h-[34vh] border border-primary/30 bg-black box-glow overflow-hidden group rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20 z-10 pointer-events-none" />
                    {showMainGameViewportPlaceholder ? (
                      <SurveyArtPlaceholder
                        subtitle={displayLocationName}
                        className="absolute inset-0 z-0"
                      />
                    ) : (
                      <img
                        src={displayViewportImage}
                        alt={`${displayLocationName} viewport`}
                        className="w-full h-full object-cover opacity-80 mix-blend-screen scale-105 transition-transform duration-[20s] group-hover:scale-110 ease-linear"
                      />
                    )}

                    <div className="absolute top-4 right-4 z-20 flex items-center gap-2 glass-panel px-3 py-1.5 rounded-lg">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="uppercase tracking-widest text-sm text-primary">
                        Sensors Active
                      </span>
                    </div>

                    {/* Viewport Overlay HUD elements */}
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary/10 to-transparent z-10 pointer-events-none" />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/20 rounded-full flex items-center justify-center opacity-30 z-10 pointer-events-none">
                      <div className="w-1 h-2 bg-primary absolute top-0" />
                      <div className="w-1 h-2 bg-primary absolute bottom-0" />
                      <div className="h-1 w-2 bg-primary absolute left-0" />
                      <div className="h-1 w-2 bg-primary absolute right-0" />
                    </div>
                    {/* Training Directive Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 z-20 glass-panel border border-chart-2/30 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <p className="text-[10px] text-chart-2 uppercase tracking-widest font-bold">
                          {isTutorialComplete
                            ? "Command Directive"
                            : "Training Directive"}
                        </p>

                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {isTutorialComplete
                            ? "Main Game"
                            : `Step ${currentTutorialStepIndex + 1}/${tutorialSteps.length}`}
                        </span>
                      </div>

                      <p className="text-xs md:text-sm text-primary font-bold uppercase tracking-widest leading-snug">
                        {displayDirective}
                      </p>
                    </div>
                  </div>

                  {/* Skill Progress / Result Panel */}
                  <div className="glass-panel p-3 rounded-b-xl border border-primary/20 border-t-0">
                    {isInCombat ? (
                      <>
                        <div className="mb-3">
                          <p className="text-xs text-destructive uppercase tracking-widest mb-3">
                            Combat Encounter
                          </p>

                          {/* Enemy Health - primary focus */}
                          <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 mb-3">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-muted-foreground uppercase tracking-widest">
                                Training Drone
                              </span>
                              <span className="text-destructive font-bold">
                                {enemyHealth}/60
                              </span>
                            </div>

                            <Progress
                              value={(enemyHealth / 60) * 100}
                              className="h-3 [&>div]:bg-destructive"
                            />
                          </div>

                          {/* Player Health - secondary combat reference */}
                          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-muted-foreground uppercase tracking-widest">
                                Your Health
                              </span>
                              <span className="text-primary font-bold">
                                {playerHealth}/100
                              </span>
                            </div>

                            <Progress
                              value={playerHealth}
                              className="h-2 [&>div]:bg-primary"
                            />
                          </div>
                        </div>

                        <div className="bg-background/50 border border-chart-2/20 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-2">
                            <span className="text-muted-foreground">
                              Next Exchange
                            </span>
                            <span className="text-chart-2 font-bold">
                              {combatTimerLeft !== null
                                ? `${Math.ceil(combatTimerLeft)}s`
                                : "Ready"}
                            </span>
                          </div>

                          {combatMessage && (
                            <p className="text-xs text-chart-2 leading-relaxed mt-2">
                              {combatMessage}
                            </p>
                          )}
                        </div>
                      </>
                    ) : isMainGameActionRunning && mainGameTimerLeft !== null ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                              {activeSkill} Level
                            </p>
                            <p className="text-lg font-bold text-primary uppercase tracking-widest">
                              1
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                              Experience
                            </p>
                            <p className="text-xs text-chart-2 font-bold">
                              0/0
                            </p>
                          </div>
                        </div>

                        <Progress value={0} className="h-2 mb-3" />

                        <div className="bg-background/50 border border-primary/10 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-2">
                            <span className="text-muted-foreground">
                              {pendingMainGameTravel
                                ? "In Transit"
                                : (pendingMainGameAction?.label ?? "Action")}
                            </span>
                            <span className="text-chart-2 font-bold">
                              {Math.ceil(mainGameTimerLeft)}s
                            </span>
                          </div>

                          <Progress
                            value={
                              pendingMainGameTravel
                                ? Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (mainGameTimerLeft /
                                        getEffectiveBuildTimer(
                                          pendingMainGameTravel.timerSec,
                                        )) *
                                        100,
                                    ),
                                  )
                                : pendingMainGameAction
                                  ? Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        (mainGameTimerLeft /
                                          getEffectiveBuildTimer(
                                            pendingMainGameAction.timerSec,
                                          )) *
                                          100,
                                      ),
                                    )
                                  : 0
                            }
                            className="h-2"
                          />
                          {pendingMainGameTravel && (
                            <p className="text-xs text-primary uppercase tracking-widest text-center mt-3">
                              Chart course through the Verdant Rim...
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={cancelMainGameAction}
                            className="w-full mt-3 font-mono uppercase tracking-widest border-destructive/50 text-destructive hover:bg-destructive/10"
                          >
                            {pendingMainGameTravel ? "Cancel" : "Stop"}
                          </Button>
                        </div>
                      </>
                    ) : isTutorialActionRunning &&
                      tutorialTimerLeft !== null ? (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                              {activeSkill} Level
                            </p>
                            <p className="text-lg font-bold text-primary uppercase tracking-widest">
                              {activeSkill === "Mining"
                                ? (player?.miningLevel ?? 1)
                                : 1}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                              Experience
                            </p>
                            <p className="text-xs text-chart-2 font-bold">
                              0/0
                            </p>
                          </div>
                        </div>

                        <Progress value={0} className="h-2 mb-3" />

                        <div className="bg-background/50 border border-primary/10 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-widest mb-2">
                            <span className="text-muted-foreground">
                              {currentTutorialStep.type === "travel" ||
                              currentTutorialStep.id === "complete_tutorial"
                                ? "In Transit"
                                : currentTutorialStep.actionLabel}
                            </span>
                            <span className="text-chart-2 font-bold">
                              {Math.ceil(tutorialTimerLeft)}s
                            </span>
                          </div>

                          <Progress
                            value={
                              getEffectiveBuildTimer(
                                currentTutorialStep.timerSec ?? 0,
                              )
                                ? Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      (tutorialTimerLeft /
                                        getEffectiveBuildTimer(
                                          currentTutorialStep.timerSec ?? 0,
                                        )) *
                                        100,
                                    ),
                                  )
                                : 0
                            }
                            className="h-2"
                          />
                          {(currentTutorialStep.type === "travel" ||
                            currentTutorialStep.id === "complete_tutorial") && (
                            <p className="text-xs text-primary uppercase tracking-widest text-center mt-3">
                              {currentTutorialStep.id === "complete_tutorial"
                                ? "Departing training spaceport for Outpost One Main Spaceport..."
                                : "Moving through Outpost One training sector..."}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {recentRewardMessages.length === 0 &&
                          recentSystemNotice === null && (
                            <div className="bg-background/50 border border-primary/10 rounded-lg px-3 py-2">
                              <div className="text-center text-xs uppercase tracking-widest space-y-3">
                                <div>
                                  <p className="text-muted-foreground mb-1">
                                    Awaiting Command
                                  </p>
                                  <p className="text-primary">
                                    {idleCommandText}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                    {recentRewardMessages.length > 0 && (
                      <div className="bg-background/50 border border-chart-2/20 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                          You have obtained
                        </p>
                        <p className="text-sm text-chart-2 font-bold">
                          {recentRewardMessages[0]}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          {mobilePanel === "action" &&
            currentTutorialStep.actionLabel &&
            !isTutorialComplete &&
            !isTutorialActionRunning &&
            !isInCombat &&
            !requiresPostCombatHeal &&
            !postCombatRecoveryComplete && (
              <div className="lg:hidden bg-background/50 border border-chart-2/30 rounded-lg px-3 py-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Current Action
                </p>
                {shouldHighlightTrainingBladeEquip && (
                  <p className="mb-3 text-[10px] text-chart-2 uppercase tracking-widest leading-relaxed">
                    Equip the Training Blade from the Character tab before
                    fighting.
                  </p>
                )}
                <Button
                  type="button"
                  onClick={
                    currentTutorialStep.id === "defeat_training_drone"
                      ? startTrainingCombatRound
                      : handleTutorialAction
                  }
                  disabled={
                    currentTutorialStep.id === "defeat_training_drone" &&
                    equippedGear.Hand !== "Training Blade"
                  }
                  title={
                    currentTutorialStep.id === "defeat_training_drone" &&
                    equippedGear.Hand !== "Training Blade"
                      ? "Equip the Training Blade from Inventory Summary before engaging the drone."
                      : undefined
                  }
                  variant="outline"
                  className="w-full justify-center h-auto min-h-12 whitespace-normal text-center leading-tight text-xs font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-3 px-4"
                >
                  {currentTutorialStep.actionLabel}
                </Button>
              </div>
            )}

          {mobilePanel === "action" &&
            isTutorialComplete &&
            isMainGameActionRunning &&
            mainGameTimerLeft !== null && (
              <div className="lg:hidden bg-background/50 border border-chart-2/30 rounded-lg px-3 py-3 text-center space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                  {pendingMainGameTravel
                    ? "In Transit"
                    : (pendingMainGameAction?.label ?? "Action")}
                </p>
                <p className="text-sm text-chart-2 font-bold uppercase tracking-widest">
                  {Math.ceil(mainGameTimerLeft)}s remaining
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelMainGameAction}
                  className="w-full font-mono uppercase tracking-widest border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  {pendingMainGameTravel ? "Cancel" : "Stop"}
                </Button>
              </div>
            )}

          {mobilePanel === "action" &&
            isTutorialComplete &&
            !isMainGameActionRunning &&
            (currentMainGameLocation.actions.length > 0 ||
              locationHubActions.length > 0) && (
              <div className="lg:hidden bg-background/50 border border-chart-2/30 rounded-lg px-3 py-3 text-center space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Current Action
                </p>
                {currentMainGameLocation.actions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    onClick={() => handleMainGameAction(action)}
                    variant="outline"
                    className="w-full justify-center h-auto min-h-12 whitespace-normal text-center leading-tight text-xs font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-3 px-4"
                  >
                    {action.label}
                  </Button>
                ))}
                {locationHubActions.map((action) => (
                  <Button
                    key={action.id}
                    type="button"
                    onClick={() =>
                      setMarketPanelView(
                        action.id === "speak_vendor" ? "npc" : "player",
                      )
                    }
                    variant="outline"
                    className="w-full justify-center h-auto min-h-12 whitespace-normal text-center leading-tight text-xs font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10 py-3 px-4"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

          {mobilePanel === "action" &&
            isTutorialComplete &&
            !isMainGameActionRunning &&
            currentMainGameLocation.actions.length === 0 &&
            locationHubActions.length === 0 && (
              <div className="lg:hidden bg-background/50 border border-primary/30 rounded-lg px-3 py-3 text-center space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                  Travel
                </p>
                <p className="text-xs text-primary mb-3">{idleCommandText}</p>
                {currentMainGameLocation.travelDestinations.map(
                  (destination) => (
                    <Button
                      key={destination.locationId}
                      type="button"
                      onClick={() => handleMainGameTravel(destination)}
                      variant="outline"
                      className="w-full font-mono uppercase tracking-widest border-primary/50 text-primary hover:bg-primary/10"
                    >
                      {destination.label} · {getEffectiveBuildTimer(destination.timerSec)}s
                    </Button>
                  ),
                )}
                {currentMainGameLocation.lockedPlanetDepartures?.map(
                  (locked) => (
                    <Button
                      key={locked.planetId}
                      type="button"
                      disabled
                      variant="outline"
                      title={locked.lockedReason}
                      className="w-full font-mono uppercase tracking-widest border-primary/20 text-muted-foreground opacity-50 cursor-not-allowed"
                    >
                      {locked.label} · {locked.lockedReason}
                    </Button>
                  ),
                )}
                <Button
                  type="button"
                  onClick={openStarChart}
                  variant="outline"
                  className="w-full font-mono uppercase tracking-widest border-primary/30 text-muted-foreground hover:bg-primary/10"
                >
                  View Star Chart
                </Button>
              </div>
            )}

          {recentSystemNotice !== null &&
            !isTutorialActionRunning &&
            !isMainGameActionRunning &&
            !isInCombat &&
            !isCombatRoundRunning &&
            !requiresPostCombatHeal &&
            !postCombatRecoveryComplete && (
              <div className="bg-background/50 border border-primary/10 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Equipment Updated
                </p>
                <p className="text-sm text-primary font-bold">
                  {recentSystemNotice}
                </p>
              </div>
            )}
          {/* Center Player Chat */}

          <div
            className={`${
              mobilePanel === "chat" ? "block" : "hidden"
            } lg:block mt-auto w-full p-[2px] ${getCommandTourHighlightClass("chat")}`}
          >
            {isChatOpen ? (
              <div className="glass-panel border border-primary/20 rounded-lg h-[58vh] min-h-[320px] lg:h-96 lg:min-h-0 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-primary/20 px-3 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="uppercase tracking-widest text-[10px] text-primary/70 shrink-0">
                      Player Chat
                    </h3>
                    {canShowStaffChatTag(player?.role) &&
                      activeChatChannel !== "clan" &&
                      activeChatChannel !== "staff" && (
                        <select
                          value={staffChatDisplayAs}
                          onChange={(event) =>
                            setStaffChatDisplayAs(
                              event.target.value as
                                | "self"
                                | "mod"
                                | "admin"
                                | "guide",
                            )
                          }
                          className="h-5 max-w-[5.5rem] rounded border border-primary/20 bg-background/60 px-1 text-[9px] text-foreground font-mono uppercase tracking-widest outline-none"
                          aria-label="Post chat as"
                        >
                          <option value="self">Self</option>
                          {player?.role === "guide" && (
                            <option value="guide">Guide</option>
                          )}
                          {(player?.role === "mod" || player?.role === "admin") && (
                            <option value="mod">Mod</option>
                          )}
                          {player?.role === "admin" && (
                            <option value="admin">Admin</option>
                          )}
                        </select>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    className="h-5 px-1.5 rounded border border-primary/20 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 shrink-0"
                  >
                    Hide
                  </button>
                </div>

                <div className="flex items-center gap-1 border-b border-primary/20 px-3 py-1 overflow-x-auto custom-scrollbar">
                  {visibleChatChannels.map((channel) => {
                    const channelStyle = CHAT_CHANNEL_STYLES[channel.id];
                    const isActive = activeChatChannel === channel.id;
                    const ChannelIcon = channel.Icon;

                    return (
                      <button
                        key={channel.id}
                        type="button"
                        aria-label={`${channel.label} chat`}
                        aria-current={isActive ? "true" : undefined}
                        onClick={() => {
                          setActiveChatChannel(channel.id);
                          setChatSendError(null);
                        }}
                        className={`inline-flex items-center gap-1 h-5 px-1.5 rounded border text-[9px] uppercase tracking-widest whitespace-nowrap shrink-0 ${
                          isActive ? channelStyle.tabActive : channelStyle.tabInactive
                        }`}
                      >
                        <ChannelIcon className="size-2.5 shrink-0" aria-hidden="true" />
                        {channel.label}
                      </button>
                    );
                  })}
                </div>

                <div className="border-b border-primary/20 px-3 py-1 flex flex-col gap-1 shrink-0">
                  {(muteMessage || chatSendError) && (
                    <p className="text-[9px] text-destructive uppercase tracking-widest leading-tight">
                      {muteMessage ?? chatSendError}
                    </p>
                  )}
                  <div className="flex gap-1.5">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatDraft}
                      onChange={(event) => {
                        setChatDraft(event.target.value);
                        if (chatSendError) setChatSendError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void sendChatMessage();
                        }
                      }}
                      disabled={!isChatInputEnabled}
                      placeholder={CHAT_CHANNEL_PLACEHOLDER[activeChatChannel]}
                      className="flex-1 h-7 bg-background/60 border border-primary/20 rounded-md px-2 text-[11px] text-foreground font-mono outline-none disabled:text-muted-foreground disabled:cursor-not-allowed"
                    />

                    <button
                      type="button"
                      onClick={() => void sendChatMessage()}
                      disabled={!isChatSendEnabled}
                      className="h-7 px-2.5 rounded-md border border-primary/20 text-primary text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:text-primary/40 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>

                <div
                  ref={chatScrollRef}
                  className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-1"
                >
                  {chatLoadErrorMessage ? (
                    <div className="text-xs text-destructive uppercase tracking-widest">
                      {chatLoadErrorMessage}
                    </div>
                  ) : liveChatMessages.length === 0 ? (
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">
                      {CHAT_CHANNEL_EMPTY_TEXT[activeChatChannel]}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {liveChatMessages.map((message) =>
                        renderChatMessage(message, activeChatChannel),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="glass-panel border border-primary/20 rounded-lg h-9 px-4 text-xs text-primary uppercase tracking-widest hover:bg-primary/10"
                >
                  Show Chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Console & Controls */}

        <div
          className={`${
            mobilePanel === "character" ? "flex" : "hidden"
          } lg:flex flex-col gap-4 min-h-0 lg:h-full overflow-y-auto custom-scrollbar ${getCommandTourColumnLiftClass("right")}`}
        >
          {/* Equipment Board */}

          <div className="glass-panel p-4 flex flex-col gap-4 flex-shrink-0 rounded-lg border border-primary/20">
            <div>
              <div
                className={`p-1 rounded-xl ${getCommandTourHighlightClass("profile")}`}
              >
                {/* Profile Toggle */}

                <div className="mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                      Profile View
                    </p>

                    <select
                      value={profileView}
                      onChange={(event) =>
                        setProfileView(
                          event.target.value as
                            | "gear"
                            | "skills"
                            | "cargo"
                            | "ship",
                        )
                      }
                      className="w-full h-8 bg-background/60 border border-primary/20 rounded-lg px-2 text-xs text-primary font-mono uppercase tracking-widest outline-none hover:border-primary/40"
                    >
                      <option value="gear">Gear Loadout</option>
                      <option value="skills">Skill Matrix</option>
                      <option value="cargo">Cargo Manifest</option>
                      <option value="ship">Ship Systems</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/20 bg-background/50 p-3 mb-1">
                  {profileView === "gear" && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Helmet */}
                        <div
                          className="equipment-board-slot"
                          title={equippedGear["Helmet"] ?? "Empty"}
                        >
                          <p className="equipment-board-label">Helmet</p>
                          <p className="equipment-board-value">
                            {equippedGear["Helmet"] ?? "Empty"}
                          </p>
                        </div>

                        {/* Target Intel */}
                        <div
                          className="equipment-board-slot equipment-board-intel"
                          title={
                            isInCombat
                              ? "Training Drone Proficiency"
                              : "No Target"
                          }
                        >
                          <p className="equipment-board-label">Target Intel</p>
                          <p className="equipment-board-value">
                            {activeTargetName ?? "No Target"}
                          </p>
                          <p className="equipment-board-subvalue">
                            {activeTargetIntel !== null
                              ? `${activeTargetIntel}%`
                              : "—"}
                          </p>
                        </div>

                        {/* Hand */}
                        <div
                          className="equipment-board-slot"
                          title={equippedGear["Hand"] ?? "Empty"}
                        >
                          <p className="equipment-board-label">Hand</p>
                          <p className="equipment-board-value">
                            {equippedGear["Hand"] ?? "Empty"}
                          </p>
                        </div>

                        {/* Suit */}
                        <div
                          className="equipment-board-slot"
                          title={equippedGear["Suit"] ?? "Empty"}
                        >
                          <p className="equipment-board-label">Suit</p>
                          <p className="equipment-board-value">
                            {equippedGear["Suit"] ?? "Empty"}
                          </p>
                        </div>

                        {/* Module 1 */}
                        <div
                          className="equipment-board-slot"
                          title={equippedGear["Module 1"] ?? "Empty"}
                        >
                          <p className="equipment-board-label">Module 1</p>
                          <p className="equipment-board-value">
                            {equippedGear["Module 1"] ?? "Empty"}
                          </p>
                        </div>

                        {/* Module 2 */}
                        <div
                          className="equipment-board-slot"
                          title={equippedGear["Module 2"] ?? "Empty"}
                        >
                          <p className="equipment-board-label">Module 2</p>
                          <p className="equipment-board-value">
                            {equippedGear["Module 2"] ?? "Empty"}
                          </p>
                        </div>
                      </div>

                      {/* Health */}
                      <div className="w-full mt-3 border-t border-primary/20 pt-3">
                        <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-background/40 px-3 py-2">
                          <span className="text-[12px] text-muted-foreground uppercase tracking-widest">
                            Health
                          </span>

                          <span
                            className={`text-sm font-bold tracking-widest ${getHealthTextColor()}`}
                          >
                            {playerHealth}/{playerMaxHealth}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {profileView === "skills" && (
                    <>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                        Skill Matrix
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        {MAIN_GAME_SKILLS.map((skill) => (
                          <div
                            key={skill.id}
                            className="flex justify-between text-xs bg-background/50 border border-primary/10 rounded-lg p-2"
                          >
                            <span className="text-primary">{skill.label}</span>
                            <span className="text-chart-2">
                              {skillXp[skill.id] ?? 0} XP
                            </span>
                          </div>
                        ))}

                        <div className="flex justify-between text-xs bg-background/50 border border-primary/10 rounded-lg p-2">
                          <span className="text-primary">Trading</span>
                          <span className="text-chart-2">0 XP</span>
                        </div>

                        <div className="flex justify-between text-xs bg-background/50 border border-primary/10 rounded-lg p-2">
                          <span className="text-primary">Tracking</span>
                          <span className="text-chart-2">0 XP</span>
                        </div>
                      </div>
                    </>
                  )}

                  {profileView === "cargo" && (
                    <>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                        Cargo Manifest
                      </p>

                      <div className="space-y-3">
                        {/* Active Ship Cargo */}
                        <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Active Ship Cargo
                            </p>

                            <button
                              type="button"
                              onClick={() => setShowShipCargoManifest(true)}
                              className="h-6 w-6 rounded border border-primary/20 text-primary text-xs hover:bg-primary/10"
                              title="Open Ship Cargo Manifest"
                            >
                              ↗
                            </button>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-primary">
                              Starter Shuttle
                            </span>
                            <span className="text-chart-3 font-bold">
                              0 / 25
                            </span>
                          </div>

                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">
                            Cargo Empty
                          </p>
                        </div>

                        {/* Station Storage */}
                        <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Station Storage
                            </p>

                            <button
                              type="button"
                              onClick={() => setShowStationStorage(true)}
                              className="h-6 w-6 rounded border border-primary/20 text-primary text-xs hover:bg-primary/10"
                              title="Open Station Storage"
                            >
                              ↗
                            </button>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-primary">
                              Universal Access
                            </span>
                            <span className="text-chart-3 font-bold">
                              0 / 100
                            </span>
                          </div>

                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-2">
                            Stored Items: Empty
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {profileView === "ship" && (
                    <>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                        Ship Systems
                      </p>

                      <div className="space-y-3">
                        <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-primary text-xs uppercase tracking-widest">
                              Starter Shuttle
                            </span>

                            <span className="text-chart-4 text-xs font-bold uppercase tracking-widest">
                              Active
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground uppercase tracking-widest">
                                Location
                              </span>
                              <span className="text-chart-4">Outpost One</span>
                            </div>

                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground uppercase tracking-widest">
                                Hull Integrity
                              </span>
                              <span className="text-chart-4">100%</span>
                            </div>

                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground uppercase tracking-widest">
                                Modules
                              </span>
                              <span className="text-chart-4">None</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-primary/10 bg-background/30 px-3 py-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground uppercase tracking-widest">
                              Fleet Registry
                            </span>
                            <span className="text-chart-4">1 Ship</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Currency */}
              <div className="pt-1">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
                  Currency
                </p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Credits</span>
                    <span className="text-chart-3 font-bold">
                      {(
                        tutorialInventory["Credits"] ?? player?.credits ?? 0
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">Silver Coins</span>
                      <button
                        type="button"
                        onClick={() => setShowDriftLounge(true)}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-primary/30 text-primary hover:bg-primary/10"
                        title="Open Drift Lounge"
                        aria-label="Open Drift Lounge"
                      >
                        <Dices className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-chart-3 font-bold">
                      {Math.max(
                        player?.silverCoins ?? 0,
                        tutorialInventory["Silver Coins"] ?? 0,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inventory Summary */}

              <div
                className={`border-t border-primary/20 pt-4 min-h-[220px] ${getCommandTourHighlightClass("inventory")}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    Inventory Summary
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowFullInventory(true)}
                    className="h-6 w-6 rounded border border-primary/20 text-primary text-xs hover:bg-primary/10"
                    title="Open Full Inventory"
                  >
                    ↗
                  </button>
                </div>

                <div className="space-y-2 min-h-[330px] max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {Object.entries(tutorialInventory).filter(
                    ([itemName]) =>
                      getAvailableInventoryQuantity(itemName) > 0 &&
                      itemName !== "Credits",
                  ).length === 0 ? (
                    <div className="text-xs text-muted-foreground uppercase tracking-widest">
                      Inventory Empty
                    </div>
                  ) : (
                    inventoryGroups.map((group) => {
                      const visibleItems = group.items.filter(
                        (itemName) =>
                          getAvailableInventoryQuantity(itemName) > 0,
                      );

                      if (visibleItems.length === 0) return null;

                      const isExpanded = expandedInventoryGroups[group.title];

                      return (
                        <div
                          key={group.title}
                          className="border border-primary/10 rounded-lg bg-background/30"
                        >
                          <button
                            type="button"
                            onClick={() => toggleInventoryGroup(group.title)}
                            className="w-full flex items-center justify-between px-2 py-2 text-left"
                          >
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              {group.title}
                            </span>

                            <span className="text-primary text-xs">
                              {isExpanded ? "▾" : "▸"}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-2 pb-2 space-y-1">
                              {visibleItems.slice(0, 8).map((itemName) => (
                                <div
                                  key={itemName}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  {isHandEquipItem(itemName) ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        equipInventoryItem(itemName)
                                      }
                                      className={`text-left transition-all ${
                                        itemName === "Training Blade" &&
                                        shouldHighlightTrainingBladeEquip
                                          ? "text-chart-2 font-bold drop-shadow-[0_0_8px_rgba(255,190,80,0.95)] animate-pulse"
                                          : equippedGear.Hand === itemName
                                            ? "text-chart-2 font-semibold"
                                            : "text-primary hover:text-chart-2 hover:underline"
                                      }`}
                                      title={`Equip ${itemName}`}
                                    >
                                      {itemName}
                                    </button>
                                  ) : (
                                    <span className="text-primary">
                                      {itemName}
                                    </span>
                                  )}

                                  <span className="text-chart-2">
                                    {getAvailableInventoryQuantity(itemName)}
                                  </span>
                                </div>
                              ))}

                              {visibleItems.length > 8 && (
                                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                  + {visibleItems.length - 8} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Command Console Log */}
            {false && (
              <div className="flex-1 glass-panel p-4 flex flex-col overflow-hidden relative rounded-lg">
                <h3 className="uppercase tracking-widest text-xs text-primary/60 border-b border-primary/20 pb-2 mb-2 sticky top-0">
                  Terminal Log
                </h3>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="text-xs break-words leading-relaxed opacity-90 hover:opacity-100 hover:bg-primary/5 p-1 transition-colors"
                    >
                      <span className="text-primary/70 mr-2">[{msg.time}]</span>
                      <span
                        className={
                          msg.text.includes("[ERROR]")
                            ? "text-destructive"
                            : msg.text.includes("[REWARD]") ||
                                msg.text.includes("[LEVEL UP]")
                              ? "text-chart-2 text-glow-amber"
                              : msg.text.includes("[SYSTEM]")
                                ? "text-primary/80"
                                : "text-primary"
                        }
                      >
                        {msg.text}
                      </span>
                    </div>
                  ))}
                  <div ref={logEndRef} className="h-1" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-primary/20 bg-background/95 backdrop-blur-md px-3 py-2">
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: "action", label: "Action" },
            { id: "character", label: "Character" },
            { id: "location", label: "Location" },
            { id: "chat", label: "Chat" },
          ].map((tab) => {
            const shouldHighlightTab =
              tab.id === "character" && shouldHighlightTrainingBladeEquip;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setMobilePanel(
                    tab.id as "action" | "character" | "location" | "chat",
                  )
                }
                className={`h-11 rounded-lg border text-[10px] font-mono uppercase tracking-widest transition-all ${
                  mobilePanel === tab.id
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_14px_rgba(75,241,255,0.35)]"
                    : "border-primary/20 bg-background/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                } ${
                  shouldHighlightTab
                    ? "border-chart-2/70 bg-chart-2/10 text-chart-2 shadow-[0_0_18px_rgba(255,190,80,0.45)] animate-pulse"
                    : ""
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
      {showCommandTour && !showLaunchIntro && (
        <div className="fixed inset-0 z-40 bg-black/70 pointer-events-none flex items-center justify-center px-4">
          <div className="glass-panel relative z-[70] pointer-events-auto border border-primary/30 rounded-xl w-full max-w-lg p-5 translate-y-32">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">
                Command Interface Tour
              </p>

              <span className="text-xs text-primary uppercase tracking-widest">
                {commandTourStep + 1}/{commandTourSteps.length}
              </span>
            </div>

            <h2 className="text-xl text-primary font-bold uppercase tracking-widest mb-3">
              {currentCommandTourStep.title}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {currentCommandTourStep.text}
            </p>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={closeCommandTour}
                className="font-mono uppercase tracking-widest border-primary/20 text-muted-foreground hover:bg-primary/10"
              >
                Skip
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={commandTourStep === 0}
                  onClick={() =>
                    setCommandTourStep((prev) => Math.max(0, prev - 1))
                  }
                  className="font-mono uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40"
                >
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (commandTourStep >= commandTourSteps.length - 1) {
                      closeCommandTour();
                      return;
                    }

                    setCommandTourStep((prev) => prev + 1);
                  }}
                  className="font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                >
                  {commandTourStep >= commandTourSteps.length - 1
                    ? "Start"
                    : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  System
                </p>
                <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
                  Settings
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-primary uppercase tracking-widest">
                      Command Interface Tour
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Replay the guided overview of the main game screen.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem(
                        `astrumCommandTourSeen_${player.username}`,
                      );
                      setCommandTourStep(0);
                      setShowSettingsPanel(false);
                      setShowCommandTour(true);
                    }}
                    className="font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                  >
                    Replay
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-destructive/20 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-destructive uppercase tracking-widest">
                      Reset Tutorial Progress
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Restart Outpost One training from the beginning. This will
                      clear tutorial inventory, rewards, combat progress, and
                      current training state.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={resetTutorialProgress}
                    className="font-mono uppercase tracking-widest border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-primary uppercase tracking-widest">
                      Launch Intro
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Replay the evacuation intro sequence.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => {
                      localStorage.removeItem(
                        `astrumLaunchIntroSeen_${player.username}`,
                      );
                      setIntroPhase("image");
                      setShowSettingsPanel(false);
                      setShowLaunchIntro(true);
                    }}
                    className="font-mono uppercase tracking-widest border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                  >
                    Replay
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                <div>
                  <p className="text-sm text-primary uppercase tracking-widest">
                    Ignored Chat Players
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hide messages from specific players. Admins and moderators
                    cannot be ignored. Guides can be ignored.
                  </p>
                  {chatIgnores.length === 0 ? (
                    <p className="text-xs text-muted-foreground mt-3 uppercase tracking-widest">
                      No ignored players.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {chatIgnores.map((ignored) => (
                        <li
                          key={ignored.playerId}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-xs font-mono text-foreground">
                            {ignored.username}
                          </span>
                          <button
                            type="button"
                            disabled={chatIgnoreSaving}
                            onClick={() =>
                              void handleUnignoreChatPlayer(
                                ignored.playerId,
                                ignored.username,
                              )
                            }
                            className="h-7 px-3 rounded border border-primary/20 text-primary/70 text-[10px] uppercase tracking-widest hover:bg-primary/10 disabled:opacity-50"
                          >
                            Unignore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {staffTagPreferenceCopy && (
                <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-primary uppercase tracking-widest">
                        {staffTagPreferenceCopy.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {staffTagPreferenceCopy.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={staffTagSaving}
                      onClick={() => {
                        if (!player) return;
                        setStaffTagSaving(true);
                        void updatePlayerPreferences(!player.showStaffChatTag)
                          .then((updated) => {
                            queryClient.setQueryData(getGetMeQueryKey(), updated);
                          })
                          .catch(() => {
                            setRecentSystemNotice(
                              "Failed to update staff chat tag preference.",
                            );
                          })
                          .finally(() => setStaffTagSaving(false));
                      }}
                      className={`relative h-6 w-11 rounded-full border transition-colors shrink-0 ${
                        player.showStaffChatTag
                          ? "border-chart-2 bg-chart-2/30"
                          : "border-primary/30 bg-background/60"
                      }`}
                      aria-label="Toggle staff chat tag"
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-primary transition-transform ${
                          player.showStaffChatTag ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showFullInventory && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Cargo Manifest
                </p>
                <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
                  Full Inventory
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowFullInventory(false)}
                className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              {inventoryGroups.map((group) => {
                const visibleItems = group.items.filter(
                  (itemName) => getAvailableInventoryQuantity(itemName) > 0,
                );

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.title}>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                      {group.title}
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                      {visibleItems.map((itemName) => (
                        <div
                          key={itemName}
                          className="flex justify-between border border-primary/10 bg-background/40 rounded-lg p-2 text-sm"
                        >
                          <span className="text-primary">{itemName}</span>
                          <span className="text-chart-2">
                            {getAvailableInventoryQuantity(itemName)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showShipCargoManifest && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Cargo Manifest
                </p>
                <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
                  Ship Cargo
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowShipCargoManifest(false)}
                className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary uppercase tracking-widest">
                    Starter Shuttle
                  </span>
                  <span className="text-chart-3 font-bold">0 / 25</span>
                </div>

                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Status: Active Ship
                </p>

                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                  Cargo Empty
                </p>
              </div>

              <div className="rounded-lg border border-primary/10 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Additional owned ships will appear here once acquired.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showStationStorage && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel border border-primary/30 rounded-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-primary/20 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Universal Storage
                </p>
                <h2 className="text-xl text-primary font-bold uppercase tracking-widest">
                  Station Storage
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowStationStorage(false)}
                className="h-8 px-3 rounded border border-destructive/40 text-destructive text-xs uppercase tracking-widest hover:bg-destructive/10"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="rounded-lg border border-primary/10 bg-background/40 p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-primary uppercase tracking-widest">
                    Station Storage
                  </span>
                  <span className="text-chart-3 font-bold">0 / 100</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Station storage is accessible from any space station location.
                </p>

                <p className="text-xs text-muted-foreground uppercase tracking-widest mt-3">
                  Stored Items: Empty
                </p>
              </div>

              <div className="rounded-lg border border-primary/10 bg-background/30 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  Materials, consumables, equipment, salvage, and ship parts
                  will appear here once stored.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {showStarChart && (
        <StarChartPanel
          currentLocationId={mainGameLocationId}
          getLocationImage={getMainGameImage}
          onClose={() => setShowStarChart(false)}
        />
      )}
      {marketPanelView && (
        <MarketPanel
          locationId={mainGameLocationId}
          view={marketPanelView}
          inventory={tutorialInventory}
          getAvailableQuantity={getAvailableInventoryQuantity}
          onNpcSell={handleNpcSell}
          onClose={() => setMarketPanelView(null)}
        />
      )}
      {showCodexPanel && (
        <CodexPanel onClose={() => setShowCodexPanel(false)} />
      )}
      {showModerationPanel && (
        <ModerationPanel
          canUnmute={isAdminRole(player?.role)}
          canClearChat={isAdminRole(player?.role)}
          canBan={isAdminRole(player?.role)}
          onClose={() => {
            setShowModerationPanel(false);
            void refreshPendingReportCount();
          }}
        />
      )}
      {showMessagesPanel && (
        <MessagesPanel
          onClose={() => setShowMessagesPanel(false)}
          onReportPlayer={() => setReportDialog({ username: "" })}
          onUnreadCountChange={setInboxUnreadCount}
          inboxUnreadCount={inboxUnreadCount}
          selfUsername={player?.username}
        />
      )}
      {showDriftLounge && player && (
        <DriftLoungePanel
          player={player}
          silverOreCount={tutorialInventory[SILVER_ORE_ITEM] ?? 0}
          onClose={() => setShowDriftLounge(false)}
          onPlayerUpdated={updatePlayerFromGambling}
          onMintOre={deductSilverOre}
          onRefundOre={refundSilverOre}
          onNotice={(message) => {
            addMessage(`[LOUNGE] ${message}`);
            setRecentSystemNotice(message);
          }}
        />
      )}
      {showPlayerSupportPanel && (
        <PlayerSupportPanel
          selfUsername={player?.username}
          onClose={() => setShowPlayerSupportPanel(false)}
          onNotice={(message) => {
            addMessage(`[ADMIN] ${message}`);
            setRecentSystemNotice(message);
          }}
          onGrantApplied={() => {
            inboxUnreadBaselineRef.current = null;
            void refreshInboxUnreadCount();
          }}
        />
      )}
      {reportDialog && (
        <ReportPlayerDialog
          defaultUsername={reportDialog.username}
          selfUsername={player?.username}
          channel={reportDialog.channel}
          messageId={reportDialog.messageId}
          onClose={() => setReportDialog(null)}
          onSubmitted={() => {
            setReportSubmittedNotice(
              "Report submitted. Staff will review it shortly.",
            );
          }}
        />
      )}
      {reportSubmittedNotice && (
        <div className="fixed bottom-4 right-4 z-[80] glass-panel border border-primary/20 rounded-lg px-4 py-3 max-w-sm">
          <p className="text-xs text-primary uppercase tracking-widest">
            {reportSubmittedNotice}
          </p>
          <button
            type="button"
            onClick={() => setReportSubmittedNotice(null)}
            className="mt-2 text-[10px] text-primary/70 uppercase tracking-widest hover:text-primary"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
