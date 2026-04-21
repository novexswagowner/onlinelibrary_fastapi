(function () {
  function getToken() {
    try {
      return localStorage.getItem("library_token");
    } catch {
      return null;
    }
  }

  function apiUrl(path) {
    const base = (window.LIBRARY_API_BASE ?? "").replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return base ? `${base}${p}` : p;
  }

  /**
   * @param {string} path - path starting with /api/...
   * @param {RequestInit} [init]
   */
  async function apiFetch(path, init) {
    const url = apiUrl(path);
    const headers = new Headers(init?.headers || {});
    if (!headers.has("Content-Type") && init?.body && typeof init.body === "string") {
      headers.set("Content-Type", "application/json");
    }
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(url, { ...init, headers });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const detail =
        data && typeof data === "object" && "detail" in data
          ? data.detail
          : data || res.statusText;
      const err = new Error(
        typeof detail === "string" ? detail : JSON.stringify(detail)
      );
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  window.LibraryAPI = { apiFetch, getToken, apiUrl };
})();
