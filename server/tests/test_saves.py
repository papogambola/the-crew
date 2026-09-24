"""The crew, off the browser and onto the account.

Paz: "the save lives in this browser and belongs to this site, so clearing your browsing data
clears it too, and it does not follow you to another computer."

The one that matters here is the revision rule. Two machines, one account, and the wrong answer
is not an error message — it is somebody's evening gone."""
import json
import uuid


def _blob(week=1, money=150000):
    return json.dumps({"v": 2, "seed": 12345, "week": week, "money": money})


def test_a_new_account_has_no_games(client, signed_up):
    assert client.get("/saves", headers=signed_up["h"]).json() == []


def test_a_game_is_written_and_read_back_exactly(client, signed_up):
    b = _blob(week=7)
    r = client.put("/saves", headers=signed_up["h"],
                   json={"game_id": "seed-A", "rev": 1, "blob": b, "label": "Varga", "week": 7})
    assert r.status_code == 200 and r.json()["stored"] is True
    got = client.get("/saves/seed-A", headers=signed_up["h"]).json()
    assert got["blob"] == b, "byte for byte, because this is somebody's game"
    assert got["week"] == 7 and got["label"] == "Varga"


def test_it_follows_the_player_to_another_machine(client, signed_up):
    client.put("/saves", headers=signed_up["h"],
               json={"game_id": "seed-A", "rev": 1, "blob": _blob(week=20), "week": 20})
    # a second sign-in is another machine as far as anything here can tell
    fresh = client.post("/auth/login", json={"email": signed_up["email"],
                                             "password": "a long enough password"})
    h2 = {"Authorization": "Bearer " + fresh.json()["token"]}
    assert client.get("/saves/seed-A", headers=h2).json()["week"] == 20


def test_A_NEWER_SAVE_IS_NEVER_OVERWRITTEN_BY_AN_OLDER_ONE(client, signed_up):
    """The laptop played on while the desktop still had the tab open."""
    h = signed_up["h"]
    client.put("/saves", headers=h, json={"game_id": "g", "rev": 1, "blob": _blob(week=5), "week": 5})
    # the laptop plays on
    client.put("/saves", headers=h, json={"game_id": "g", "rev": 9, "blob": _blob(week=30), "week": 30})
    # the desktop, still on its old copy, tries to save
    r = client.put("/saves", headers=h, json={"game_id": "g", "rev": 2, "blob": _blob(week=6), "week": 6})
    assert r.status_code == 409
    assert client.get("/saves/g", headers=h).json()["week"] == 30, "the laptop's evening survives"


def test_the_refusal_says_what_the_server_has(client, signed_up):
    """So the game can tell the player which copy is which rather than just failing."""
    h = signed_up["h"]
    client.put("/saves", headers=h, json={"game_id": "g", "rev": 7, "blob": _blob(week=21), "week": 21})
    r = client.put("/saves", headers=h, json={"game_id": "g", "rev": 3, "blob": _blob(week=9), "week": 9})
    d = r.json()["detail"]
    assert d["server_rev"] == 7 and d["your_rev"] == 3 and d["server_week"] == 21


def test_the_same_revision_twice_is_refused(client, signed_up):
    h = signed_up["h"]
    client.put("/saves", headers=h, json={"game_id": "g", "rev": 4, "blob": _blob(), "week": 1})
    assert client.put("/saves", headers=h,
                      json={"game_id": "g", "rev": 4, "blob": _blob(money=9e9), "week": 1}).status_code == 409


def test_several_dossiers_live_side_by_side(client, signed_up):
    h = signed_up["h"]
    for g, w in (("a", 4), ("b", 11), ("c", 2)):
        client.put("/saves", headers=h, json={"game_id": g, "rev": 1, "blob": _blob(week=w), "week": w})
    rows = client.get("/saves", headers=h).json()
    assert len(rows) == 3
    assert {r["game_id"] for r in rows} == {"a", "b", "c"}
    assert all("blob" not in r for r in rows), "the list is a list, not three games down the wire"


def test_one_account_cannot_read_another_s_game(client, signed_up):
    client.put("/saves", headers=signed_up["h"],
               json={"game_id": "private", "rev": 1, "blob": _blob(), "week": 1})
    other = client.post("/auth/signup", json={"email": f"o-{uuid.uuid4().hex[:8]}@example.com",
                                              "password": "another long password"}).json()
    h = {"Authorization": "Bearer " + other["token"]}
    assert client.get("/saves/private", headers=h).status_code == 404
    assert client.get("/saves", headers=h).json() == []


def test_a_save_that_is_too_big_is_refused_rather_than_stored(client, signed_up):
    r = client.put("/saves", headers=signed_up["h"],
                   json={"game_id": "fat", "rev": 1, "blob": "x" * 1_000_001, "week": 1})
    assert r.status_code == 422


def test_nobody_signed_in_reaches_nothing(client):
    assert client.get("/saves").status_code in (401, 403)
    assert client.get("/saves/anything").status_code in (401, 403)
    assert client.put("/saves", json={"game_id": "g", "rev": 1, "blob": "{}", "week": 1}).status_code in (401, 403)
