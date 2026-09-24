"""Everything the server is told rather than decides.

No defaults for the things that must not have one. A JWT secret with a fallback is a JWT secret
every copy of this repository knows, so the app refuses to start without one — a deploy that is
missing it fails at boot with a sentence, rather than serving tokens anybody can forge."""
import os


def _required(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        raise RuntimeError(
            f"{name} is not set. The server does not invent one: set it in the environment "
            f"(Railway → the service → Variables) and redeploy."
        )
    return v


class Settings:
    @property
    def database_url(self) -> str:
        url = _required("DATABASE_URL")
        # Railway hands out postgres:// and SQLAlchemy 2 wants postgresql://. Corrected here so
        # nobody has to remember it at three in the morning.
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return url

    @property
    def jwt_secret(self) -> str:
        """At least 32 bytes, because HS256 is an HMAC and a short key is a guessable one.

        RFC 7518 §3.2 says a key for HS256 should be no shorter than the hash it feeds. PyJWT
        warns and signs anyway; the server refuses, because a token signed with "secret" is a
        token anybody can mint and this is the thing standing between a stranger and every
        account. Generate one with:  python -c "import secrets;print(secrets.token_urlsafe(48))"
        """
        v = _required("JWT_SECRET")
        if len(v.encode()) < 32:
            raise RuntimeError(
                "JWT_SECRET is shorter than 32 bytes. HS256 signs with it, so a short one is a "
                "forgeable one. Generate: python -c \"import secrets;print(secrets.token_urlsafe(48))\""
            )
        return v

    # How long a sign-in lasts. Long, because this is a game somebody plays for an hour on a
    # Sunday and being signed out mid-job is worse than the risk it buys back.
    token_days: int = 60

    # The free run, in the GAME'S weeks — the number in the top bar, not weeks of anybody's life.
    free_weeks: int = 12

    # Lemon Squeezy, which takes the money and hands out one key per order. Empty means the shop
    # is shut and nothing is gated, which is how it ships until Paz opens it.
    ls_api: str = os.environ.get("LEMON_API", "https://api.lemonsqueezy.com/v1/licenses/")
    ls_store: str = os.environ.get("LEMON_STORE", "")
    ls_product: str = os.environ.get("LEMON_PRODUCT", "")

    # Where the game is served from, for CORS. The site is on GitHub Pages and the API is here,
    # so every call is cross-origin and the list has to be explicit.
    @property
    def origins(self) -> list[str]:
        raw = os.environ.get(
            "ALLOWED_ORIGINS",
            "https://playthecrew.com,https://www.playthecrew.com",
        )
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()
