"""The Crew's server.

First slice of the migration in ARCHITECTURE_AUDIT.md: an account, a free run that cannot be
reset, and a licence that follows the player rather than the browser. The game still computes
its own rolls — that is step 4, and this is not it."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.emailer import email_status
from app.routers import auth, licence, saves

app = FastAPI(title="The Crew", docs_url=None, redoc_url=None, openapi_url=None)

# The site is served from GitHub Pages and this is somewhere else, so every call the game makes
# is cross-origin. The list is explicit: a wildcard here would let any page on the internet make
# authenticated calls with somebody's token.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=False,          # the token travels in a header, not a cookie
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

app.include_router(auth.router)
app.include_router(licence.router)
app.include_router(saves.router)


# Read once, at import, so a deploy missing it fails NOW rather than at somebody's first sign-up.
# DATABASE_URL already fails this way because the engine is built at import; JWT_SECRET was not,
# because it is only touched when a token is minted — so a service with no JWT_SECRET booted,
# went green, said Online, and then 500'd on the first person who tried to open an account. A
# deploy that is broken should look broken.
settings.jwt_secret


@app.get("/health")
def health():
    """What Railway pings, and what tells a person whether the thing is up at all.

    `mail` is here because the one thing that cannot report its own failure is the reset email:
    /auth/forgot answers identically whether or not it sent anything, deliberately (see
    routers/auth.py), so without this the only way to find out that mail is misconfigured is for
    a locked-out player to write in and say the link never arrived.

    `shop` is here because it is the one fact about this server that somebody with NO ACCOUNT
    needs, and it matters more now than when it was added. The game is bought before it is played,
    so the title screen of a signed-out copy has to decide between two completely different
    screens — a door with a price on it, or the game — and the only thing that can tell it which
    is this. Putting it behind /licence instead would mean only signed-in players could learn it,
    and a wall would then appear for exactly the people with no way through it."""
    return {"ok": True, "mail": email_status(), "shop": settings.shop_open}
