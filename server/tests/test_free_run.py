"""THE TWELVE WEEKS, AND THE THING THAT USED TO RESET THEM.

Paz: "we need to see that the player doesn't stop at week 11 and restarts."

In the browser that was already half-true — the counter lived in the settings key rather than
the save, so a new dossier did not hand the weeks back. What DID hand them back was clearing
browsing data, a second browser, or another machine, because the counter lived in that browser
and nowhere else.

These tests are about the half that is now the server's, and the one that nearly got rebuilt
here: a single number per account, advanced only when the client reports a higher week, gives
the free run straight back to anybody who starts a new game — every week of game two is week 1,
2, 3, none of them higher than twelve. So it is a row per game, summed."""


def test_a_new_account_has_played_nothing(client, signed_up):
    r = client.get("/run", headers=signed_up["h"])
    assert r.status_code == 200
    s = r.json()
    assert s["weeks_played"] == 0
    assert s["weeks_left"] == 12
    assert s["over"] is False


def test_weeks_add_up_within_one_game(client, signed_up):
    for w in range(1, 6):
        r = client.post("/run/week", headers=signed_up["h"],
                        json={"game_id": "seed-A", "game_week": w})
        assert r.status_code == 200
    assert r.json()["weeks_played"] == 5
    assert r.json()["weeks_left"] == 7


def test_the_same_week_twice_costs_one_week(client, signed_up):
    for _ in range(4):
        r = client.post("/run/week", headers=signed_up["h"],
                        json={"game_id": "seed-A", "game_week": 3})
    # three weeks of that game happened, however many times the client said so
    assert r.json()["weeks_played"] == 3


def test_a_week_cannot_be_put_back(client, signed_up):
    client.post("/run/week", headers=signed_up["h"], json={"game_id": "seed-A", "game_week": 9})
    r = client.post("/run/week", headers=signed_up["h"], json={"game_id": "seed-A", "game_week": 2})
    assert r.json()["weeks_played"] == 9, "a lower week must not lower the count"


def test_STARTING_A_NEW_GAME_IS_NOT_A_NEW_FREE_RUN(client, signed_up):
    """The one Paz asked for, and the one a single number per account gets wrong."""
    for w in range(1, 12):                      # eleven weeks, then stop
        client.post("/run/week", headers=signed_up["h"],
                    json={"game_id": "seed-A", "game_week": w})
    s = client.get("/run", headers=signed_up["h"]).json()
    assert s["weeks_played"] == 11 and s["over"] is False

    # a new dossier: its weeks start at one again
    r = client.post("/run/week", headers=signed_up["h"],
                    json={"game_id": "seed-B", "game_week": 1})
    s = r.json()
    assert s["weeks_played"] == 12, "week one of a second game is the twelfth week played, not the first"
    assert s["over"] is True, "and that is where the free run ends"


def test_a_third_game_does_not_help_either(client, signed_up):
    for g in ("A", "B", "C", "D", "E"):
        for w in (1, 2, 3):
            client.post("/run/week", headers=signed_up["h"],
                        json={"game_id": "seed-" + g, "game_week": w})
    s = client.get("/run", headers=signed_up["h"]).json()
    assert s["weeks_played"] == 15
    assert s["weeks_left"] == 0 and s["over"] is True


def test_the_count_belongs_to_the_account_not_the_browser(client, signed_up):
    """The whole point. A second sign-in is a second browser as far as anything here can tell."""
    for w in range(1, 8):
        client.post("/run/week", headers=signed_up["h"], json={"game_id": "s", "game_week": w})
    fresh = client.post("/auth/login", json={"email": signed_up["email"],
                                             "password": "a long enough password"})
    h2 = {"Authorization": "Bearer " + fresh.json()["token"]}
    assert client.get("/run", headers=h2).json()["weeks_played"] == 7


def test_another_account_has_its_own_run(client, signed_up):
    for w in range(1, 13):
        client.post("/run/week", headers=signed_up["h"], json={"game_id": "s", "game_week": w})
    assert client.get("/run", headers=signed_up["h"]).json()["over"] is True
    import uuid
    other = client.post("/auth/signup", json={"email": f"o-{uuid.uuid4().hex[:8]}@example.com",
                                              "password": "another long password"}).json()
    h = {"Authorization": "Bearer " + other["token"]}
    assert client.get("/run", headers=h).json()["over"] is False


def test_nobody_signed_in_is_told_nothing(client):
    assert client.get("/run").status_code in (401, 403)
    assert client.post("/run/week", json={"game_id": "s", "game_week": 1}).status_code in (401, 403)
