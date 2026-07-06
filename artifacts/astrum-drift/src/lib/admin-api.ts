import { customFetch } from "@workspace/api-client-react";
import type { Player } from "@workspace/api-client-react";

export type PlayerSupportSnapshot = {
  player: Player;
  inventory: Record<string, number>;
  progressVersion: number;
  creditsDesync: boolean;
  inventoryCredits: number;
};

export type AdminGrantRecord = {
  id: number;
  adminId: number;
  adminUsername: string;
  targetPlayerId: number;
  targetUsername: string;
  note: string;
  creditsDelta: number;
  silverCoinsDelta: number;
  items: Record<string, number>;
  createdAt: string;
};

export type GrantPlayerBody = {
  note: string;
  creditsDelta?: number;
  silverCoinsDelta?: number;
  items?: Record<string, number>;
};

export const ADMIN_ASSIGNABLE_ROLES = ["player", "mod", "guide"] as const;
export type AdminAssignableRole = (typeof ADMIN_ASSIGNABLE_ROLES)[number];

export function formatPlayerRoleLabel(role?: string | null): string {
  if (role === "mod") return "Moderator";
  if (role === "guide") return "Guide";
  if (role === "admin") return "Admin";
  return "Player";
}

export function isAdminRole(role?: string | null): boolean {
  return role === "admin";
}

export function getPlayerSupportSnapshot(username: string) {
  return customFetch<PlayerSupportSnapshot>(
    `/api/admin/players/${encodeURIComponent(username)}/snapshot`,
    { method: "GET" },
  );
}

export function grantToPlayer(username: string, body: GrantPlayerBody) {
  return customFetch<{ snapshot: PlayerSupportSnapshot }>(
    `/api/admin/players/${encodeURIComponent(username)}/grant`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export function listAdminGrants(limit = 25) {
  return customFetch<{ grants: AdminGrantRecord[] }>(
    `/api/admin/grants?limit=${limit}`,
    { method: "GET" },
  );
}

export function updatePlayerRole(username: string, role: AdminAssignableRole) {
  return customFetch<{ snapshot: PlayerSupportSnapshot }>(
    `/api/admin/players/${encodeURIComponent(username)}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    },
  );
}
