(function () {
  var shell = document.querySelector("[data-travel-map]");
  var mapNode = document.getElementById("travel-map");

  if (!shell || !mapNode || typeof L === "undefined") return;

  var listNode = document.getElementById("travel-city-list");
  var summaryNode = document.getElementById("travel-map-summary");
  var filterNode = document.getElementById("travel-filter-group");
  var searchNode = document.getElementById("travel-search");
  var dataSource = shell.getAttribute("data-source") || "/data/travel-cities.json";
  var coordinateSource = shell.getAttribute("data-coordinate-source") || "/data/travel-city-coordinates.json";
  var activeKind = "all";
  var cityRecords = [];
  var coordinateIndex = { exact: {}, country: {}, cityOnly: {} };
  var markerByIndex = {};

  var colors = {
    Travel: "#b85f38",
    Research: "#244f73",
    Study: "#7b4b92",
    Lived: "#4f7461",
    Hiking: "#8a6f20",
    Other: "#006c7b"
  };

  var map = L.map(mapNode, {
    scrollWheelZoom: false,
    worldCopyJump: true
  }).setView([24, 20], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 11,
    minZoom: 2
  }).addTo(map);

  var markerLayer = L.layerGroup().addTo(map);

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(value) {
    var url = String(value || "").trim();
    if (!url) return "";
    if (!/^(https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(url)) return "";

    try {
      var parsed = new URL(url, window.location.origin);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
    } catch (error) {
      return "";
    }
  }

  function roundCoordinate(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.round(number * 100) / 100;
  }

  function normalizeKey(value) {
    var text = String(value || "").trim().toLowerCase();
    if (text.normalize) {
      text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return text.replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function locationKey(city, country, region) {
    return [city, region, country]
      .map(normalizeKey)
      .filter(Boolean)
      .join("|");
  }

  function addUnique(index, key, coordinate) {
    if (!key) return;
    if (!Object.prototype.hasOwnProperty.call(index, key)) {
      index[key] = coordinate;
    } else if (index[key] !== coordinate) {
      index[key] = false;
    }
  }

  function normalizeCoordinate(record) {
    record = record || {};
    var lat = roundCoordinate(record.lat);
    var lng = roundCoordinate(record.lng);
    var city = String(record.city || record.name || "").trim();
    var country = String(record.country || "").trim();
    var region = String(record.region || "").trim();

    if (!city || !country || lat === null || lng === null) return null;

    return {
      city: city,
      country: country,
      region: region,
      aliases: asArray(record.aliases),
      countryAliases: asArray(record.countryAliases),
      regionAliases: asArray(record.regionAliases),
      lat: lat,
      lng: lng
    };
  }

  function buildCoordinateIndex(records) {
    var index = { exact: {}, country: {}, cityOnly: {} };

    (Array.isArray(records) ? records : []).forEach(function (record) {
      var coordinate = normalizeCoordinate(record);
      if (!coordinate) return;

      var cityNames = [coordinate.city].concat(coordinate.aliases);
      var countryNames = [coordinate.country].concat(coordinate.countryAliases);
      var regionNames = [coordinate.region].concat(coordinate.regionAliases).filter(Boolean);

      cityNames.forEach(function (cityName) {
        countryNames.forEach(function (countryName) {
          addUnique(index.country, locationKey(cityName, countryName), coordinate);
          regionNames.forEach(function (regionName) {
            addUnique(index.exact, locationKey(cityName, countryName, regionName), coordinate);
          });
        });

        addUnique(index.cityOnly, normalizeKey(cityName), coordinate);
      });
    });

    return index;
  }

  function lookupCoordinate(record) {
    var exactKey = locationKey(record.city, record.country, record.region);
    var countryKey = locationKey(record.city, record.country);
    var cityKey = normalizeKey(record.city);

    if (record.region && exactKey && coordinateIndex.exact[exactKey]) {
      return coordinateIndex.exact[exactKey];
    }

    if (countryKey && coordinateIndex.country[countryKey]) {
      return coordinateIndex.country[countryKey];
    }

    if (!record.country && cityKey && coordinateIndex.cityOnly[cityKey]) {
      return coordinateIndex.cityOnly[cityKey];
    }

    return null;
  }

  function normalizeRecord(record, index) {
    record = record || {};
    var city = String(record.city || record.name || "").trim();
    var country = String(record.country || "").trim();
    var region = String(record.region || "").trim();
    var note = String(record.note || "").trim();
    var explicitUrl = safeUrl(record.url || record.link);
    var noteUrl = safeUrl(note);
    var directLat = roundCoordinate(record.lat);
    var directLng = roundCoordinate(record.lng);
    var coordinate = directLat !== null && directLng !== null
      ? { lat: directLat, lng: directLng }
      : lookupCoordinate({ city: city, country: country, region: region });

    return {
      index: index,
      city: city || (coordinate && coordinate.city) || "",
      country: country || (coordinate && coordinate.country) || "",
      region: region || (coordinate && coordinate.region) || "",
      lat: coordinate ? coordinate.lat : null,
      lng: coordinate ? coordinate.lng : null,
      year: record.year ? String(record.year).trim() : "",
      kind: String(record.kind || "Travel").trim() || "Travel",
      note: noteUrl && !explicitUrl ? "Read related post" : note,
      url: explicitUrl || noteUrl,
      missingCoordinate: !coordinate
    };
  }

  function expandTravelRecords(records) {
    var expanded = [];

    (Array.isArray(records) ? records : []).forEach(function (record) {
      record = record || {};
      var cities = Array.isArray(record.cities)
        ? record.cities
        : (Array.isArray(record.city) ? record.city : null);

      if (!cities) {
        expanded.push(record);
        return;
      }

      cities.forEach(function (cityEntry) {
        var item = {};
        Object.keys(record).forEach(function (key) {
          if (key !== "cities" && key !== "city") item[key] = record[key];
        });

        if (typeof cityEntry === "string") {
          item.city = cityEntry;
        } else if (cityEntry && typeof cityEntry === "object") {
          Object.keys(cityEntry).forEach(function (key) {
            item[key] = cityEntry[key];
          });
          item.city = cityEntry.city || cityEntry.name || item.city;
          item.country = cityEntry.country || item.country;
          item.region = cityEntry.region || item.region;
        }

        expanded.push(item);
      });
    });

    return expanded;
  }

  function uniqueKinds(records) {
    return records
      .map(function (record) { return record.kind; })
      .filter(function (kind, index, all) { return all.indexOf(kind) === index; })
      .sort();
  }

  function recordMatches(record) {
    var query = searchNode ? searchNode.value.trim().toLowerCase() : "";
    var text = [record.city, record.region, record.country, record.year, record.kind, record.note]
      .join(" ")
      .toLowerCase();

    return (activeKind === "all" || record.kind === activeKind) &&
      (!query || text.indexOf(query) !== -1);
  }

  function yearRange(value) {
    var matches = String(value || "").match(/\d{4}/g) || [];
    return {
      start: matches.length ? Number(matches[0]) : Infinity,
      end: matches.length ? Number(matches[matches.length - 1]) : Infinity
    };
  }

  function compareByYear(left, right) {
    var leftRange = yearRange(left.year);
    var rightRange = yearRange(right.year);

    if (leftRange.start !== rightRange.start) return leftRange.start - rightRange.start;
    if (leftRange.end !== rightRange.end) return leftRange.end - rightRange.end;
    return left.index - right.index;
  }

  function popupHtml(record) {
    var location = [record.city, record.region, record.country].filter(Boolean).join(", ");
    var meta = [record.kind, record.year].filter(Boolean).join(" / ");
    var noteText = record.note || (record.url ? "Read related post" : "");
    var note = noteText
      ? "<p>" + (record.url
        ? '<a href="' + escapeHtml(record.url) + '">' + escapeHtml(noteText) + "</a>"
        : escapeHtml(noteText)) + "</p>"
      : "";

    return '<strong>' + escapeHtml(location || "Unnamed city") + '</strong>' +
      (meta ? '<span class="travel-popup-meta">' + escapeHtml(meta) + '</span>' : "") +
      note;
  }

  function createFilterButton(kind, label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "travel-filter" + (activeKind === kind ? " is-active" : "");
    button.setAttribute("data-kind", kind);
    button.textContent = label;
    button.addEventListener("click", function () {
      activeKind = kind;
      render();
    });
    return button;
  }

  function renderFilters() {
    if (!filterNode) return;
    filterNode.innerHTML = "";
    filterNode.appendChild(createFilterButton("all", "All"));
    uniqueKinds(cityRecords).forEach(function (kind) {
      filterNode.appendChild(createFilterButton(kind, kind));
    });
  }

  function focusRecord(index) {
    var marker = markerByIndex[index];
    if (!marker) return;
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 5), { animate: true });
    marker.openPopup();
  }

  function renderList(records) {
    if (!listNode) return;
    listNode.innerHTML = "";

    records.forEach(function (record) {
      var item = document.createElement("li");
      var card = document.createElement("div");
      var button = document.createElement("button");
      var title = [record.city, record.region, record.country].filter(Boolean).join(", ");
      var meta = [record.kind, record.year].filter(Boolean).join(" / ");
      var noteText = record.note || (record.url ? "Read related post" : "");

      button.type = "button";
      button.className = "travel-city-focus";
      button.setAttribute("aria-label", "Show " + (title || "city") + " on map");
      button.addEventListener("click", function () {
        focusRecord(record.index);
      });

      card.className = "travel-city-card";
      card.appendChild(button);

      var titleNode = document.createElement("span");
      titleNode.className = "travel-city-title";
      titleNode.textContent = title || "Unnamed city";
      card.appendChild(titleNode);

      if (meta) {
        var metaNode = document.createElement("span");
        metaNode.className = "travel-city-meta";
        metaNode.textContent = meta;
        card.appendChild(metaNode);
      }

      if (noteText) {
        var note = document.createElement(record.url ? "a" : "span");
        note.className = "travel-city-note" + (record.url ? " travel-city-link" : "");
        note.textContent = noteText;
        if (record.url) note.href = record.url;
        card.appendChild(note);
      }

      if (record.missingCoordinate) {
        var warning = document.createElement("span");
        warning.className = "travel-city-warning";
        warning.textContent = "Coordinate not found in the city table.";
        card.appendChild(warning);
      }

      item.appendChild(card);
      listNode.appendChild(item);
    });
  }

  function renderSummary(records) {
    if (!summaryNode) return;

    if (!cityRecords.length) {
      summaryNode.textContent = "No city entries yet. Add English city and country records to /data/travel-cities.json.";
      return;
    }

    var mappedRecords = records.filter(function (record) { return !record.missingCoordinate; });
    var missingCount = records.length - mappedRecords.length;
    var countries = records
      .map(function (record) { return record.country; })
      .filter(Boolean)
      .filter(function (country, index, all) { return all.indexOf(country) === index; });

    summaryNode.textContent = mappedRecords.length + " mapped cities shown" +
      (countries.length ? " across " + countries.length + " countries or regions" : "") +
      (missingCount ? ". " + missingCount + " entries need a city-center coordinate." : ". Coordinates are rounded before display.");
  }

  function render() {
    var visibleRecords = cityRecords.filter(recordMatches);
    var mappedRecords = visibleRecords.filter(function (record) { return !record.missingCoordinate; });
    markerByIndex = {};
    markerLayer.clearLayers();
    renderFilters();

    mappedRecords.forEach(function (record) {
      var color = colors[record.kind] || colors.Other;
      var marker = L.circleMarker([record.lat, record.lng], {
        radius: 7,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92
      }).bindPopup(popupHtml(record));

      markerByIndex[record.index] = marker;
      marker.addTo(markerLayer);
    });

    renderList(visibleRecords);
    renderSummary(visibleRecords);

    if (mappedRecords.length) {
      var bounds = L.latLngBounds(mappedRecords.map(function (record) {
        return [record.lat, record.lng];
      }));
      map.fitBounds(bounds.pad(0.28), { maxZoom: 5 });
    } else {
      map.setView([24, 20], 2);
    }
  }

  if (searchNode) {
    searchNode.addEventListener("input", render);
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load " + url);
        return response.text();
      })
      .then(function (source) {
        try {
          return JSON.parse(source);
        } catch (error) {
          var lineMatch = String(error.message || "").match(/line\s+(\d+)/i);
          var positionMatch = String(error.message || "").match(/position\s+(\d+)/i);
          var line = lineMatch ? Number(lineMatch[1]) : null;

          if (!line && positionMatch) {
            line = source.slice(0, Number(positionMatch[1])).split(/\r?\n/).length;
          }

          var message = "Invalid JSON in " + url +
            (line ? " near line " + line : "") +
            ". Check commas and quotation marks.";
          var parseError = new Error(message);
          parseError.userMessage = message;
          throw parseError;
        }
      });
  }

  Promise.all([fetchJson(dataSource), fetchJson(coordinateSource)])
    .then(function (results) {
      coordinateIndex = buildCoordinateIndex(results[1]);
      return results[0];
    })
    .then(function (records) {
      cityRecords = expandTravelRecords(records)
        .map(normalizeRecord)
        .sort(compareByYear);
      render();
    })
    .catch(function (error) {
      if (summaryNode) {
        summaryNode.textContent = error.userMessage || error.message ||
          "The travel city data or coordinate table could not be loaded.";
      }
    });
}());
