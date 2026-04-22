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

  const FIELD_LABELS = {
    title: "Название",
    author: "Автор",
    description: "Описание",
    content: "Текст книги",
    file_url: "Ссылка на файл",
    email: "Email",
    password: "Пароль",
    full_name: "Имя",
    text: "Текст сообщения",
  };

  /**
   * Превращает detail из ответа FastAPI в строку для пользователя (без сырого JSON).
   * @param {unknown} detail
   */
  function formatHttpDetail(detail) {
    if (detail == null || detail === "") {
      return "Запрос не выполнен";
    }
    if (typeof detail === "string") {
      return detail;
    }
    if (Array.isArray(detail)) {
      const parts = detail.map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item && typeof item === "object") {
          const o = /** @type {{ msg?: string; message?: string; loc?: unknown[] }} */ (
            item
          );
          const msg = o.msg || o.message || "";
          const loc = Array.isArray(o.loc) ? o.loc : [];
          const last = loc.length ? loc[loc.length - 1] : "";
          const label =
            typeof last === "string" && FIELD_LABELS[last]
              ? FIELD_LABELS[last]
              : typeof last === "string" && last !== "body"
                ? last
                : "";
          if (msg && label) {
            return `${label}: ${msg}`;
          }
          return msg || "Проверьте введённые данные";
        }
        return String(item);
      });
      const out = parts.filter(Boolean).join(" ");
      return out || "Проверьте введённые данные";
    }
    if (typeof detail === "object") {
      const o = /** @type {Record<string, unknown>} */ (detail);
      if (typeof o.message === "string") {
        return o.message;
      }
      if (typeof o.msg === "string") {
        return o.msg;
      }
    }
    return "Запрос отклонён сервером";
  }

  /**
   * @param {unknown} data — тело ответа (уже разобранный JSON или строка)
   * @param {string} statusText
   * @param {number} status
   */
  function formatErrorPayload(data, statusText, status) {
    if (typeof data === "string" && data.trim()) {
      return data.length > 400 ? `${data.slice(0, 400)}…` : data;
    }
    if (data && typeof data === "object" && "detail" in data) {
      return formatHttpDetail(/** @type {{ detail: unknown }} */ (data).detail);
    }
    if (status === 401) {
      return "Нужно войти в аккаунт";
    }
    if (status === 403) {
      return "Недостаточно прав для этого действия";
    }
    if (status === 404) {
      return "Не найдено";
    }
    if (status === 422) {
      return "Проверьте поля формы";
    }
    return statusText || "Ошибка сервера";
  }

  /**
   * @param {string} path - path starting with /api/...
   * @param {RequestInit} [init]
   */
  async function apiFetch(path, init) {
    const url = apiUrl(path);
    const opts = init || {};
    const headers = new Headers(opts.headers || {});
    const body = opts.body;
    const isFormData =
      typeof FormData !== "undefined" && body instanceof FormData;
    if (
      !isFormData &&
      !headers.has("Content-Type") &&
      body &&
      typeof body === "string"
    ) {
      headers.set("Content-Type", "application/json");
    }
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(url, { ...opts, headers });
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
      const message = formatErrorPayload(data, res.statusText, res.status);
      const err = new Error(message);
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  window.LibraryAPI = {
    apiFetch,
    getToken,
    apiUrl,
    formatErrorPayload,
    formatHttpDetail,
  };
})();
