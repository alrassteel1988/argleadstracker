const assert = require("assert");
const {
  enrichCompanyFromGoogle,
  mergeLeadWithEnrichment,
  _test
} = require("../enrichment");

const originalFetch = global.fetch;
const originalKey = process.env.GOOGLE_PLACES_API_KEY;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function reset() {
  _test.clearCache();
  _test.clearRateLimit();
  process.env.GOOGLE_PLACES_API_KEY = "test-google-key";
}

async function run(name, test) {
  reset();
  try {
    await test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

(async () => {
  await run("successful enrichment", async () => {
    global.fetch = async url => {
      if (String(url).includes("places:searchText")) {
        return jsonResponse({
          places: [{ id: "places/abc", displayName: { text: "Al Ras Steel Trading" } }]
        });
      }
      return jsonResponse({
        id: "places/abc",
        displayName: { text: "Al Ras Steel Trading" },
        formattedAddress: "Dubai, United Arab Emirates",
        internationalPhoneNumber: "+971 4 123 4567",
        websiteUri: "https://alrassteel.example",
        googleMapsUri: "https://maps.google.com/?cid=123",
        rating: 4.6,
        userRatingCount: 42,
        primaryTypeDisplayName: { text: "Steel Distributor" },
        regularOpeningHours: { weekdayDescriptions: ["Monday: 8:00 AM - 5:00 PM"] }
      });
    };
    const result = await enrichCompanyFromGoogle({ companyName: "Al Ras Steel", location: "Dubai", rateKey: "success" });
    assert.equal(result.company_name, "Al Ras Steel Trading");
    assert.equal(result.website, "https://alrassteel.example");
    assert.equal(result.enrichment_status, "enriched");
    assert.equal(result.legal_name, "");
    assert.match(result.products_services_remarks, /Not available from Google Places API/);
  });

  await run("no Google Places match", async () => {
    global.fetch = async () => jsonResponse({ places: [] });
    const result = await enrichCompanyFromGoogle({ companyName: "No Match LLC", location: "Dubai", rateKey: "no-match" });
    assert.equal(result.enrichment_status, "not_found");
    assert.equal(result.company_name, "No Match LLC");
  });

  await run("partial Google Places data", async () => {
    global.fetch = async url => {
      if (String(url).includes("places:searchText")) {
        return jsonResponse({
          places: [{ id: "places/partial", displayName: { text: "Partial Steel" } }]
        });
      }
      return jsonResponse({
        id: "places/partial",
        displayName: { text: "Partial Steel" },
        formattedAddress: "Sharjah, United Arab Emirates"
      });
    };
    const result = await enrichCompanyFromGoogle({ companyName: "Partial Steel", location: "Sharjah", rateKey: "partial" });
    assert.equal(result.enrichment_status, "partial");
    assert.equal(result.website, "");
    assert.equal(result.address, "Sharjah, United Arab Emirates");
  });

  await run("API rate limit failure", async () => {
    global.fetch = async () => jsonResponse({ error: { message: "Quota exceeded" } }, 429);
    await assert.rejects(
      enrichCompanyFromGoogle({ companyName: "Rate Limited", location: "Dubai", rateKey: "rate-limit" }),
      error => error.status === 429 && /Quota exceeded/.test(error.message)
    );
  });

  await run("legacy Places fallback when new method is blocked", async () => {
    global.fetch = async url => {
      const target = String(url);
      if (target.includes("places:searchText")) {
        return jsonResponse({ error: { message: "Requests to this API places.googleapis.com method google.maps.places.v1.Places.SearchText are blocked." } }, 403);
      }
      if (target.includes("textsearch/json")) {
        return jsonResponse({
          status: "OK",
          results: [{ place_id: "legacy-abc", name: "Legacy Steel LLC", formatted_address: "Dubai, UAE" }]
        });
      }
      return jsonResponse({
        status: "OK",
        result: {
          place_id: "legacy-abc",
          name: "Legacy Steel LLC",
          formatted_address: "Dubai, UAE",
          formatted_phone_number: "04 123 4567",
          website: "https://legacy-steel.example",
          url: "https://maps.google.com/?cid=legacy",
          types: ["steel_distributor"],
          rating: 4.2,
          user_ratings_total: 18
        }
      });
    };
    const result = await enrichCompanyFromGoogle({ companyName: "Legacy Steel", location: "Dubai", rateKey: "legacy" });
    assert.equal(result.company_name, "Legacy Steel LLC");
    assert.equal(result.website, "https://legacy-steel.example");
    assert.equal(result.google_maps_url, "https://maps.google.com/?cid=legacy");
    assert.equal(result.enrichment_status, "enriched");
  });

  await run("user-edited fields are not overwritten", async () => {
    const merged = mergeLeadWithEnrichment(
      { website: "https://manual.example", phone: "", company_name: "Manual Name" },
      { website: "https://google.example", phone: "+971 4 999 9999", company_name: "Google Name", enrichment_status: "enriched" }
    );
    assert.equal(merged.website, "https://manual.example");
    assert.equal(merged.company_name, "Manual Name");
    assert.equal(merged.phone, "+971 4 999 9999");
    assert.equal(merged.enrichment_status, "enriched");
  });
})()
  .finally(() => {
    global.fetch = originalFetch;
    if (originalKey == null) {
      delete process.env.GOOGLE_PLACES_API_KEY;
    } else {
      process.env.GOOGLE_PLACES_API_KEY = originalKey;
    }
  });
