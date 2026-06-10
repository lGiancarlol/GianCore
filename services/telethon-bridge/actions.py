"""
Core Telethon actions against external bots.
All functions receive an already-connected TelegramClient.
"""

import re
import asyncio
from typing import Optional
from telethon import TelegramClient, events
from telethon.tl.types import Message, ReplyInlineMarkup, KeyboardButtonCallback


async def send_message(client: TelegramClient, target: str, text: str) -> int:
    """Send a text message and return the sent message_id."""
    msg: Message = await client.send_message(target, text)
    return msg.id


async def wait_for_reply(
    client: TelegramClient,
    target: str,
    after_id: int,
    timeout: int,
) -> Optional[Message]:
    """
    Wait up to `timeout` seconds for any new message from `target`
    whose id > after_id.
    """
    future: asyncio.Future[Message] = asyncio.get_event_loop().create_future()

    @client.on(events.NewMessage(from_users=target))
    async def handler(event: events.NewMessage.Event) -> None:
        if event.message.id > after_id and not future.done():
            future.set_result(event.message)

    try:
        return await asyncio.wait_for(future, timeout=timeout)
    except asyncio.TimeoutError:
        return None
    finally:
        client.remove_event_handler(handler)


async def click_inline_button(
    client: TelegramClient,
    target: str,
    message_id: int,
    button_text: str,
) -> Optional[Message]:
    """
    Find a message by id, locate an inline button whose text matches
    button_text (case-insensitive), click it, and return the resulting message.
    """
    msg: Message = await client.get_messages(target, ids=message_id)
    if not msg or not msg.reply_markup:
        raise ValueError(f"Message {message_id} has no inline keyboard")

    markup: ReplyInlineMarkup = msg.reply_markup
    for row in markup.rows:
        for btn in row.buttons:
            if isinstance(btn, KeyboardButtonCallback) and button_text.lower() in btn.text.lower():
                result = await msg.click(text=btn.text)
                return result

    raise ValueError(f"Button '{button_text}' not found in message {message_id}")


async def send_and_wait(
    client: TelegramClient,
    target: str,
    command: str,
    timeout: int,
) -> Optional[str]:
    """Send command and wait for first reply. Returns reply text or None."""
    sent_id = await send_message(client, target, command)
    reply   = await wait_for_reply(client, target, sent_id, timeout)
    return reply.text if reply else None


async def click_and_wait(
    client: TelegramClient,
    target: str,
    message_id: int,
    button_text: str,
    timeout: int,
) -> Optional[str]:
    """Click inline button and wait for bot reply. Returns reply text or None."""
    after_id = message_id
    click_task  = asyncio.create_task(click_inline_button(client, target, message_id, button_text))
    wait_task   = asyncio.create_task(wait_for_reply(client, target, after_id, timeout))

    await click_task  # raises if button not found
    reply = await wait_task
    return reply.text if reply else None


def extract_key(text: str, pattern: str) -> Optional[str]:
    """Apply regex pattern (with capture group 1) to extract key from text."""
    m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None


async def send_wait_click_wait(
    client: TelegramClient,
    target: str,
    command: str,
    button_text: str,
    key_pattern: str,
    timeout: int,
) -> dict:
    """
    Full 2-step flow:
      1. Send `command` to `target`
      2. Wait for a message that contains an InlineKeyboard
      3. Find button whose text contains `button_text` (case-insensitive)
      4. Click it
      5. Wait for the next reply
      6. Extract key via `key_pattern`

    Returns dict with keys: ok, key, raw_response, error
    """
    deadline = asyncio.get_event_loop().time() + timeout

    # ── Step 1: send command ──────────────────────────────────────────────────
    sent_id = await send_message(client, target, command)

    # ── Step 2: wait for message with inline keyboard ────────────────────────
    kbd_future: asyncio.Future[Message] = asyncio.get_event_loop().create_future()

    @client.on(events.NewMessage(from_users=target))
    async def kbd_handler(event: events.NewMessage.Event) -> None:
        msg: Message = event.message
        if msg.id <= sent_id or kbd_future.done():
            return
        # Accept message that has a reply_markup (inline keyboard)
        if msg.reply_markup is not None:
            kbd_future.set_result(msg)
        # Also accept plain text messages in case the bot sends text first;
        # we'll handle that below if we never find a keyboard.

    remaining = deadline - asyncio.get_event_loop().time()
    try:
        kbd_msg: Message = await asyncio.wait_for(kbd_future, timeout=max(remaining, 1))
    except asyncio.TimeoutError:
        client.remove_event_handler(kbd_handler)
        return {"ok": False, "error": "Timeout waiting for inline keyboard from bot"}
    finally:
        client.remove_event_handler(kbd_handler)

    # ── Step 3 & 4: find button and click ────────────────────────────────────
    if not kbd_msg.reply_markup:
        return {"ok": False, "error": "Bot reply has no inline keyboard", "raw_response": kbd_msg.text}

    target_btn = None
    for row in kbd_msg.reply_markup.rows:
        for btn in row.buttons:
            if isinstance(btn, KeyboardButtonCallback) and button_text.lower() in btn.text.lower():
                target_btn = btn
                break
        if target_btn:
            break

    if target_btn is None:
        available = [
            btn.text
            for row in kbd_msg.reply_markup.rows
            for btn in row.buttons
            if isinstance(btn, KeyboardButtonCallback)
        ]
        return {
            "ok": False,
            "error": f"Button '{button_text}' not found. Available: {available}",
            "raw_response": kbd_msg.text,
        }

    # Register reply listener BEFORE clicking to avoid race condition
    reply_future: asyncio.Future[Message] = asyncio.get_event_loop().create_future()
    click_msg_id = kbd_msg.id

    @client.on(events.NewMessage(from_users=target))
    async def reply_handler(event: events.NewMessage.Event) -> None:
        if event.message.id > click_msg_id and not reply_future.done():
            reply_future.set_result(event.message)

    try:
        await kbd_msg.click(text=target_btn.text)
    except Exception as e:
        client.remove_event_handler(reply_handler)
        return {"ok": False, "error": f"Click failed: {e}"}

    # ── Step 5: wait for reply after click ───────────────────────────────────
    remaining = deadline - asyncio.get_event_loop().time()
    try:
        reply_msg: Message = await asyncio.wait_for(reply_future, timeout=max(remaining, 1))
    except asyncio.TimeoutError:
        return {"ok": False, "error": "Timeout waiting for reply after button click"}
    finally:
        client.remove_event_handler(reply_handler)

    raw = reply_msg.text or ""

    # ── Step 6: extract key ───────────────────────────────────────────────────
    key = extract_key(raw, key_pattern)
    if key is None:
        return {"ok": False, "error": "Key pattern not matched in reply", "raw_response": raw}

    return {"ok": True, "key": key, "raw_response": raw}
