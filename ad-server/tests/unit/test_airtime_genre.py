"""Unit tests for Airtime genre matching (stdlib only — no app deps)."""

from app.integrations.airtime_genre_match import genre_from_block, norm_key


def test_norm_key_matches_html_entities():
    assert norm_key("Boo'd Up") == norm_key("Boo&#039;d Up")
    assert norm_key("Ella Mai") == norm_key("Ella Mai")


def test_genre_from_previous_block():
    want_a = norm_key("Ella Mai")
    want_t = norm_key("Boo'd Up")
    block = {
        "metadata": {
            "artist_name": "Ella Mai",
            "track_title": "Boo&#039;d Up",
            "genre": "R&amp;B/Soul",
        },
    }
    assert genre_from_block(block, want_a, want_t) == "R&B/Soul"


def test_genre_wrong_track_returns_none():
    want_a = norm_key("Other")
    want_t = norm_key("Song")
    block = {
        "metadata": {
            "artist_name": "Ella Mai",
            "track_title": "Boo'd Up",
            "genre": "Pop",
        },
    }
    assert genre_from_block(block, want_a, want_t) is None
