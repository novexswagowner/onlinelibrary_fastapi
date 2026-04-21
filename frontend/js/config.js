(function () {
  function detectFrontendRoot() {
    const path = window.location.pathname || "";
    const j = path.indexOf("/frontend/");
    if (j >= 0) {
      return path.slice(0, j + "/frontend".length);
    }
    return "/frontend";
  }

  if (typeof window.LIBRARY_API_BASE === "undefined") {
    window.LIBRARY_API_BASE = window.location.origin;
  }
  if (typeof window.LIBRARY_STATIC === "undefined") {
    window.LIBRARY_STATIC = detectFrontendRoot();
  }
  const root = String(window.LIBRARY_STATIC).replace(/\/$/, "");
  window.LIBRARY_PAGES = `${root}/pages`;
})();
