#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const travelFile = process.env.TRAVEL_CITIES_FILE ||
  path.join(projectRoot, "static/data/travel-cities.json");
const coordinateFile = process.env.TRAVEL_COORDINATES_FILE ||
  path.join(projectRoot, "static/data/travel-city-coordinates.json");
const geocoderUrl = process.env.TRAVEL_GEOCODER_URL ||
  "https://nominatim.openstreetmap.org/search";
const requestDelayMs = 1100;
const geocoderCountryAliases = new Map([
  ["palestine", "Palestinian Territories"]
]);

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function locationKey(city, country, region = "") {
  return [city, region, country].map(normalizeKey).filter(Boolean).join("|");
}

function addUnique(index, key, coordinate) {
  if (!key) return;
  if (!Object.prototype.hasOwnProperty.call(index, key)) {
    index[key] = coordinate;
  } else if (index[key] !== coordinate) {
    index[key] = false;
  }
}

function buildCoordinateIndex(records) {
  const index = { exact: {}, country: {}, cityOnly: {} };

  records.forEach((record) => {
    const city = String(record.city || record.name || "").trim();
    const country = String(record.country || "").trim();
    const region = String(record.region || "").trim();
    if (!city || !country || !Number.isFinite(Number(record.lat)) || !Number.isFinite(Number(record.lng))) {
      return;
    }

    const cityNames = [city, ...asArray(record.aliases)];
    const countryNames = [country, ...asArray(record.countryAliases)];
    const regionNames = [region, ...asArray(record.regionAliases)].filter(Boolean);

    cityNames.forEach((cityName) => {
      countryNames.forEach((countryName) => {
        addUnique(index.country, locationKey(cityName, countryName), record);
        regionNames.forEach((regionName) => {
          addUnique(index.exact, locationKey(cityName, countryName, regionName), record);
        });
      });
      addUnique(index.cityOnly, normalizeKey(cityName), record);
    });
  });

  return index;
}

function hasCoordinate(record, index) {
  if (Number.isFinite(Number(record.lat)) && Number.isFinite(Number(record.lng))) return true;

  const city = String(record.city || record.name || "").trim();
  const country = String(record.country || "").trim();
  const region = String(record.region || "").trim();
  if (!city) return false;

  if (region && country && index.exact[locationKey(city, country, region)]) return true;
  if (country && index.country[locationKey(city, country)]) return true;
  return !country && Boolean(index.cityOnly[normalizeKey(city)]);
}

function expandTravelRecords(records) {
  const expanded = [];

  records.forEach((record = {}) => {
    const cities = Array.isArray(record.cities)
      ? record.cities
      : (Array.isArray(record.city) ? record.city : null);

    if (!cities) {
      expanded.push(record);
      return;
    }

    cities.forEach((cityEntry) => {
      const item = {};
      Object.keys(record).forEach((key) => {
        if (key !== "cities" && key !== "city") item[key] = record[key];
      });

      if (typeof cityEntry === "string") {
        item.city = cityEntry;
      } else if (cityEntry && typeof cityEntry === "object") {
        Object.assign(item, cityEntry);
        item.city = cityEntry.city || cityEntry.name || item.city;
        item.country = cityEntry.country || item.country;
        item.region = cityEntry.region || item.region;
      }

      expanded.push(item);
    });
  });

  return expanded;
}

function roundCoordinate(value) {
  return Math.round(Number(value) * 100) / 100;
}

function geocoderCountryName(country) {
  return geocoderCountryAliases.get(normalizeKey(country)) || country;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        Referer: "https://www.biodong.com/travel/",
        "User-Agent": "biodong-travel-map/1.0 (https://www.biodong.com/travel/)"
      }
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(`Geocoder returned HTTP ${response.statusCode}.`);
          error.statusCode = response.statusCode;
          reject(error);
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Geocoder returned invalid JSON: ${error.message}`));
        }
      });
    });

    request.setTimeout(15000, () => request.destroy(new Error("Geocoder request timed out.")));
    request.on("error", reject);
  });
}

async function geocode(record) {
  const url = new URL(geocoderUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("featureType", "settlement");
  url.searchParams.set("city", record.city);
  url.searchParams.set("country", geocoderCountryName(record.country));
  if (record.region) url.searchParams.set("state", record.region);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const results = await requestJson(url);
      const result = Array.isArray(results) ? results[0] : null;
      if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) {
        throw new Error("No matching settlement was returned.");
      }
      return result;
    } catch (error) {
      const retryable = error.statusCode === 429 || error.statusCode >= 500;
      if (!retryable || attempt === 1) throw error;
      await sleep(2200);
    }
  }

  return null;
}

function compareCoordinates(left, right) {
  return [left.city, left.region, left.country]
    .map((value) => String(value || ""))
    .join("|")
    .localeCompare(
      [right.city, right.region, right.country]
        .map((value) => String(value || ""))
        .join("|"),
      "en",
      { sensitivity: "base" }
    );
}

async function main() {
  const [travelText, coordinateText] = await Promise.all([
    readFile(travelFile, "utf8"),
    readFile(coordinateFile, "utf8")
  ]);
  const travelRecords = JSON.parse(travelText);
  const coordinateRecords = JSON.parse(coordinateText);

  if (!Array.isArray(travelRecords) || !Array.isArray(coordinateRecords)) {
    throw new Error("Travel data and coordinate data must both be JSON arrays.");
  }

  const coordinateIndex = buildCoordinateIndex(coordinateRecords);
  const missingByKey = new Map();

  expandTravelRecords(travelRecords).forEach((record) => {
    const city = String(record.city || record.name || "").trim();
    const country = String(record.country || "").trim();
    const region = String(record.region || "").trim();
    if (!city || hasCoordinate(record, coordinateIndex)) return;
    missingByKey.set(locationKey(city, country, region), { city, country, region });
  });

  const missing = [...missingByKey.values()];
  if (!missing.length) {
    console.log("All travel cities already have cached coordinates.");
    return;
  }

  const failures = [];
  for (let index = 0; index < missing.length; index += 1) {
    const location = missing[index];
    const label = [location.city, location.region, location.country].filter(Boolean).join(", ");

    if (!location.country) {
      failures.push(`${label}: country is required for automatic lookup.`);
      continue;
    }

    if (index > 0) await sleep(requestDelayMs);
    try {
      const result = await geocode(location);
      const coordinate = {
        city: location.city,
        country: location.country,
        ...(location.region ? { region: location.region } : {}),
        lat: roundCoordinate(result.lat),
        lng: roundCoordinate(result.lon),
        source: "OpenStreetMap"
      };
      coordinateRecords.push(coordinate);
      console.log(`Resolved ${label}: ${coordinate.lat}, ${coordinate.lng}`);
    } catch (error) {
      failures.push(`${label}: ${error.message}`);
    }
  }

  coordinateRecords.sort(compareCoordinates);
  await writeFile(coordinateFile, `${JSON.stringify(coordinateRecords, null, 2)}\n`, "utf8");

  if (failures.length) {
    throw new Error(`Could not resolve:\n- ${failures.join("\n- ")}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
