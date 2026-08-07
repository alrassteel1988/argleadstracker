from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(r"C:\Users\Glory\Documents\argleadstracker")
DATA_PATH = ROOT / "outputs" / "sales_report_work" / "sales_data.json"
CACHE_PATH = ROOT / "outputs" / "sales_report_work" / "company_places_cache.json"
OUT_PATH = ROOT / "outputs" / "sales_report_work" / "company_enrichment.json"
PLACES_URL = "https://places.googleapis.com/v1/places:searchText"


def read_places_key() -> str:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        if line.strip().startswith("GOOGLE_PLACES_API_KEY="):
            return line.split("=", 1)[1].strip()
    return os.environ.get("GOOGLE_PLACES_API_KEY", "")


def normalize(value: str) -> str:
    value = value.upper()
    for token in [" L.L.C", " LLC", " CO.", " CO ", " LTD", " LIMITED", " UAE", " U.A.E", ".", ",", "-", "&"]:
        value = value.replace(token, " ")
    return " ".join(value.split())


def score_match(query_name: str, place_name: str) -> float:
    q = normalize(query_name)
    p = normalize(place_name)
    if not q or not p:
        return 0.0
    ratio = SequenceMatcher(None, q, p).ratio()
    q_tokens = set(q.split())
    p_tokens = set(p.split())
    overlap = len(q_tokens & p_tokens) / max(1, len(q_tokens))
    return round((ratio * 0.55) + (overlap * 0.45), 3)


def places_request(api_key: str, text_query: str) -> dict:
    payload = {
        "textQuery": text_query,
        "languageCode": "en",
        "regionCode": "AE",
        "pageSize": 3,
    }
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        PLACES_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": ",".join(
                [
                    "places.id",
                    "places.displayName",
                    "places.formattedAddress",
                    "places.nationalPhoneNumber",
                    "places.internationalPhoneNumber",
                    "places.websiteUri",
                    "places.location",
                    "places.googleMapsUri",
                    "places.businessStatus",
                    "places.types",
                ]
            ),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        return {"error": {"status_code": exc.code, "body": error_body[:800]}}
    except Exception as exc:
        return {"error": {"status_code": "client", "body": str(exc)}}


def best_place(company_name: str, response: dict) -> dict:
    candidates = []
    for place in response.get("places", []):
        display = place.get("displayName", {}).get("text", "")
        match = score_match(company_name, display)
        candidates.append((match, place))
    if not candidates:
        return {}
    candidates.sort(key=lambda item: item[0], reverse=True)
    match, place = candidates[0]
    return {"match_score": match, "place": place}


def classify(score: float, place: dict) -> str:
    if not place:
        return "No result"
    has_contact = bool(place.get("websiteUri") or place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber"))
    if score >= 0.78 and has_contact:
        return "High"
    if score >= 0.70:
        return "Medium"
    return "Low - review"


def main() -> None:
    api_key = read_places_key()
    if not api_key:
        raise SystemExit("GOOGLE_PLACES_API_KEY not found")

    data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {}
    results = []
    limit = int(os.environ.get("ENRICH_LIMIT", "154"))

    for row in data["customer"][:limit]:
        name = row["party_name"]
        if name not in cache:
            query = f"{name} UAE"
            cache[name] = places_request(api_key, query)
            CACHE_PATH.write_text(json.dumps(cache, indent=2), encoding="utf-8")
            time.sleep(0.15)

        response = cache[name]
        selected = best_place(name, response) if "error" not in response else {}
        place = selected.get("place", {})
        location = place.get("location", {})
        phone = place.get("internationalPhoneNumber") or place.get("nationalPhoneNumber") or ""
        score = selected.get("match_score", 0)
        confidence = classify(score, place) if "error" not in response else "Lookup error"

        results.append(
            {
                "party_code": row["party_code"],
                "party_name": name,
                "business_location": place.get("formattedAddress", ""),
                "country": "United Arab Emirates" if place.get("formattedAddress") else "",
                "latitude": location.get("latitude", ""),
                "longitude": location.get("longitude", ""),
                "website": place.get("websiteUri", ""),
                "contact_number": phone,
                "location_source_url": place.get("googleMapsUri", ""),
                "match_confidence": confidence,
                "match_score": score,
                "matched_name": place.get("displayName", {}).get("text", ""),
                "lookup_status": response.get("error", {}).get("body", "") if "error" in response else "OK",
            }
        )

    OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
    summary = {
        "requested": len(results),
        "with_website": sum(1 for r in results if r["website"]),
        "with_contact_number": sum(1 for r in results if r["contact_number"]),
        "with_coordinates": sum(1 for r in results if r["latitude"] != "" and r["longitude"] != ""),
        "high_confidence": sum(1 for r in results if r["match_confidence"] == "High"),
        "medium_confidence": sum(1 for r in results if r["match_confidence"] == "Medium"),
        "low_or_error": sum(1 for r in results if r["match_confidence"] not in {"High", "Medium"}),
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
