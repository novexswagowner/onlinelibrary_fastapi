(function () {
  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.LibraryAuth.isLoggedIn()) {
      window.location.href = `${pagesBase()}/login.html`;
      return;
    }
    try {
      const me = await window.LibraryAPI.apiFetch("/api/users/me");
      if (me.role !== "admin" && me.role !== "librarian") {
        document.getElementById("staff-new-error").textContent =
          "Нужна роль библиотекаря или администратора.";
        return;
      }
    } catch (e) {
      document.getElementById("staff-new-error").textContent = e.message || "Ошибка";
      return;
    }

    const form = document.getElementById("staff-new-form");
    const err = document.getElementById("staff-new-error");
    const ok = document.getElementById("staff-new-ok");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      ok.textContent = "";
      const title = document.getElementById("sn-title").value.trim();
      const author = document.getElementById("sn-author").value.trim();
      const description = document.getElementById("sn-desc").value.trim();
      const content = document.getElementById("sn-content").value;
      const file_url_raw = document.getElementById("sn-url").value.trim();
      const payload = {
        title,
        author,
        description,
        content,
        file_url: file_url_raw || null,
      };
      try {
        const book = await window.LibraryAPI.apiFetch("/api/books", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        ok.textContent = `Книга создана, id=${book.id}.`;
        form.reset();
      } catch (ex) {
        err.textContent = ex.message || "Ошибка создания";
      }
    });
  });
})();
