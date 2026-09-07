import { readLocal, writeLocal } from "./demo-data";
import type { Role, User } from "./mock-db";

/**
 * Local demo identities used by the "try without signing up" mode.
 *
 * They never touch Supabase auth: the session lives in localStorage and every
 * write it makes is routed to the local demo storage (see demo-session.ts).
 * Owner/staff ids match the owner of the first demo club so the club
 * dashboards have something to show.
 */

export const DEMO_OWNER_ID = "demo-owner";
export const DEMO_CLUB_ID = "demo-cyberdome";

export type DemoRole = Extract<Role, "player" | "owner" | "clubAdmin">;

const DEMO_USERS: Record<DemoRole, User> = {
  player: {
    id: "demo-player",
    name: "Демо Игрок",
    email: "player@demo.hotshot",
    phone: "+7 700 000 00 01",
    role: "player",
    city: "Astana",
    avatarInitials: "ДИ",
  },
  owner: {
    id: DEMO_OWNER_ID,
    name: "Демо Владелец",
    email: "owner@demo.hotshot",
    phone: "+7 700 000 00 02",
    role: "owner",
    city: "Astana",
    avatarInitials: "ДВ",
  },
  clubAdmin: {
    id: "demo-staff",
    name: "Демо Админ клуба",
    email: "staff@demo.hotshot",
    phone: "+7 700 000 00 03",
    role: "clubAdmin",
    city: "Astana",
    avatarInitials: "ДА",
    clubId: DEMO_CLUB_ID,
  },
};

const KEY = "hsp-demo-user";

export const demoUserFor = (role: DemoRole): User => DEMO_USERS[role];

export const isDemoUserId = (id: string) => id.startsWith("demo-");

export function readDemoUser(): User | null {
  const role = readLocal<DemoRole | null>(KEY, null);
  return role && DEMO_USERS[role] ? DEMO_USERS[role] : null;
}

export function writeDemoUser(role: DemoRole | null) {
  writeLocal(KEY, role);
}
