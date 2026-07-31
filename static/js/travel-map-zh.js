(function () {
  "use strict";

  var kind_labels = {
    all: "全部",
    Travel: "旅行",
    Research: "科研交流",
    Study: "学习",
    Lived: "工作与生活",
    Hiking: "徒步",
    Conference: "学术会议",
    Work: "工作",
    Other: "其他"
  };

  function translate_kind(value) {
    return kind_labels[value] || value;
  }

  function translate_meta(text) {
    var parts = String(text || "").split(" / ");
    if (parts.length && kind_labels[parts[0]]) parts[0] = translate_kind(parts[0]);
    return parts.join(" / ");
  }

  function translate_summary(text) {
    var value = String(text || "");
    var match;

    if (value === "No city entries yet. Add English city and country records to /data/travel-cities.json.") {
      return "暂无城市记录。请在 /data/travel-cities.json 中添加英文城市和国家信息。";
    }

    if (value === "No cities match the current search or filter.") {
      return "没有符合当前搜索或筛选条件的城市。";
    }

    match = value.match(/^(\d+) mapped cities shown(?: across (\d+) countries or regions)?\. Coordinates are rounded before display\. Showing (\d+)-(\d+) of (\d+) cards\.$/);
    if (match) {
      return "共显示 " + match[1] + " 个城市" +
        (match[2] ? "，分布于 " + match[2] + " 个国家或地区" : "") +
        "。当前显示第 " + match[3] + "–" + match[4] + " 条，共 " + match[5] + " 条记录。";
    }

    match = value.match(/^(\d+) mapped cities shown(?: across (\d+) countries or regions)?\. (\d+) entries need a city-center coordinate\. Showing (\d+)-(\d+) of (\d+) cards\.$/);
    if (match) {
      return "共显示 " + match[1] + " 个城市" +
        (match[2] ? "，分布于 " + match[2] + " 个国家或地区" : "") +
        "。其中 " + match[3] + " 条记录缺少城市中心坐标。当前显示第 " +
        match[4] + "–" + match[5] + " 条，共 " + match[6] + " 条记录。";
    }

    return value;
  }

  function translate_node(node) {
    if (!node || node.nodeType !== 1) return;

    if (node.matches(".travel-filter")) {
      var kind = node.getAttribute("data-kind");
      node.textContent = translate_kind(kind || node.textContent.trim());
    }

    if (node.matches(".travel-city-meta, .travel-popup-meta")) {
      node.textContent = translate_meta(node.textContent);
    }

    if (node.matches(".travel-city-warning") &&
        node.textContent.trim() === "Coordinate not found in the city table.") {
      node.textContent = "未在城市坐标表中找到对应坐标。";
    }

    if (node.matches(".travel-map-summary")) {
      node.textContent = translate_summary(node.textContent);
    }

    if (node.matches(".travel-page-button")) {
      var label = node.getAttribute("aria-label") || "";
      var page_match = label.match(/^Page (\d+)$/);

      if (label === "Previous page") label = "上一页";
      if (label === "Next page") label = "下一页";
      if (page_match) label = "第 " + page_match[1] + " 页";

      if (label) {
        node.setAttribute("aria-label", label);
        node.title = label;
      }
    }

    if (node.matches(".travel-city-focus")) {
      var aria = node.getAttribute("aria-label") || "";
      var show_match = aria.match(/^Show (.+) on map$/);
      if (show_match) node.setAttribute("aria-label", "在地图上显示 " + show_match[1]);
    }

    node.querySelectorAll(".travel-filter, .travel-city-meta, .travel-popup-meta, .travel-city-warning, .travel-map-summary, .travel-page-button, .travel-city-focus")
      .forEach(translate_node);
  }

  function translate_interface() {
    var shell = document.querySelector("[data-travel-map]");
    if (!shell) return;

    var search_label = shell.querySelector(".travel-search span");
    var search_input = shell.querySelector("#travel-search");
    var map = shell.querySelector("#travel-map");
    var filters = shell.querySelector("#travel-filter-group");
    var pagination = shell.querySelector("#travel-pagination");

    if (search_label) search_label.textContent = "搜索";
    if (search_input) {
      search_input.placeholder = "输入城市、国家或备注";
      search_input.setAttribute("aria-label", "搜索城市、国家或备注");
    }
    if (map) map.setAttribute("aria-label", "足迹城市地图");
    if (filters) filters.setAttribute("aria-label", "按类型筛选城市");
    if (pagination) pagination.setAttribute("aria-label", "足迹城市分页");

    translate_node(shell);
  }

  document.addEventListener("DOMContentLoaded", function () {
    translate_interface();

    var shell = document.querySelector("[data-travel-map]");
    if (!shell || typeof MutationObserver === "undefined") return;

    new MutationObserver(function () {
      translate_interface();
    }).observe(shell, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}());
