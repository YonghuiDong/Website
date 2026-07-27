# Travel map data

Edit `static/data/travel-cities.json` with English city and country names. A country can contain several cities in one record:

```json
{
  "country": "Italy",
  "year": 2008,
  "kind": "Study",
  "cities": ["Bologna", "Trento", "Florence"]
}
```

To make the note link to a related post, add a `url`. Relative site paths and full `https://` links are supported:

```json
{
  "country": "Thailand",
  "year": "2025",
  "kind": "Travel",
  "cities": ["Bangkok"],
  "note": "Read my Bangkok post",
  "url": "/cn/2025/bangkok/"
}
```

You can also put a full `https://` URL directly in `note`; the map will display it as `Read related post`.

Netlify automatically resolves uncached city centers before Hugo builds the site. The result is rounded to two decimal places and written to `static/data/travel-city-coordinates.json` in the build workspace. Website visitors only load this local file; their browsers do not contact the geocoding service.

To resolve and permanently save new coordinates in Git before publishing, run:

```sh
node scripts/resolve-travel-cities.mjs
```

When the site is previewed through blogdown in RStudio, the resolver runs before Hugo starts and then watches `travel-cities.json` for saved changes. Restart the R session once after installing this behavior so the project `.Rprofile` is reloaded.

For cities that share a name in the same country, add an optional `region`:

```json
{
  "city": "Cambridge",
  "region": "Massachusetts",
  "country": "United States"
}
```

Automatic lookup uses OpenStreetMap Nominatim. Only city, optional region, and country names are sent during the one-time lookup; no street address or itinerary is used.
