---
title: "足迹地图"
slug: "travel"
disable_comments: true
disable_mathjax: true
disable_highlight: true
travel_map: true
---

<p class="travel-lede">按城市级别展示去过的地方：</p>

<section class="travel-map-shell" data-travel-map data-source="/data/travel-cities.json" data-coordinate-source="/data/travel-city-coordinates.json" aria-label="足迹地图">
  <div class="travel-map-controls">
    <label class="travel-search">
      <span>搜索</span>
      <input id="travel-search" type="search" placeholder="输入城市、国家或备注" autocomplete="off">
    </label>
    <div class="travel-filter-group" id="travel-filter-group" aria-label="按类型筛选城市"></div>
  </div>

  <div id="travel-map" class="travel-map" role="region" aria-label="去过的城市地图"></div>
  <p class="travel-map-summary" id="travel-map-summary" aria-live="polite"></p>
  <ol class="travel-city-list" id="travel-city-list"></ol>
  <nav class="travel-pagination" id="travel-pagination" aria-label="城市列表分页" hidden></nav>
</section>
