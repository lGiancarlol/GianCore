"""
Telethon Bridge — internal microservice for GianCore.
Exposes HTTP endpoints that GianCore calls to interact with external Telegram bots
using a real user account (Telethon) instead of the Bot API.

Authentication: Bearer token via BRIDGE_TOKEN env var.
"""

import os
from contextlib import asynccontextmanager
from typing import Optional, Any

from fastapi import FastAPI, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from config import settings
import session_manager as sm
import actions

# ── Auth ───────────────────────────────────────────────────────────────────────

security = HTTPBearer()

def verify_token(creds: HTTPAuthorizationCredentials = Security(security)) -> None:
    if creds.credentials != settings.bridge_token:
        raise HTTPException(status_code=401, detail="Invalid bridge token")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.sessions_dir, exist_ok=True)
    yield
    await sm.disconnect_all()


app = FastAPI(title="GianCore Telethon Bridge", lifespan=lifespan)


# ── Request / Response models ─────────────────────────────────────────────────

class AccountCreds(BaseModel):
    account_id:     str
    api_id:         int
    api_hash:       str
    session_string: str  # Telethon StringSession


class RequestLicenseReq(BaseModel):
    account:         AccountCreds
    target_bot:      str           # bot @username or numeric id
    command:         str           # e.g. "/generate ff1d"
    key_pattern:     str           # regex with capture group 1
    timeout:         int = 45


class RequestLicenseButtonReq(BaseModel):
    account:         AccountCreds
    target_bot:      str    # bot @username or numeric id
    command:         str    # e.g. "/start"
    button_text:     str    # text to match on the inline button, e.g. "HOUR"
    key_pattern:     str    # regex with capture group 1
    timeout:         int = 45


class ClickButtonReq(BaseModel):
    account:         AccountCreds
    target_bot:      str
    message_id:      int
    button_text:     str
    key_pattern:     Optional[str] = None
    timeout:         int = 30


class KeyActionReq(BaseModel):
    account:         AccountCreds
    target_bot:      str
    command:         str           # e.g. "/status XXXX-YYYY"
    key_pattern:     Optional[str] = None  # if None, return raw reply
    timeout:         int = 30


class OkResponse(BaseModel):
    ok:           bool
    key:          Optional[str]  = None
    raw_response: Optional[str]  = None
    error:        Optional[str]  = None
    extra:        Optional[Any]  = None


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _client(creds: AccountCreds):
    return await sm.get_client(
        creds.account_id,
        creds.api_id,
        creds.api_hash,
        creds.session_string,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/request-license", response_model=OkResponse, dependencies=[Depends(verify_token)])
async def request_license(req: RequestLicenseReq):
    """
    Send a command to the external bot and extract the license key from its reply.
    Used for: generate key, buy license, etc.
    """
    try:
        client = await _client(req.account)
        reply  = await actions.send_and_wait(client, req.target_bot, req.command, req.timeout)

        if reply is None:
            return OkResponse(ok=False, error="Timeout: no reply from bot")

        key = actions.extract_key(reply, req.key_pattern)
        if key is None:
            return OkResponse(ok=False, raw_response=reply, error=f"Key pattern not matched in reply")

        return OkResponse(ok=True, key=key, raw_response=reply)

    except Exception as e:
        return OkResponse(ok=False, error=str(e))


@app.post("/request-license-button", response_model=OkResponse, dependencies=[Depends(verify_token)])
async def request_license_button(req: RequestLicenseButtonReq):
    """
    Full 2-step flow:
      1. Send command (e.g. /start)
      2. Wait for message with InlineKeyboard
      3. Find and click button matching button_text (e.g. "HOUR")
      4. Wait for bot reply
      5. Extract key via key_pattern
    """
    try:
        client = await _client(req.account)
        result = await actions.send_wait_click_wait(
            client,
            req.target_bot,
            req.command,
            req.button_text,
            req.key_pattern,
            req.timeout,
        )
        return OkResponse(**result)
    except Exception as e:
        return OkResponse(ok=False, error=str(e))


@app.post("/click-button", response_model=OkResponse, dependencies=[Depends(verify_token)])
async def click_button(req: ClickButtonReq):
    """
    Click an InlineKeyboardButton in an existing message and wait for bot reply.
    Used for: confirm purchase, select duration, activate, etc.
    """
    try:
        client = await _client(req.account)
        reply  = await actions.click_and_wait(
            client, req.target_bot, req.message_id, req.button_text, req.timeout
        )

        if reply is None:
            return OkResponse(ok=False, error="Timeout: no reply after button click")

        key = actions.extract_key(reply, req.key_pattern) if req.key_pattern else None
        return OkResponse(ok=True, key=key, raw_response=reply)

    except ValueError as e:
        return OkResponse(ok=False, error=str(e))
    except Exception as e:
        return OkResponse(ok=False, error=str(e))


@app.post("/key-action", response_model=OkResponse, dependencies=[Depends(verify_token)])
async def key_action(req: KeyActionReq):
    """
    Generic command+reply endpoint.
    Used for: /status key, /deactivate key, /activate key, /resetip key, /info key
    """
    try:
        client = await _client(req.account)
        reply  = await actions.send_and_wait(client, req.target_bot, req.command, req.timeout)

        if reply is None:
            return OkResponse(ok=False, error="Timeout: no reply from bot")

        key = actions.extract_key(reply, req.key_pattern) if req.key_pattern else None
        return OkResponse(ok=True, key=key, raw_response=reply)

    except Exception as e:
        return OkResponse(ok=False, error=str(e))


@app.post("/disconnect/{account_id}", dependencies=[Depends(verify_token)])
async def disconnect(account_id: str):
    await sm.disconnect_client(account_id)
    return {"ok": True}
