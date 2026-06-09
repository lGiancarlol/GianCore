"use client";

import { useState, useMemo } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import SearchBar from "@/components/ui/SearchBar";
import {
  MessageCircle, Plus, Settings, Power, Mic, Hash,
  Users, Activity, Wifi, WifiOff, ChevronRight,
  Timer, Clock, Key, ShieldCheck, BarChart2,
  RefreshCw, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import {
  useVoiceStats, useVoiceSessions, useVoiceChannels, useVoiceCooldowns,
} from "@/hooks/useVoice";
import { useProducts } from "@/hooks/useProducts";
import type { VoiceStats } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = "channels" | "sessions" | "cooldowns" | "statistics" | "servers";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  if (seconds < 60)   return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-AR")} ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;
}

function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Expirado";
  return formatDuration(Math.floor(diff / 1000));
}

// ── Bot Status Card ────────────────────────────────────────────────────────────

function BotStatusCard({ online }: { online: boolean }) {
  return (
    <div className="card card-p">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Estado del bot</p>
          <div className="flex items-center gap-2">
            {online
              ? <Wifi    className="w-4 h-4 text-green-400" />
              : <WifiOff className="w-4 h-4 text-muted-foreground" />}
            <span className={`text-sm font-semibold ${online ? "text-green-400" : "text-muted-foreground"}`}>
              {online ? "Conectado" : "Desconectado"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {online ? "Voice Engine operativo" : "Configura el token para conectar"}
          </p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
          online ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-secondary"
        }`} />
      </div>
    </div>
  );
}

// ── Bot Config Modal ───────────────────────────────────────────────────────────

function BotConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token,   setToken]   = useState("");
  const [prefix,  setPrefix]  = useState("!");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/integrations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: "Discord Bot", type: "discord", config: { token, prefix } }),
      });
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurar bot de Discord">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Token del bot *</label>
          <input required type="password" className="input-base font-mono"
            placeholder="MTxxxxxxxxxxxxxxxxxxxxxxxxxx..."
            value={token} onChange={(e) => setToken(e.target.value)} />
          <p className="text-[10px] text-muted-foreground mt-1">
            Obtenlo en{" "}
            <a href="https://discord.com/developers/applications" target="_blank"
              rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              Discord Developer Portal
            </a>
          </p>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Prefijo de comandos</label>
          <input className="input-base w-24" maxLength={3}
            value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={loading || !token}>
            {loading ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Add Voice Channel Modal ────────────────────────────────────────────────────

function AddChannelModal({ open, onClose, productOptions, onSaved }: {
  open: boolean; onClose: () => void;
  productOptions: { value: string; label: string }[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    guildId: "", channelId: "", name: "", productId: "",
    durationMinutes: "60", cooldownSeconds: "300", maxPerDay: "100",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/voice/channels", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...form,
          durationMinutes: parseInt(form.durationMinutes),
          cooldownSeconds: parseInt(form.cooldownSeconds),
          maxPerDay:       parseInt(form.maxPerDay),
        }),
      });
      onSaved();
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurar canal de voz" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Guild ID *</label>
            <input required className="input-base font-mono" placeholder="000000000000000000"
              value={form.guildId} onChange={(e) => set("guildId")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Channel ID *</label>
            <input required className="input-base font-mono" placeholder="000000000000000000"
              value={form.channelId} onChange={(e) => set("channelId")(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nombre del canal *</label>
            <input required className="input-base" placeholder="gaming-lounge"
              value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Producto (licencia) *</label>
            <select required className="input-base" value={form.productId}
              onChange={(e) => set("productId")(e.target.value)}>
              <option value="">Seleccionar producto...</option>
              {productOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rule fields */}
        <div className="rounded-lg border border-border p-3 space-y-3 bg-secondary/20">
          <p className="text-xs font-semibold text-foreground">Reglas de la licencia</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Duración (min)</label>
              <input type="number" min="1" className="input-base"
                value={form.durationMinutes} onChange={(e) => set("durationMinutes")(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Cooldown (seg)</label>
              <input type="number" min="0" className="input-base"
                value={form.cooldownSeconds} onChange={(e) => set("cooldownSeconds")(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Máx. por día</label>
              <input type="number" min="1" className="input-base"
                value={form.maxPerDay} onChange={(e) => set("maxPerDay")(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="btn-primary"
            disabled={loading || !form.channelId || !form.guildId || !form.productId}>
            {loading ? "Guardando..." : "Guardar canal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Voice Channel Card ─────────────────────────────────────────────────────────

function VoiceChannelCard({ channel, onToggle }: {
  channel: any; onToggle: (id: string, active: boolean) => void;
}) {
  const rule = channel.voiceRule;
  return (
    <div className="card card-p space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Mic className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{channel.name}</p>
            <code className="text-[10px] text-muted-foreground font-mono">{channel.channelId}</code>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant={channel.active && rule?.enabled ? "green" : "muted"}>
            {channel.active && rule?.enabled ? "Activo" : "Inactivo"}
          </Badge>
          <button
            className="icon-btn p-1 min-h-0 min-w-0"
            title={channel.active ? "Desactivar" : "Activar"}
            onClick={() => onToggle(channel.id, !channel.active)}
          >
            <Power className={`w-3.5 h-3.5 ${channel.active ? "text-amber-400" : "text-green-400"}`} />
          </button>
        </div>
      </div>

      {/* Guild */}
      {channel.guild && (
        <p className="text-[10px] text-muted-foreground truncate">
          Servidor: <span className="text-foreground">{channel.guild.name}</span>
        </p>
      )}

      {/* Rule stats */}
      {rule ? (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
          <Metric icon={Timer} label="Duración"  value={`${rule.durationMinutes}m`} />
          <Metric icon={Clock} label="Cooldown"  value={rule.cooldownSeconds ? `${rule.cooldownSeconds}s` : "Sin"} center />
          <Metric icon={Key}   label="Máx/día"   value={String(rule.maxPerDay)} />
        </div>
      ) : (
        <p className="text-[11px] text-amber-400 flex items-center gap-1 pt-1 border-t border-border">
          <AlertCircle className="w-3 h-3" /> Sin regla configurada
        </p>
      )}

      {/* Product */}
      {rule?.product && (
        <p className="text-[10px] text-muted-foreground">
          Producto: <span className="text-foreground">{rule.product.name}</span>
        </p>
      )}

      {/* Active sessions count */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Activity className="w-3 h-3" />
        <span>{channel._count?.voiceSessions ?? 0} sesión(es) activa(s)</span>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, center }: {
  icon: any; label: string; value: string; center?: boolean;
}) {
  return (
    <div className={`text-center ${center ? "border-x border-border" : ""}`}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-xs font-semibold text-foreground">{value}</p>
    </div>
  );
}

// ── Statistics Panel ───────────────────────────────────────────────────────────

function StatisticsPanel({ stats, loading }: { stats: VoiceStats | null; loading: boolean }) {
  const items = [
    { label: "Sesiones activas",    value: stats?.activeSessions, color: "text-blue-400",   bg: "rgba(52,152,219,0.1)",   border: "rgba(52,152,219,0.2)",   icon: Activity },
    { label: "Licencias activas",   value: stats?.activeLicenses, color: "text-red-400",    bg: "rgba(192,57,43,0.1)",    border: "rgba(192,57,43,0.2)",    icon: Key      },
    { label: "Usuarios conectados", value: stats?.connectedUsers, color: "text-green-400",  bg: "rgba(39,174,96,0.1)",    border: "rgba(39,174,96,0.2)",    icon: Users    },
    { label: "Canales activos",     value: stats?.activeChannels, color: "text-purple-400", bg: "rgba(155,89,182,0.1)",   border: "rgba(155,89,182,0.2)",   icon: Mic      },
    { label: "Sesiones hoy",        value: stats?.totalToday,     color: "text-amber-400",  bg: "rgba(230,126,34,0.1)",   border: "rgba(230,126,34,0.2)",   icon: BarChart2 },
    { label: "Total histórico",     value: stats?.totalAllTime,   color: "text-foreground", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", icon: BarChart2 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map(({ label, value, color, bg, border, icon: Icon }) => (
          <div key={label} className="card card-p">
            {loading ? (
              <div className="skeleton h-14 rounded-lg" />
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: bg, border: `1px solid ${border}` }}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value ?? 0}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* API info box */}
      <div className="card card-p space-y-3">
        <p className="text-xs font-semibold text-foreground">Endpoints del Voice Engine</p>
        <div className="space-y-2">
          {[
            { method: "POST", path: "/api/voice/join",     desc: "Bot → usuario entra a canal de voz" },
            { method: "POST", path: "/api/voice/leave",    desc: "Bot → usuario sale de canal de voz" },
            { method: "GET",  path: "/api/voice/sessions", desc: "Sesiones activas / historial" },
            { method: "GET",  path: "/api/voice/channels", desc: "Canales configurados con reglas" },
            { method: "POST", path: "/api/voice/channels", desc: "Crear / actualizar canal con regla" },
            { method: "GET",  path: "/api/voice/stats",    desc: "Estadísticas en tiempo real" },
          ].map(({ method, path, desc }) => (
            <div key={path} className="flex items-center gap-3">
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                method === "POST" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
              }`}>
                {method}
              </span>
              <code className="text-xs font-mono text-foreground">{path}</code>
              <span className="text-xs text-muted-foreground hidden sm:block">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cooldowns Panel ────────────────────────────────────────────────────────────

function CooldownsPanel() {
  const { data: cooldowns, loading, refresh } = useVoiceCooldowns();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? cooldowns : cooldowns.filter(
      (c) => c.discordUserId.includes(q) || (c.channel as any)?.name?.toLowerCase().includes(q)
    );
  }, [cooldowns, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch}
          placeholder="Buscar por usuario o canal..." className="w-full sm:w-72" />
        <button className="btn-secondary gap-1.5" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Clock}
            title="Sin cooldowns activos"
            description="Aquí aparecerán los usuarios en período de cooldown." />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr className="border-b border-border text-left bg-secondary/20">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuario Discord</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Canal</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Expira</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Tiempo restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row-hover">
                    <td className="px-4 py-2.5">
                      <code className="text-xs font-mono text-foreground">{c.discordUserId}</code>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {(c.channel as any)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDate(c.expiresAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="amber">{timeLeft(c.expiresAt)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sessions Panel ─────────────────────────────────────────────────────────────

function SessionsPanel() {
  const [onlyActive, setOnlyActive] = useState(false);
  const { data: sessions, loading, refresh } = useVoiceSessions(onlyActive);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? sessions : sessions.filter(
      (s) =>
        s.discordUsername.toLowerCase().includes(q) ||
        s.discordUserId.includes(q) ||
        (s.channel as any)?.name?.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch}
          placeholder="Buscar por usuario o canal..." className="w-full sm:w-72" />
        <button
          onClick={() => setOnlyActive((v) => !v)}
          className={`btn-secondary gap-1.5 ${onlyActive ? "border-[var(--theme-border)]" : ""}`}
          style={onlyActive ? { background: "var(--theme-soft)", color: "var(--theme-primary)" } : undefined}
        >
          <Activity className="w-3.5 h-3.5" />
          {onlyActive ? "Mostrando activas" : "Solo activas"}
        </button>
        <button className="btn-secondary gap-1.5" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>
      <div className="card">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-11 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Activity}
            title="Sin sesiones"
            description={onlyActive ? "No hay sesiones activas en este momento." : "El historial de sesiones aparecerá aquí."} />
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr className="border-b border-border text-left bg-secondary/20">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Usuario</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Canal</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Licencia</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Inicio</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Duración</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="table-row-hover">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary border border-border
                          flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                          {s.discordUsername.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs text-foreground">{s.discordUsername}</p>
                          <code className="text-[10px] text-muted-foreground font-mono">{s.discordUserId}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Mic className="w-3 h-3 text-blue-400 shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {(s.channel as any)?.name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {s.license ? (
                        <code className="text-[11px] font-mono text-muted-foreground">
                          {(s.license as any).key?.slice(0, 14)}…
                        </code>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(s.joinedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {s.durationSeconds
                        ? formatDuration(s.durationSeconds)
                        : s.leftAt ? "—" : <Badge variant="green">Activa</Badge>}
                    </td>
                    <td className="px-4 py-2.5">
                      {!s.leftAt
                        ? <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-green-400">En canal</span>
                          </div>
                        : <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Finalizada</span>
                          </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Channels Panel ─────────────────────────────────────────────────────────────

function ChannelsPanel({ onAddChannel }: { onAddChannel: () => void }) {
  const { data: channels, loading, refresh } = useVoiceChannels();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? channels : channels.filter(
      (c) => c.name.toLowerCase().includes(q) || c.channelId.includes(q)
    );
  }, [channels, search]);

  const handleToggle = async (id: string, active: boolean) => {
    await fetch("/api/voice/channels", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, active }),
    });
    refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch}
          placeholder="Buscar canal..." className="w-full sm:w-72" />
        <button className="btn-secondary gap-1.5" onClick={refresh}>
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
        <button className="btn-primary gap-1.5" onClick={onAddChannel}>
          <Plus className="w-4 h-4" /> Agregar canal
        </button>
      </div>
      {loading ? (
        <div className="grid-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon={Mic}
            title="Sin canales configurados"
            description="Agrega canales de voz con reglas de licenciamiento."
            action={
              <button className="btn-primary" onClick={onAddChannel}>
                <Plus className="w-4 h-4" /> Agregar canal
              </button>
            } />
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((c) => (
            <VoiceChannelCard key={c.id} channel={c} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DiscordPage() {
  const [botOnline,      setBotOnline]      = useState(false);
  const [showConfig,     setShowConfig]     = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [activeTab,      setActiveTab]      = useState<Tab>("channels");

  const { data: products }                      = useProducts();
  const { stats, loading: statsLoading, refresh } = useVoiceStats(15_000);

  const productOptions = products.map((p) => ({ value: p.id, label: p.name }));

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "channels",   label: "Canales de voz", icon: Mic        },
    { id: "sessions",   label: "Sesiones",        icon: Activity   },
    { id: "cooldowns",  label: "Cooldowns",       icon: Clock      },
    { id: "statistics", label: "Estadísticas",    icon: BarChart2  },
    { id: "servers",    label: "Servidores",      icon: MessageCircle },
  ];

  return (
    <>
      <Topbar
        title="Discord Manager"
        subtitle="Voice Licensing Engine — gestión de canales, sesiones y reglas"
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary gap-1.5 text-xs py-1.5"
              onClick={() => setBotOnline((v) => !v)}>
              <Power className="w-3.5 h-3.5" />
              {botOnline ? "Simular offline" : "Simular online"}
            </button>
            <button className="btn-primary gap-1.5" onClick={() => setShowConfig(true)}>
              <Settings className="w-4 h-4" />
              {botOnline ? "Configurar" : "Conectar bot"}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-4 page-enter">

        {/* Status row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <BotStatusCard online={botOnline} />
          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Sesiones activas</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xl font-bold text-foreground">
                {statsLoading ? "—" : (stats?.activeSessions ?? 0)}
              </span>
            </div>
          </div>
          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Usuarios conectados</p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xl font-bold text-foreground">
                {statsLoading ? "—" : (stats?.connectedUsers ?? 0)}
              </span>
            </div>
          </div>
          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Canales activos</p>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              <span className="text-xl font-bold text-foreground">
                {statsLoading ? "—" : (stats?.activeChannels ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* API ready notice */}
        <div className="card card-p flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Voice Engine listo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Los endpoints <code className="text-foreground">/api/voice/join</code> y{" "}
              <code className="text-foreground">/api/voice/leave</code> están activos y esperando
              eventos del bot Discord. Configura el bot con la URL base de GianCore.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium
                transition-all duration-150 border-b-2 -mb-px whitespace-nowrap shrink-0 ${
                activeTab === id
                  ? "border-[var(--theme-primary)] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {activeTab === "channels"   && <ChannelsPanel onAddChannel={() => setShowAddChannel(true)} />}
        {activeTab === "sessions"   && <SessionsPanel />}
        {activeTab === "cooldowns"  && <CooldownsPanel />}
        {activeTab === "statistics" && <StatisticsPanel stats={stats} loading={statsLoading} />}
        {activeTab === "servers"    && (
          <div className="card">
            <EmptyState
              icon={MessageCircle}
              title="Sin servidores registrados"
              description="Los servidores donde está el bot aparecerán aquí automáticamente cuando se conecte."
              action={
                <button className="btn-secondary" onClick={() => setShowConfig(true)}>
                  <Settings className="w-4 h-4" /> Configurar bot
                </button>
              }
            />
          </div>
        )}

      </div>

      <BotConfigModal  open={showConfig}     onClose={() => setShowConfig(false)} />
      <AddChannelModal
        open={showAddChannel}
        onClose={() => setShowAddChannel(false)}
        productOptions={productOptions}
        onSaved={refresh}
      />
    </>
  );
}
