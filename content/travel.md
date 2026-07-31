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

<script>
(function () {
  "use strict";

  var kind_labels = {
    All: "全部",
    Travel: "旅行",
    Conference: "会议",
    Research: "学术交流",
    Study: "学习",
    Work: "工作",
    Lived: "工作与居住",
    Hiking: "徒步",
    Other: "其他"
  };

  function translate_kind(text) {
    var value = String(text || "").trim();
    return kind_labels[value] || value;
  }

  function translate_meta(text) {
    var parts = String(text || "").split(" / ");
    if (parts.length && kind_labels[parts[0]]) parts[0] = kind_labels[parts[0]];
    return parts.join(" / ");
  }

  function translate_summary(text) {
    var value = String(text || "");
    var match;

    if (value === "No cities match the current search or filter.") {
      return "没有符合当前搜索或筛选条件的城市。";
    }

    if (value.indexOf("No city entries yet.") === 0) {
      return "尚无城市记录。";
    }

    match = value.match(/^(\d+) mapped cities shown(?: across (\d+) countries or regions)?(?:\. (\d+) entries need a city-center coordinate\.|\. Coordinates are rounded before display\.) Showing (\d+)-(\d+) of (\d+) cards\.$/);
    if (match) {
      var result = "共显示 " + match[1] + " 个城市";
      if (match[2]) result += "，分布于 " + match[2] + " 个国家或地区";
      if (match[3]) result += "；其中 " + match[3] + " 条记录缺少城市中心坐标";
      result += "。当前显示第 " + match[4] + "–" + match[5] + " 条，共 " + match[6] + " 条记录。";
      return result;
    }

    return value;
  }

  function translate_interface() {
    document.querySelectorAll("#travel-filter-group .travel-filter").forEach(function (button) {
      button.textContent = translate_kind(button.textContent);
    });

    document.querySelectorAll(".travel-city-meta, .travel-popup-meta").forEach(function (node) {
      node.textContent = translate_meta(node.textContent);
    });

    document.querySelectorAll(".travel-city-warning").forEach(function (node) {
      if (node.textContent.trim() === "Coordinate not found in the city table.") {
        node.textContent = "未在城市坐标表中找到对应坐标。";
      }
    });

    document.querySelectorAll(".travel-city-focus").forEach(function (button) {
      var label = button.getAttribute("aria-label") || "";
      var match = label.match(/^Show (.+) on map$/);
      if (match) button.setAttribute("aria-label", "在地图上显示 " + match[1]);
    });

    document.querySelectorAll("#travel-pagination .travel-page-button").forEach(function (button) {
      var label = button.getAttribute("aria-label") || "";
      if (label === "Previous page") label = "上一页";
      else if (label === "Next page") label = "下一页";
      else if (/^Page \d+$/.test(label)) label = "第 " + label.replace("Page ", "") + " 页";
      if (label) {
        button.setAttribute("aria-label", label);
        button.title = label;
      }
    });

    var summary = document.getElementById("travel-map-summary");
    if (summary) summary.textContent = translate_summary(summary.textContent);
  }

  var observer = new MutationObserver(translate_interface);
  var shell = document.querySelector("[data-travel-map]");

  if (shell) {
    observer.observe(shell, { childList: true, subtree: true, characterData: true });
    translate_interface();
  }
}());
</script>
