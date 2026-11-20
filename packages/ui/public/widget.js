(function () {
  var BASE_URL = "https://stellar-explain.xyz";

  function getScriptBase() {
    var scripts = document.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf("widget.js") !== -1) {
        return src.replace(/\/widget\.js.*$/, "");
      }
    }
    return BASE_URL;
  }

  function initWidget(el) {
    var hash = el.getAttribute("data-hash");
    var address = el.getAttribute("data-address");
    var theme = el.getAttribute("data-theme") || "dark";

    if (!hash && !address) return;

    var base = getScriptBase();
    var path = hash
      ? "/widget/tx/" + encodeURIComponent(hash)
      : "/widget/account/" + encodeURIComponent(address);
    var src = base + path + (theme === "light" ? "?theme=light" : "");

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.style.cssText = [
      "border:none",
      "width:100%",
      "min-width:300px",
      "max-width:600px",
      "min-height:200px",
      "display:block",
      "border-radius:12px",
      "overflow:hidden",
    ].join(";");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", hash ? "Stellar Transaction" : "Stellar Account");
    iframe.setAttribute("scrolling", "no");

    // Auto-resize via postMessage (optional enhancement)
    iframe.onload = function () {
      try {
        var doc = iframe.contentDocument || iframe.contentWindow.document;
        if (doc && doc.body) {
          iframe.style.minHeight = doc.body.scrollHeight + "px";
        }
      } catch (e) {
        // cross-origin, use fallback height
        iframe.style.minHeight = "320px";
      }
    };

    el.style.display = "block";
    el.appendChild(iframe);
  }

  function init() {
    var widgets = document.querySelectorAll("#stellar-explain-widget, [data-stellar-widget]");
    for (var i = 0; i < widgets.length; i++) {
      initWidget(widgets[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();