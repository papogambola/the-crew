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

    # How long a password-reset link is good for. An hour: long enough to go and find the email,
    # short enough that one sitting in an inbox somebody else later reads is not a way in.
    reset_minutes: int = int(os.environ.get("RESET_TTL_MINUTES", "60"))

    # Where the reset link points. The page is served beside the game, so this is the site rather
    # than the API. Overridable because staging and a laptop are not playthecrew.com, and a reset
    # link that always points at production is a reset flow nobody can test anywhere else.
    site_url: str = os.environ.get("SITE_URL", "https://playthecrew.com").rstrip("/")

    # There was a free run here — twelve weeks on the game's calendar — and there is no longer one.
    # The game is bought before it is played. It is a game, not a tool somebody evaluates: the
    # twelve weeks were the whole of the first act given away, and what they bought was a wall in
    # the middle of the one story the game has to tell.

    # STRIPE, which takes the money and carries the tax.
    #
    # It was Lemon Squeezy, who issued one key per order that the player pasted into the game.
    # Stripe bought them and routes new sellers to its own merchant-of-record product, so there is
    # no Lemon Squeezy store to open — and no key, which is the better half of the change: a key is
    # a thing to lose, mistype, and write in about. Now the player presses Buy while signed in, and
    # what comes back is a row against their account.
    #
    # NOTHING HERE NAMES A PAYMENT METHOD, and that is the whole policy. Stripe Checkout offers
    # whatever the dashboard has enabled and the buyer is eligible for; naming one would EXCLUDE
    # the others, and which ones exist is not ours to decide or to promise.
    #
    # It was written expecting PayPal to be one of them. It is not: Stripe's PayPal is available to
    # Stripe accounts in thirty European countries and this account is not in one, so the checkout
    # offers cards and wallets and no PayPal. The other route is a custom payment method — a
    # private preview, your own PayPal business account, an adapter you host, fees by arrangement —
    # which is a service to run for a twelve dollar game. The copy in play.html stopped promising
    # it; this note is here so the next person does not go looking for the switch.
    stripe_api: str = os.environ.get("STRIPE_API", "https://api.stripe.com/v1/")
    stripe_secret: str = os.environ.get("STRIPE_SECRET_KEY", "")
    stripe_webhook_secret: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    stripe_price: str = os.environ.get("STRIPE_PRICE_ID", "")

    @property
    def shop_open(self) -> bool:
        """All three, or the till is shut.

        A wall with no way to pay is worse than no wall, so the game asks this and simply does not
        gate anybody when it is false. Half-configured counts as shut: a secret with no price would
        let Buy be pressed and then fail at Stripe, which is the same as being shut except that it
        wastes the one moment somebody had decided to pay.

        This carries more weight than it did. It used to decide whether a wall appeared at week
        thirteen; it now decides whether the game opens at all, so a deploy that loses one of the
        three does not lock everybody out — it gives the game away. That is the right way round."""
        return bool(self.stripe_secret and self.stripe_webhook_secret and self.stripe_price)

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
