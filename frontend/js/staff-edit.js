(function () {
  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  function getId() {
    const p = new URLSearchParams(window.location.search);
    const id = Number(p.get("id"));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const pb = pagesBase();
    if (!window.LibraryAuth.isLoggedIn()) {
      window.location.href = `${pb}/login.html`;
      return;
    }
    try {
      const me = await window.LibraryAPI.apiFetch("/api/users/me");
      if (me.role !== "admin" && me.role !== "librarian") {
        document.getElementById("staff-edit-error").textContent =
          "Нужна роль библиотекаря или администратора.";
        return;
      }
    } catch (e) {
      document.getElementById("staff-edit-error").textContent = e.message || "Ошибка";
      return;
    }

    const id = getId();
    const err = document.getElementById("staff-edit-error");
    const msg = document.getElementById("staff-edit-msg");
    if (!id) {
      err.textContent = "Укажите id в query, например staff-edit.html?id=1";
      return;
    }

    const form = document.getElementById("staff-edit-form");
    const replaceForm = document.getElementById("staff-replace-file-form");

    async function loadBook() {
      err.textContent = "";
      msg.textContent = "";
      try {
        const b = await window.LibraryAPI.apiFetch(`/api/books/${id}`);
        document.getElementById("se-title").value = b.title;
        document.getElementById("se-author").value = b.author;
        document.getElementById("se-desc").value = b.description;
        document.getElementById("se-url").value = b.file_url || "";
        let content = "";
        try {
          const det = await window.LibraryAPI.apiFetch(`/api/books/${id}/content`);
          content = det.content || "";
        } catch {
          content = "";
        }
        document.getElementById("se-content").value = content;
        document.getElementById("staff-edit-title").textContent = `Редактирование: ${b.title}`;
      } catch (e) {
        err.textContent = e.message || "Книга не найдена";
      }
    }

    await loadBook();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      msg.textContent = "";
      const payload = {
        title: document.getElementById("se-title").value.trim(),
        author: document.getElementById("se-author").value.trim(),
        description: document.getElementById("se-desc").value.trim(),
        content: document.getElementById("se-content").value,
        file_url: (() => {
          const u = document.getElementById("se-url").value.trim();
          return u === "" ? null : u;
        })(),
      };
      try {
        await window.LibraryAPI.apiFetch(`/api/books/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        msg.textContent = "Сохранено.";
      } catch (ex) {
        err.textContent = ex.message || "Ошибка сохранения";
      }
    });

    document.getElementById("staff-delete-btn").addEventListener("click", async () => {
      if (!window.confirm(`Удалить книгу id=${id}?`)) return;
      err.textContent = "";
      msg.textContent = "";
      try {
        await window.LibraryAPI.apiFetch(`/api/books/${id}`, { method: "DELETE" });
        window.location.href = `${pb}/books.html`;
      } catch (ex) {
        err.textContent = ex.message || "Ошибка удаления";
      }
    });

    replaceForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      msg.textContent = "";
      const fd = new FormData(replaceForm);
      try {
        await window.LibraryAPI.apiFetchFormData(`/api/books/${id}/upload`, fd, {
          method: "PUT",
        });
        msg.textContent = "Файл книги обновлён.";
        replaceForm.reset();
        await loadBook();
      } catch (ex) {
        err.textContent = ex.message || "Ошибка замены файла";
      }
    });
  });
})();
