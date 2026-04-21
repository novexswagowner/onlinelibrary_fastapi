(function () {
  const state = {
    page: 1,
    page_size: 10,
    search: "",
    sort_by: "date_desc",
  };

  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  function stars(rating) {
    const r = Math.min(5, Math.max(0, Number(rating) || 0));
    const full = Math.round(r);
    let html = "";
    for (let i = 0; i < full; i++) html += "★";
    for (let i = full; i < 5; i++) html += "☆";
    return `<span class="stars" title="${r.toFixed(1)} / 5">${html}</span>`;
  }

  async function load() {
    const list = document.getElementById("books-list");
    const meta = document.getElementById("books-meta");
    const err = document.getElementById("books-error");
    err.textContent = "";
    list.innerHTML = '<p class="muted">Загрузка каталога…</p>';

    const params = new URLSearchParams({
      page: String(state.page),
      page_size: String(state.page_size),
      sort_by: state.sort_by,
    });
    if (state.search) params.set("search", state.search);

    const pb = pagesBase();

    try {
      const data = await window.LibraryAPI.apiFetch(`/api/books?${params}`);
      const items = data.items || [];
      meta.textContent = `Страница ${data.page} из ${Math.max(
        1,
        Math.ceil((data.total || 0) / data.page_size)
      )} · всего ${data.total} книг`;

      if (!items.length) {
        list.innerHTML = '<p class="muted">Ничего не найдено.</p>';
        return;
      }

      list.innerHTML = items
        .map(
          (b) => `
        <article class="book-card">
          <a class="book-card-link" href="${pb}/book.html?id=${b.id}">
            <h3 class="book-card-title">${escapeHtml(b.title)}</h3>
            <p class="book-card-author">${escapeHtml(b.author)}</p>
            <p class="book-card-desc">${escapeHtml(truncate(b.description, 160))}</p>
            <div class="book-card-footer">
              ${stars(b.average_rating)}
              <span class="book-card-meta">${b.has_file ? "Файл" : "Текст"}</span>
            </div>
          </a>
        </article>`
        )
        .join("");

      const prev = document.getElementById("books-prev");
      const next = document.getElementById("books-next");
      prev.disabled = state.page <= 1;
      const totalPages = Math.max(1, Math.ceil((data.total || 0) / data.page_size));
      next.disabled = state.page >= totalPages;
    } catch (e) {
      err.textContent = e.message || "Ошибка загрузки";
      list.innerHTML = "";
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function truncate(s, n) {
    const t = (s || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 1) + "…";
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("books-filters");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        state.search = document.getElementById("books-search").value.trim();
        state.sort_by = document.getElementById("books-sort").value;
        state.page = 1;
        load();
      });
    }
    document.getElementById("books-prev")?.addEventListener("click", () => {
      if (state.page > 1) {
        state.page -= 1;
        load();
      }
    });
    document.getElementById("books-next")?.addEventListener("click", () => {
      state.page += 1;
      load();
    });
    load();
  });
})();
