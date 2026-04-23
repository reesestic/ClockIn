import requests
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv()
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")


class GoogleRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def get_auth_url(self, user_id: str):
        return {
            "url": (
                "https://accounts.google.com/o/oauth2/v2/auth"
                f"?client_id={GOOGLE_CLIENT_ID}"
                f"&redirect_uri={GOOGLE_REDIRECT_URI}"
                f"&response_type=code"
                f"&scope=https://www.googleapis.com/auth/calendar.readonly"
                f"&access_type=offline"
                f"&prompt=consent"
                f"&state={user_id}"
            )
        }

    def exchange_code_for_tokens(self, code: str):
        res = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        res.raise_for_status()
        return res.json()

    def _refresh_access_token(self, user_id: str, refresh_token: str) -> str:
        """Exchange refresh token for a new access token and persist it."""
        res = requests.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        res.raise_for_status()
        new_tokens = res.json()
        expires_at = datetime.utcnow() + timedelta(seconds=new_tokens["expires_in"])
        self.supabase.table("GoogleTokens").update({
            "access_token": new_tokens["access_token"],
            "expires_at": expires_at.isoformat(),
        }).eq("user_id", user_id).execute()
        return new_tokens["access_token"]

    def _get_valid_access_token(self, tokens: dict) -> str:
        expires_at = datetime.fromisoformat(tokens["expires_at"]).replace(tzinfo=None)
        if datetime.utcnow() >= expires_at - timedelta(minutes=5):
            return self._refresh_access_token(tokens["user_id"], tokens["refresh_token"])
        return tokens["access_token"]

    def store_tokens(self, user_id: str, tokens: dict):
        self.supabase.table("GoogleTokens").upsert({
            "user_id": user_id,
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
            "expires_at": (
                    datetime.utcnow() + timedelta(seconds=tokens["expires_in"])
            ).isoformat(),
        }).execute()

    def get_tokens(self, user_id: str):
        res = self.supabase.table("GoogleTokens").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None

    def delete_tokens(self, user_id: str):
        self.supabase.table("GoogleTokens").delete().eq("user_id", user_id).execute()

    def _fetch_calendar_ids(self, access_token: str) -> list[str]:
        """Return IDs of all calendars the user has access to."""
        res = requests.get(
            "https://www.googleapis.com/calendar/v3/users/me/calendarList",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        res.raise_for_status()
        return [cal["id"] for cal in res.json().get("items", [])]

    def _fetch_events_for_calendar(self, access_token: str, calendar_id: str) -> list:
        time_min = datetime.utcnow().isoformat() + "Z"
        time_max = (datetime.utcnow() + timedelta(days=7)).isoformat() + "Z"
        res = requests.get(
            f"https://www.googleapis.com/calendar/v3/calendars/{quote(calendar_id, safe='')}/events",
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": True,
                "orderBy": "startTime",
                "maxResults": 250,
            },
        )
        if not res.ok:
            return []  # skip calendars we can't read (e.g. holidays, other people's)
        return [e for e in res.json().get("items", []) if e.get("status") != "cancelled"]

    def fetch_events(self, tokens: dict) -> list:
        access_token = self._get_valid_access_token(tokens)
        calendar_ids = self._fetch_calendar_ids(access_token)

        all_events = []
        seen_ids = set()
        for cal_id in calendar_ids:
            for event in self._fetch_events_for_calendar(access_token, cal_id):
                event_id = event.get("id")
                if event_id and event_id not in seen_ids:
                    seen_ids.add(event_id)
                    all_events.append(event)

        return all_events
