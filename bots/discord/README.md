# GianCore Discord Bot

Cliente Discord para el **Voice Licensing Engine** de GianCore.

> El bot **no contiene lógica de negocio**. Solo escucha eventos Discord y los envía a la API de GianCore. Es completamente reemplazable.

---

## Arquitectura

```
Usuario entra a voz
      ↓
Discord Bot (este proyecto)
      ↓  POST /api/voice/join
GianCore API
      ↓
Voice Engine → genera licencia → audit log
      ↓
Bot recibe respuesta → envía DM al usuario
```

---

## Requisitos

- Node.js 20+
- Una aplicación en [Discord Developer Portal](https://discord.com/developers/applications)
- GianCore corriendo y accesible

---

## Setup

### 1. Crear la aplicación Discord

1. Ir a [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → dale un nombre
3. Ir a **Bot** → copiar el **Token**
4. Ir a **OAuth2** → copiar el **Client ID**
5. En **Bot** → activar los siguientes **Privileged Gateway Intents**:
   - `SERVER MEMBERS INTENT`
   - `GUILD VOICE STATES`

### 2. Invitar el bot al servidor

Usar esta URL (reemplaza `CLIENT_ID`):

```
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot+applications.commands&permissions=277025392640
```

Permisos incluidos: Send Messages, Embed Links, Read Message History.

### 3. Configurar el entorno

```bash
cp .env.example .env
```

Editar `.env`:

```env
DISCORD_TOKEN=tu_token_del_bot
CLIENT_ID=tu_client_id
API_URL=https://tu-giancore.com
API_TOKEN=tu_api_secret_token
```

### 4. Instalar dependencias

```bash
npm install
```

### 5. Registrar slash commands

```bash
npm run register
```

> Los comandos globales tardan hasta **1 hora** en propagarse. Para pruebas rápidas, modifica `register.ts` usando `Routes.applicationGuildCommands(clientId, guildId)`.

---

## Desarrollo

```bash
npm run dev
```

---

## Producción

### Node directo

```bash
npm run build
npm start
```

### PM2

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Comandos útiles:

```bash
pm2 logs giancore-discord-bot
pm2 restart giancore-discord-bot
pm2 status
```

### Docker

```bash
docker build -t giancore-discord-bot .

docker run -d \
  --name giancore-bot \
  --restart unless-stopped \
  -e DISCORD_TOKEN=tu_token \
  -e CLIENT_ID=tu_client_id \
  -e API_URL=http://giancore:3000 \
  -e API_TOKEN=tu_api_token \
  giancore-discord-bot
```

Agregar al `docker-compose.yml` de GianCore:

```yaml
discord-bot:
  build: ./bots/discord
  restart: unless-stopped
  environment:
    DISCORD_TOKEN: ${DISCORD_TOKEN}
    CLIENT_ID: ${CLIENT_ID}
    API_URL: http://giancore:3000
    API_TOKEN: ${API_TOKEN}
  depends_on:
    - giancore
```

---

## Comandos

| Comando | Descripción | Permiso |
|---------|-------------|---------|
| `/setvoice` | Configura un canal de voz para licenciamiento | Manage Guild |
| `/setduration` | Actualiza duración / cooldown / límite | Manage Guild |
| `/config` | Configuración completa y estado de la API | Manage Guild |
| `/stats` | Estadísticas en tiempo real | Todos |

---

## Flujo de eventos

**Join:**
1. Usuario entra → bot llama `POST /api/voice/join`
2. API valida cooldown, límite diario, canal habilitado
3. OK → API genera licencia → bot envía DM con key
4. Error → bot envía DM con el motivo

**Leave:**
1. Usuario sale → bot llama `POST /api/voice/leave`
2. API desactiva licencia + aplica cooldown
3. Bot envía DM de confirmación con tiempo en canal

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DISCORD_TOKEN` | ✅ | Token del bot |
| `CLIENT_ID` | ✅ | Application Client ID |
| `API_URL` | ✅ | URL base de GianCore |
| `API_TOKEN` | ✅ | Token Bearer para la API |
| `LOG_LEVEL` | ❌ | `debug`/`info`/`warn`/`error` (default: `info`) |

---

## Estructura

```
src/
├── client/       # Cliente Discord con commands y events
├── commands/     # /setvoice  /setduration  /config  /stats
├── events/       # ready  voiceStateUpdate
├── services/     # apiService  dmService
├── types/        # Tipos TypeScript
├── config/       # Env vars + logger estructurado
└── scripts/      # register.ts
```

---

## Reemplazabilidad

El bot es un cliente **stateless**. Si se elimina:
- La API de GianCore sigue funcionando
- Los datos permanecen en la DB
- Se puede reemplazar por cualquier otro cliente
