import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAuditLog } from "@/services/auditService";
import type { UserRole } from "@/types";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // ── Discord OAuth ──────────────────────────────────────────────────────────
    Discord({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),

    // ── Credentials (email + password) ────────────────────────────────────────
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.active || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id:       user.id,
          email:    user.email ?? "",
          name:     user.username,
          role:     user.role as UserRole,
          image:    user.discordAvatar ?? null,
        };
      },
    }),
  ],

  callbacks: {
    // ── Called after successful OAuth sign-in ──────────────────────────────────
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as {
          id: string;
          username: string;
          email?: string;
          avatar?: string;
        };

        // Upsert user — create on first login, update avatar/username on subsequent logins
        const dbUser = await prisma.user.upsert({
          where:  { discordId: discordProfile.id },
          update: {
            username:      discordProfile.username,
            discordAvatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            ...(discordProfile.email ? { email: discordProfile.email } : {}),
          },
          create: {
            discordId:     discordProfile.id,
            username:      discordProfile.username,
            email:         discordProfile.email ?? null,
            discordAvatar: discordProfile.avatar
              ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
              : null,
            role:          "reseller",
            active:        true,
          },
        });

        // Ensure wallet exists
        await prisma.wallet.upsert({
          where:  { userId: dbUser.id },
          update: {},
          create: { userId: dbUser.id, balance: 0 },
        });

        // Audit log
        await createAuditLog({
          userId:   dbUser.id,
          action:   "discord_login",
          entity:   "user",
          entityId: dbUser.id,
          metadata: { discordId: discordProfile.id, username: discordProfile.username },
        });

        // Attach internal id and role to the user object for JWT
        user.id    = dbUser.id;
        (user as any).role = dbUser.role;
      }
      return true;
    },

    jwt({ token, user, account }) {
      if (user) {
        token.role      = (user as any).role ?? "reseller";
        token.discordId = (user as any).discordId;
      }
      if (account?.provider === "discord") {
        token.provider = "discord";
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        (session.user as any).id        = token.sub;
        (session.user as any).role      = token.role;
        (session.user as any).discordId = token.discordId;
        (session.user as any).provider  = token.provider;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
});
