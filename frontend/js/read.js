(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  function getId() {
    const p = new URLSearchParams(window.location.search);
    const id = Number(p.get("id"));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const id = getId();
    const root = document.getElementById("read-root");
    const err = document.getElementById("read-error");
    const pb = pagesBase();
    if (!id) {
      err.textContent = "Не указана книга.";
      return;
    }
    if (!window.LibraryAuth.isLoggedIn()) {
      err.innerHTML = `Чтение доступно после <a href="${pb}/login.html">входа</a>. Регистрация — <a href="${pb}/register.html">здесь</a>.`;
      return;
    }

    try {
      const b = await window.LibraryAPI.apiFetch(`/api/books/${id}/content`);
      document.title = `Чтение: ${b.title}`;
      root.innerHTML = `
        <header class="read-head">
          <a class="link-back" href="${pb}/book.html?id=${id}">← К карточке</a>
          <h1>${escapeHtml(b.title)}</h1>
          <p class="muted">${escapeHtml(b.author)}</p>
        </header>
        <article class="read-body prose">${escapeHtml(b.content).replace(/\n/g, "<br>")}</article>
      `;
    } catch (e) {
      err.textContent =
        e.status === 401 || e.status === 403
          ? "Недостаточно прав для чтения этой книги. Войдите как читатель."
          : e.message || "Не удалось загрузить текст";
    }
  });
})();
