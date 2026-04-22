(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  function fileDownloadUrl(bookId) {
    const prefix = (window.LIBRARY_API_BASE ?? "").replace(/\/$/, "");
    const path = `/api/books/${bookId}/file?download=1`;
    return prefix ? `${prefix}${path}` : path;
  }

  function getId() {
    const p = new URLSearchParams(window.location.search);
    const id = Number(p.get("id"));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = getId();
    const root = document.getElementById("book-root");
    const err = document.getElementById("book-error");
    const pb = pagesBase();
    if (!id) {
      err.textContent = "Не указана книга.";
      return;
    }

    let staffLink = "";
    if (window.LibraryAuth.isLoggedIn()) {
      try {
        const me = await window.LibraryAPI.apiFetch("/api/users/me");
        if (me.role === "admin" || me.role === "librarian") {
          staffLink = `<a class="btn btn-ghost" href="${pb}/staff-edit.html?id=${id}">Редактировать</a>`;
        }
      } catch {
        staffLink = "";
      }
    }

    try {
      const b = await window.LibraryAPI.apiFetch(`/api/books/${id}`);
      document.title = `${b.title} — Онлайн-библиотека`;
      root.innerHTML = `
        <header class="book-hero">
          <h1>${escapeHtml(b.title)}</h1>
          <p class="lead">${escapeHtml(b.author)}</p>
          <p class="book-desc">${escapeHtml(b.description)}</p>
          <div class="book-actions">
            <a class="btn btn-primary" href="${pb}/read.html?id=${id}">Читать онлайн</a>
            ${staffLink}
            ${
              b.has_file
                ? `<a class="btn btn-ghost" href="${escapeHtml(
                    fileDownloadUrl(id)
                  )}" target="_blank" rel="noopener">Скачать файл</a>`
                : ""
            }
          </div>
          <p class="muted small">Средняя оценка: ${Number(b.average_rating).toFixed(1)} / 5</p>
        </header>
        <section class="card rate-card" id="rate-section" hidden>
          <h2>Оценить книгу</h2>
          <form id="rate-form" class="rate-form">
            <label for="rate-score">Оценка (1–5)</label>
            <select id="rate-score" name="score">
              <option value="5">5 — отлично</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1 — слабо</option>
            </select>
            <button type="submit" class="btn btn-primary">Отправить</button>
          </form>
          <p id="rate-msg" class="muted small"></p>
        </section>
      `;

      if (window.LibraryAuth.isLoggedIn()) {
        document.getElementById("rate-section").hidden = false;
        document.getElementById("rate-form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const msg = document.getElementById("rate-msg");
          msg.textContent = "";
          const score = Number(document.getElementById("rate-score").value);
          try {
            await window.LibraryAPI.apiFetch(`/api/books/${id}/rate`, {
              method: "POST",
              body: JSON.stringify({ score }),
            });
            msg.textContent = "Спасибо, оценка сохранена.";
          } catch (ex) {
            msg.textContent = ex.message || "Не удалось сохранить оценку";
          }
        });
      }
    } catch (e) {
      err.textContent = e.message || "Книга не найдена";
    }
  });
})();
