"use client";
import { useSession } from "next-auth/react";
import type { SessionUser } from "@/types";

export function useCurrentUser(): { user: SessionUser | null; loading: boolean } {
  const { data: session, status } = useSession();

  if (status === "loading") return { user: null, loading: true };
  if (!session?.user)       return { user: null, loading: false };

  const u = session.user as any;
  return {
    user: {
      id:         u.id        ?? "",
      email:      u.email     ?? undefined,
      username:   u.name      ?? u.username ?? "",
      role:       u.role      ?? "reseller",
      discordId:  u.discordId ?? undefined,
      provider:   u.provider  ?? "credentials",
      image:      u.image     ?? undefined,
    },
    loading: false,
  };
}
