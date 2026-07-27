---
title: "足迹地图"
slug: "travel"
disable_comments: true
disable_mathjax: true
disable_highlight: true
travel_map: true
---

<p class="travel-lede">按城市级别展示去过的地方：</p>

<section class="travel-map-shell" data-travel-map data-source="/data/travel-cities.json" data-coordinate-source="/data/travel-city-coordinates.json" aria-label="City-level travel map">
  <div class="travel-map-controls">
    <label class="travel-search">
      <span>Search</span>
      <input id="travel-search" type="search" placeholder="City, country, note" autocomplete="off">
    </label>
    <div class="travel-filter-group" id="travel-filter-group" aria-label="Filter cities by type"></div>
  </div>

  <div id="travel-map" class="travel-map" role="region" aria-label="Map of traveled cities"></div>
  <p class="travel-map-summary" id="travel-map-summary" aria-live="polite"></p>
  <ol class="travel-city-list" id="travel-city-list"></ol>
  <nav class="travel-pagination" id="travel-pagination" aria-label="Travel city pages" hidden></nav>
</section>
