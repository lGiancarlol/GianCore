"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import {
  MessageCircle, Plus, Settings, Power, Hash, Mic,
  Users, Clock, Key, RefreshCw, Activity, Wifi, WifiOff,
  ChevronRight, Timer, ShieldCheck,
} from "lucide-react";

// ── Mock types (reemplazar con API real) ───────────────────────────────────────

interface DiscordServer {
  id:       string;
  guildId:  string;
  name:     string;
  icon?:    string;
  members:  number;
  active:   boolean;
}

interface DiscordChannel {
  id:          string;
  channelId:   string;
  name:        string;
  type:        "text" | "voice" | "category";
  active:      boolean;
  cooldown?:   number; // segundos
  duration?:   number; // minutos
  activeLicenses: number;
}

interface VoiceSession {
  id:        string;
  username:  string;
  channel:   string;
  joinedAt:  string;
  duration:  string;
  license:   string;
}

// ── Mock data (reemplazar con fetch real) ─────────────────────────────────────

const MOCK_SERVERS: DiscordServer[] = [];
const MOCK_CHANNELS: DiscordChannel[] = [];
const MOCK_SESSIONS: VoiceSession[] = [];

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
            {online ? "Bot operando con normalidad" : "Configura el token para conectar"}
          </p>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
          online ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : "bg-secondary"
        }`} />
      </div>
    </div>
  );
}

// ── Config Modal ──────────────────────────────────────────────────────────────

function BotConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token,   setToken]   = useState("");
  const [prefix,  setPrefix]  = useState("!");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: conectar con /api/discord/config
      await new Promise((r) => setTimeout(r, 800));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurar bot de Discord">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Token del bot *</label>
          <input
            required
            type="password"
            className="input-base font-mono"
            placeholder="MTxxxxxxxxxxxxxxxxxxxxxxxxxx..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
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
          <input
            className="input-base w-24"
            maxLength={3}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !token}>
            {loading ? "Conectando..." : "Conectar bot"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Add Channel Modal ─────────────────────────────────────────────────────────

function AddChannelModal({ open, onClose, servers }: {
  open: boolean; onClose: () => void; servers: DiscordServer[];
}) {
  const [form, setForm] = useState({
    serverId: "", channelId: "", name: "",
    type: "voice" as "text" | "voice",
    duration: "60", cooldown: "0",
  });
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: conectar con /api/discord
      await new Promise((r) => setTimeout(r, 600));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Agregar canal" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Servidor</label>
            <select className="input-base" value={form.serverId} onChange={(e) => set("serverId")(e.target.value)}>
              <option value="">Seleccionar servidor...</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
            <select className="input-base" value={form.type} onChange={(e) => set("type")(e.target.value)}>
              <option value="voice">Canal de voz</option>
              <option value="text">Canal de texto</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">ID del canal *</label>
            <input required className="input-base font-mono" placeholder="000000000000000000"
              value={form.channelId} onChange={(e) => set("channelId")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Nombre</label>
            <input className="input-base" placeholder="nombre-del-canal"
              value={form.name} onChange={(e) => set("name")(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Duración asignada (min)</label>
            <input type="number" min="1" className="input-base"
              value={form.duration} onChange={(e) => set("duration")(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Cooldown (seg)</label>
            <input type="number" min="0" className="input-base"
              value={form.cooldown} onChange={(e) => set("cooldown")(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading || !form.channelId}>
            {loading ? "Guardando..." : "Agregar canal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Channel Card ──────────────────────────────────────────────────────────────

function ChannelCard({ channel }: { channel: DiscordChannel }) {
  return (
    <div className="card card-p space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {channel.type === "voice"
            ? <Mic  className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            : <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{channel.name}</p>
            <code className="text-[10px] text-muted-foreground font-mono">{channel.channelId}</code>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={channel.active ? "green" : "muted"}>
            {channel.active ? "Activo" : "Inactivo"}
          </Badge>
          <button className="icon-btn p-1 min-h-0 min-w-0">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Timer className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Duración</p>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {channel.duration ? `${channel.duration}m` : "—"}
          </p>
        </div>
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Cooldown</p>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {channel.cooldown ? `${channel.cooldown}s` : "Sin"}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Key className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground">Licencias</p>
          </div>
          <p className="text-xs font-semibold text-foreground">{channel.activeLicenses}</p>
        </div>
      </div>
    </div>
  );
}

// ── Session Row ───────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: VoiceSession }) {
  return (
    <tr className="table-row-hover">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-secondary border border-border
            flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
            {session.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-foreground">{session.username}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Mic className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-xs text-muted-foreground">{session.channel}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <code className="text-[11px] text-muted-foreground font-mono">
          {session.license.slice(0, 16)}…
        </code>
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">{session.joinedAt}</td>
      <td className="px-4 py-2.5">
        <Badge variant="blue">{session.duration}</Badge>
      </td>
    </tr>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function DiscordPage() {
  const [botOnline,      setBotOnline]      = useState(false);
  const [showConfig,     setShowConfig]     = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [activeTab,      setActiveTab]      = useState<"channels" | "sessions" | "servers">("channels");

  const servers  = MOCK_SERVERS;
  const channels = MOCK_CHANNELS;
  const sessions = MOCK_SESSIONS;

  const tabs = [
    { id: "channels" as const, label: "Canales",  count: channels.length },
    { id: "sessions" as const, label: "Sesiones", count: sessions.length },
    { id: "servers"  as const, label: "Servidores", count: servers.length },
  ];

  return (
    <>
      <Topbar
        title="Discord Manager"
        subtitle="Gestión de canales, sesiones y configuración del bot"
        actions={
          <div className="flex items-center gap-2">
            {botOnline && (
              <button className="btn-secondary gap-1.5" onClick={() => setShowAddChannel(true)}>
                <Plus className="w-4 h-4" /> Agregar canal
              </button>
            )}
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
            <p className="text-xs text-muted-foreground mb-1">Servidores</p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xl font-bold text-foreground">{servers.length}</span>
            </div>
          </div>

          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Canales activos</p>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-purple-400" />
              <span className="text-xl font-bold text-foreground">
                {channels.filter((c) => c.active).length}
              </span>
            </div>
          </div>

          <div className="card card-p">
            <p className="text-xs text-muted-foreground mb-1">Sesiones activas</p>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xl font-bold text-foreground">{sessions.length}</span>
            </div>
          </div>
        </div>

        {/* Demo toggle (eliminar cuando el bot esté conectado) */}
        <div className="card card-p flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Modo demo — activa el bot con el token real para habilitar todas las funciones
            </span>
          </div>
          <button
            className="btn-secondary text-xs py-1 px-3"
            onClick={() => setBotOnline((v) => !v)}
          >
            <Power className="w-3.5 h-3.5" />
            {botOnline ? "Simular offline" : "Simular online"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === t.id
                  ? "border-[var(--theme-primary)] text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === t.id
                    ? "bg-[var(--theme-soft)] text-[var(--theme-primary)]"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "channels" && (
          <>
            {channels.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Mic}
                  title="Sin canales configurados"
                  description={botOnline
                    ? "Agrega canales de voz o texto para comenzar a gestionarlos."
                    : "Conecta el bot primero para poder agregar canales."}
                  action={botOnline ? (
                    <button className="btn-primary" onClick={() => setShowAddChannel(true)}>
                      <Plus className="w-4 h-4" /> Agregar canal
                    </button>
                  ) : (
                    <button className="btn-secondary" onClick={() => setShowConfig(true)}>
                      <Settings className="w-4 h-4" /> Configurar bot
                    </button>
                  )}
                />
              </div>
            ) : (
              <div className="grid-3">
                {channels.map((c) => <ChannelCard key={c.id} channel={c} />)}
              </div>
            )}
          </>
        )}

        {activeTab === "sessions" && (
          <div className="card">
            {sessions.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="Sin sesiones activas"
                description="El historial de sesiones de voz aparecerá aquí."
              />
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((s) => <SessionRow key={s.id} session={s} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "servers" && (
          <div className="card">
            {servers.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title="Sin servidores"
                description="Los servidores donde está el bot aparecerán aquí automáticamente."
                action={
                  <button className="btn-secondary" onClick={() => setShowConfig(true)}>
                    <Settings className="w-4 h-4" /> Configurar bot
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {servers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3 table-row-hover">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary border border-border
                        flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{s.guildId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {s.members.toLocaleString()}
                      </div>
                      <Badge variant={s.active ? "green" : "muted"}>
                        {s.active ? "Activo" : "Inactivo"}
                      </Badge>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>

      <BotConfigModal   open={showConfig}     onClose={() => setShowConfig(false)} />
      <AddChannelModal  open={showAddChannel} onClose={() => setShowAddChannel(false)} servers={servers} />
    </>
  );
}
