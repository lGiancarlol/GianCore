from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Shared secret with GianCore — must match BRIDGE_TOKEN in GianCore env
    bridge_token: str

    # Telethon session storage path
    sessions_dir: str = "/app/sessions"

    # Max seconds to wait for a bot reply
    reply_timeout: int = 45

    class Config:
        env_file = ".env"

settings = Settings()
