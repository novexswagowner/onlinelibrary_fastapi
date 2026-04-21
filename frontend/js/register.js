(function () {
  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");
    const err = document.getElementById("register-error");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const email = document.getElementById("reg-email").value.trim();
      const full_name = document.getElementById("reg-name").value.trim();
      const password = document.getElementById("reg-password").value;
      try {
        await window.LibraryAPI.apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, full_name, password }),
        });
        window.location.href = `${pagesBase()}/login.html?registered=1`;
      } catch (ex) {
        err.textContent = ex.message || "Ошибка регистрации";
      }
    });
  });
})();
