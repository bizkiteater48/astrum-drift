import type { CodexEntry } from "./types";

/** [combatLevel, name, family, profile, xp, hp, attack, defense, accuracyPct] */
const ENEMY_ROWS: readonly (readonly [
  number,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
  number,
])[] = [
  [1, "Rust Rat", "Vermin", "Training", 5, 10, 6, 0, 70],
  [2, "Dust Beetle", "Vermin", "Training", 5, 13, 7, 0, 70],
  [3, "Skitterling", "Crawler", "Training", 6, 16, 8, 0, 70],
  [4, "Broken Drone", "Drone", "Training", 7, 19, 8, 0, 70],
  [5, "Cave Rat", "Vermin", "Training", 9, 33, 18, 0, 70],
  [6, "Sand Mite", "Vermin", "Training", 9, 33, 19, 1, 70],
  [7, "Small Crawler", "Crawler", "Balanced", 13, 43, 21, 2, 80],
  [8, "Rock Beetle", "Vermin", "Tank", 17, 52, 19, 4, 78],
  [9, "Wire Chewer", "Vermin", "Training", 14, 44, 21, 1, 70],
  [10, "Patrol Drone", "Drone", "Balanced", 18, 53, 22, 2, 80],
  [11, "Bone Mite", "Vermin", "Training", 15, 50, 22, 1, 70],
  [12, "Sand Crawler", "Crawler", "Training", 20, 53, 22, 1, 70],
  [14, "Scrap Rat", "Vermin", "Training", 25, 59, 22, 1, 70],
  [16, "Tunnel Crawler", "Crawler", "Balanced", 30, 67, 24, 4, 80],
  [18, "Cave Skitter", "Crawler", "Dangerous", 40, 62, 32, 4, 82],
  [18, "Dustfang", "Wildlife", "Dangerous", 40, 62, 32, 4, 82],
  [20, "Wreck Rat", "Vermin", "Balanced", 40, 77, 26, 5, 80],
  [22, "Faulty Sentry", "Drone", "Balanced", 50, 103, 26, 6, 80],
  [24, "Ridge Beetle", "Vermin", "Tank", 65, 123, 26, 11, 78],
  [24, "Rockhide Beetle", "Vermin", "Tank", 65, 123, 26, 11, 78],
  [26, "Ash Crawler", "Wildlife", "Dangerous", 70, 103, 38, 5, 82],
  [28, "Cave Stalker", "Stalker", "Dangerous", 80, 106, 44, 6, 82],
  [30, "Ironjaw Stalker", "Stalker", "Balanced", 80, 127, 32, 8, 80],
  [30, "Faultline Crawler", "Crawler", "Tank", 90, 142, 32, 14, 78],
  [32, "Dust Lurker", "Wildlife", "Dangerous", 100, 152, 46, 6, 82],
  [34, "Rusted Patrol Drone", "Drone", "Balanced", 100, 181, 35, 8, 80],
  [36, "Ironjaw Brute", "Wildlife", "Tank", 130, 213, 36, 16, 78],
  [38, "Sandfang", "Wildlife", "Dangerous", 140, 166, 56, 8, 82],
  [40, "Ridge Hunter", "Wildlife", "Balanced", 135, 199, 42, 10, 80],
  [42, "Scrap Crawler", "Crawler", "Balanced", 155, 241, 43, 10, 80],
  [45, "Wreckborn", "Outlaw", "Balanced", 180, 250, 46, 11, 80],
  [45, "Security Drone", "Drone", "Dangerous", 200, 216, 62, 9, 82],
  [48, "Glass-Eyed Lurker", "Stalker", "Tank", 240, 295, 49, 22, 78],
  [50, "Hull Crawler", "Crawler", "Dangerous", 250, 232, 70, 10, 82],
  [52, "Thornback Razorback", "Wildlife", "Balanced", 250, 310, 53, 13, 80],
  [55, "Thornback", "Wildlife", "Dangerous", 315, 277, 75, 11, 82],
  [55, "Dust Raider", "Outlaw", "Tank", 325, 373, 53, 25, 78],
  [58, "Razorback", "Wildlife", "Tank", 365, 385, 60, 26, 78],
  [60, "Hull Walker", "Drone", "Tank", 390, 405, 60, 27, 78],
  [62, "Combat Drone", "Drone", "Balanced", 370, 393, 64, 16, 80],
  [62, "Ashscale Hunter", "Wildlife", "Dangerous", 410, 342, 84, 12, 82],
  [65, "Dust Enforcer", "Outlaw", "Dangerous", 460, 350, 89, 13, 82],
  [68, "Spined Hunter", "Wildlife", "Dangerous", 505, 357, 98, 14, 82],
  [70, "Glassback Crawler", "Crawler", "Balanced", 480, 429, 77, 18, 80],
  [72, "Shardkin", "Sporeborn", "Tank", 585, 526, 74, 32, 78],
  [75, "Cobalt War Drone", "Drone", "Elite", 715, 589, 93, 30, 85],
  [75, "Riftmaw Crawler", "Rift Creature", "Dangerous", 615, 385, 102, 15, 82],
  [78, "Ashfang", "Wildlife", "Dangerous", 670, 392, 104, 16, 82],
  [80, "Derelict Stalker", "Stalker", "Balanced", 635, 462, 80, 20, 80],
  [82, "Ironhide Razorback", "Wildlife", "Balanced", 665, 471, 81, 20, 80],
  [85, "Marauder Cutter", "Outlaw", "Tank", 825, 568, 78, 38, 78],
  [88, "Bloom Leech", "Sporeborn", "Dangerous", 860, 420, 109, 18, 82],
  [90, "Shardling", "Sporeborn", "Tank", 680, 585, 79, 40, 78],
  [92, "War Drone", "Drone", "Balanced", 840, 500, 84, 23, 80],
  [95, "Hollow Stalker", "Void Creature", "Elite", 1170, 666, 102, 38, 85],
  [95, "Void-Touched Crawler", "Rift Creature", "Dangerous", 1010, 441, 113, 19, 82],
  [98, "Rift Scarab", "Rift Creature", "Dangerous", 1075, 448, 115, 20, 82],
  [100, "Heavy War Drone", "Drone", "Balanced", 1000, 526, 86, 25, 80],
  [102, "Marauder Gunner", "Outlaw", "Tank", 1220, 621, 82, 46, 78],
  [106, "Boneplate Mauler", "Ancient Machine", "Balanced", 1180, 547, 88, 26, 80],
  [108, "Bloom Crawler", "Sporeborn", "Dangerous", 1390, 477, 120, 22, 82],
  [110, "Crystal Maw", "Ancient Machine", "Tank", 1495, 645, 84, 50, 78],
  [110, "Spore Crawler", "Sporeborn", "Tank", 1495, 645, 84, 50, 78],
  [114, "Ancient Sentry", "Ancient Machine", "Balanced", 1420, 650, 95, 28, 80],
  [118, "Rift Hound", "Rift Creature", "Tank", 1770, 771, 102, 53, 78],
  [120, "Shard Brute", "Sporeborn", "Dangerous", 1790, 582, 143, 24, 82],
  [122, "Hollow Fang", "Void Creature", "Dangerous", 1860, 621, 144, 24, 82],
  [126, "Derelict Hunter", "Ancient Machine", "Elite", 2325, 964, 128, 50, 85],
  [130, "Marauder Captain", "Outlaw", "Dangerous", 2185, 650, 159, 26, 82],
  [130, "Sporefang", "Sporeborn", "Tank", 2240, 903, 116, 58, 78],
  [134, "Bloom Horror", "Sporeborn", "Balanced", 2110, 766, 122, 34, 80],
  [138, "Ancient Drone", "Ancient Machine", "Dangerous", 2540, 673, 164, 28, 82],
  [140, "Rift Stalker", "Rift Creature", "Tank", 2700, 936, 118, 63, 78],
  [142, "Boneplate Ravager", "Ancient Machine", "Tank", 2805, 1027, 119, 64, 78],
  [146, "Crystal Ravager", "Ancient Machine", "Elite", 3405, 1170, 148, 58, 85],
  [150, "Wreckbound Horror", "Sporeborn", "Balanced", 2800, 907, 143, 38, 80],
  [150, "Void Hound", "Void Creature", "Tank", 3220, 1090, 137, 68, 78],
  [154, "Ancient Crawler", "Ancient Machine", "Dangerous", 3375, 829, 192, 31, 82],
  [158, "Riftborn Hunter", "Rift Creature", "Tank", 3710, 1163, 150, 71, 78],
  [160, "Nullfang", "Void Creature", "Tank", 3835, 1214, 151, 72, 78],
  [162, "Ancient Guardian", "Ancient Machine", "Dangerous", 3855, 869, 205, 32, 82],
  [166, "Voidstalker", "Void Creature", "Elite", 4765, 1381, 180, 66, 85],
  [170, "Riftborn Ravager", "Rift Creature", "Dangerous", 4395, 892, 210, 34, 82],
  [170, "Blackglass Stalker", "Void Creature", "Dangerous", 4395, 892, 210, 34, 82],
  [174, "Starved Maw", "Plasma Creature", "Tank", 4815, 1370, 154, 78, 78],
  [178, "Rift Maw", "Rift Creature", "Balanced", 4440, 1157, 184, 44, 80],
  [180, "Ancient Warden", "Ancient Machine", "Dangerous", 5115, 1017, 236, 36, 82],
  [182, "Riftborn Colossus", "Rift Creature", "Elite", 6100, 1620, 207, 73, 85],
  [186, "Ancient Executioner", "Ancient Machine", "Tank", 5690, 1469, 172, 84, 78],
  [190, "Plasma Wraith", "Plasma Creature", "Elite", 6760, 1659, 211, 76, 85],
  [190, "Solar Revenant", "Plasma Creature", "Tank", 5980, 1483, 173, 86, 78],
  [194, "Null Crawler", "Void Creature", "Dangerous", 6180, 1155, 254, 39, 82],
  [198, "Shardkin Devourer", "Sporeborn", "Elite", 7590, 1850, 243, 79, 85],
  [200, "Plasma Wraith", "Plasma Creature", "Elite", 7800, 1934, 244, 80, 85],
  [200, "Solar Revenant", "Plasma Creature", "Dangerous", 6720, 1205, 277, 40, 82],
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Provisional habitat until combat zones are wired in main-game.ts */
export function getProvisionalEnemyLocation(
  combatLevel: number,
  profile: string,
  family: string,
): string {
  if (profile === "Training") {
    return "Outpost One · training sectors";
  }

  switch (family) {
    case "Sporeborn":
      return combatLevel <= 90
        ? "Verdant Mire · Spore Fen"
        : "Verdant Mire · deep bio zones";
    case "Drone":
    case "Ancient Machine":
      return combatLevel <= 70
        ? "Scrapreach · Wreck Flats"
        : "Scrapreach · Hulk Yard";
    case "Outlaw":
      return combatLevel <= 90
        ? "Scrapreach · frontier routes"
        : "Obsidian Crown · outlaw trails";
    case "Rift Creature":
    case "Void Creature":
      return "Obsidian Crown · rift fields";
    case "Plasma Creature":
      return "Obsidian Crown · plasma rifts";
    default:
      break;
  }

  if (combatLevel <= 20) return "Aurelia Prime · Copper Flats";
  if (combatLevel <= 45) return "Aurelia Prime · surface routes";
  if (combatLevel <= 70) return "Verdant Mire · fen margins";
  if (combatLevel <= 95) return "Shimmer Coast · Silver Shallows";
  if (combatLevel <= 130) return "Shimmer Coast · Drift Arena";
  if (combatLevel <= 165) return "Obsidian Crown · Hunter's Ring";
  return "Obsidian Crown · deep frontier";
}

function buildEnemyEntry(
  row: readonly [number, string, string, string, number, number, number, number, number],
  index: number,
): CodexEntry {
  const [combatLevel, name, family, profile, xp] = row;
  const location = getProvisionalEnemyLocation(combatLevel, profile, family);
  const id = `enemy-${slugify(name)}-${combatLevel}-${index}`;

  return {
    id,
    category: "enemies",
    name,
    subtitle: `CL ${combatLevel} · ${xp} XP`,
    description: "",
    tags: [family.toLowerCase(), `cl-${combatLevel}`],
    stats: {
      CL: combatLevel,
      XP: xp,
      Location: location,
    },
  };
}

const BENCHMARK_ENEMIES = ENEMY_ROWS.map(buildEnemyEntry);

const TRAINING_DRONE: CodexEntry = {
  id: "enemy-training-drone",
  category: "enemies",
  name: "Training Drone",
  subtitle: "CL — · Tutorial XP",
  description: "",
  tags: ["training", "drone"],
  stats: {
    CL: "Tutorial",
    XP: "Tutorial",
    Location: "Outpost One · training yard",
  },
};

const FIELD_STUB_ENEMIES: CodexEntry[] = [
  {
    id: "enemy-balanced-opponent",
    category: "enemies",
    name: "Balanced Opponent",
    subtitle: "CL varies · Arena XP",
    description: "",
    tags: ["arena"],
    stats: {
      CL: "Varies",
      XP: "Varies",
      Location: "Shimmer Coast · Drift Arena",
    },
  },
  {
    id: "enemy-dangerous-hostile",
    category: "enemies",
    name: "Dangerous Hostile",
    subtitle: "CL varies · Frontier XP",
    description: "",
    tags: ["frontier"],
    stats: {
      CL: "Varies",
      XP: "Varies",
      Location: "Obsidian Crown · Hunter's Ring",
    },
  },
];

export const ENEMY_ENTRIES: CodexEntry[] = [
  TRAINING_DRONE,
  ...FIELD_STUB_ENEMIES,
  ...BENCHMARK_ENEMIES,
];
