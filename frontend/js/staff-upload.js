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
        document.getElementById("staff-up-error").textContent =
          "Нужна роль библиотекаря или администратора.";
        return;
      }
    } catch (e) {
      document.getElementById("staff-up-error").textContent = e.message || "Ошибка";
      return;
    }

    const form = document.getElementById("staff-up-form");
    const err = document.getElementById("staff-up-error");
    const ok = document.getElementById("staff-up-ok");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      ok.textContent = "";
      const fileInput = document.getElementById("su-file");
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!file) {
        err.textContent = "Выберите PDF-файл.";
        return;
      }
      const name = (file.name || "").toLowerCase();
      const mime = (file.type || "").toLowerCase();
      if (!name.endsWith(".pdf")) {
        err.textContent = "Допускается только файл с расширением .pdf.";
        return;
      }
      if (mime && mime !== "application/pdf") {
        err.textContent = "Тип файла должен быть application/pdf (или неизвестен браузеру при .pdf).";
        return;
      }
      const fd = new FormData(form);
      try {
        const book = await window.LibraryAPI.apiFetch("/api/books/upload", {
          method: "POST",
          body: fd,
        });
        ok.textContent = `Книга загружена, id=${book.id}. Можно открыть в каталоге.`;
        form.reset();
      } catch (ex) {
        err.textContent = ex.message || "Ошибка загрузки";
      }
    });
  });
})();
