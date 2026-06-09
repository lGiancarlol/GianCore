// ── API Responses ──────────────────────────────────────────────────────────────

export interface VoiceJoinResponse {
  ok:         true;
  session: {
    id:              string;
    discordUserId:   string;
    discordUsername: string;
    joinedAt:        string;
  };
  license: {
    id:        string;
    key:       string;
    status:    string;
    expiresAt: string | null;
  };
}

export interface VoiceLeaveResponse {
  ok:      true;
  session: {
    id:              string;
    leftAt:          string;
    durationSeconds: number;
  };
}

export interface ApiError {
  error: string;
}

export interface VoiceChannel {
  id:        string;
  channelId: string;
  name:      string;
  active:    boolean;
  guild?:    { name: string; guildId: string };
  voiceRule?: {
    enabled:         boolean;
    durationMinutes: number;
    cooldownSeconds: number;
    maxPerDay:       number;
    product?:        { id: string; name: string };
  };
  _count?: { voiceSessions: number };
}

export interface VoiceStats {
  activeSessions:  number;
  activeLicenses:  number;
  connectedUsers:  number;
  activeChannels:  number;
  totalToday:      number;
  totalAllTime:    number;
}

// ── Internal ───────────────────────────────────────────────────────────────────

export interface BotCommand {
  data:    import("discord.js").SlashCommandBuilder | import("discord.js").SlashCommandOptionsOnlyBuilder;
  execute: (interaction: import("discord.js").ChatInputCommandInteraction) => Promise<void>;
}
