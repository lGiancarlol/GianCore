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
