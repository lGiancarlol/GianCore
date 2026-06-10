"""
Manages a pool of Telethon UserClient instances, one per session file.
Each session represents one Telegram user account.
"""

import os
import asyncio
from typing import Dict
from telethon import TelegramClient
from telethon.sessions import StringSession
from config import settings

# account_id → TelegramClient
_clients: Dict[str, TelegramClient] = {}
_lock = asyncio.Lock()


async def get_client(account_id: str, api_id: int, api_hash: str, session_string: str) -> TelegramClient:
    async with _lock:
        if account_id in _clients:
            client = _clients[account_id]
            if client.is_connected():
                return client
            # reconnect if disconnected
            await client.connect()
            return client

        client = TelegramClient(
            StringSession(session_string),
            api_id,
            api_hash,
            system_version="4.16.30-vxCUSTOM",
        )
        await client.connect()
        _clients[account_id] = client
        return client


async def disconnect_client(account_id: str) -> None:
    async with _lock:
        client = _clients.pop(account_id, None)
        if client and client.is_connected():
            await client.disconnect()


async def disconnect_all() -> None:
    async with _lock:
        for client in _clients.values():
            if client.is_connected():
                await client.disconnect()
        _clients.clear()
