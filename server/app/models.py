"""The rows. Three of them, and each one exists because something in the game had nowhere
authoritative to live.

    Player       who they are. The thing a save can belong to and a licence can be bought by.
    FreeRun      the twelve weeks, a row per game, summed — see the class and app/routers/run.py.
    Licence      what they paid for, attached to the person rather than to a browser.

Kept apart rather than as columns on Player because they have different lifetimes: a player is
forever, a free run is spent once, and a licence is a receipt. Also because the day the save
moves here, Player is what it hangs off, and a wide Player row is the thing that gets in the way."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Stored lower-cased and stripped; see security.normalize_email. Unique, so "Paz@x.com" and
    # "paz@x.com" cannot become two accounts with two free runs between them.
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Not a role system. One flag, for the one person who needs to look at a number.
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    free_runs: Mapped[list["FreeRun"]] = relationship(back_populates="player")
    licences: Mapped[list["Licence"]] = relationship(back_populates="player")


class FreeRun(Base):
    """The twelve weeks, counted where the player cannot reach them — ONE ROW PER GAME.

    The first shape of this was a single weeks_played on the account, advanced when the client
    reported a higher week than it had seen. That is wrong, and wrong in exactly the way the
    whole feature exists to prevent: finish twelve weeks, start a new dossier, and every week of
    the new game is week 1, 2, 3 — none of them higher than 12, so nothing advances and the free
    run never ends. Which is the "stop at week 11 and restart" exploit, rebuilt on the server.

    So a row per game. Each row holds the highest week that game has reached, and the free run is
    the SUM across the player's games. Game A twelve weeks plus game B three is fifteen, and the
    run is spent. Idempotent too: the same week reported twice is one row updated to the same
    number, so a retry after a dropped connection costs nobody anything."""
    __tablename__ = "free_runs"
    __table_args__ = (UniqueConstraint("player_id", "game_id", name="uq_free_runs_player_game"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"),
                                           nullable=False, index=True)
    # The game's own identity. The client sends its save seed, which is stable for the life of a
    # dossier and different for every new one — exactly the property needed here.
    game_id: Mapped[str] = mapped_column(String(64), nullable=False)
    weeks: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    first_week_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_week_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player: Mapped[Player] = relationship(back_populates="free_runs")


class Licence(Base):
    """A receipt. The key Lemon Squeezy issued, validated by us, against this account.

    A row rather than a column because a player may buy again — a gift, a second order, a
    replacement after a refund — and the history of what was bought is worth more than the
    latest value of a field. `active` is what the game asks about."""
    __tablename__ = "licences"
    __table_args__ = (UniqueConstraint("key", name="uq_licences_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"),
                                           nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    # What Lemon Squeezy called it, so a support question can be answered without logging in there.
    instance_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    store_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    product_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    activated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    player: Mapped[Player] = relationship(back_populates="licences")
