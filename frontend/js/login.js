(function () {
  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const err = document.getElementById("login-error");
    if (!form) return;

    const banner = document.getElementById("login-banner");
    if (banner && new URLSearchParams(window.location.search).get("registered")) {
      banner.hidden = false;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.textContent = "";
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      try {
        const data = await window.LibraryAPI.apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        window.LibraryAuth.setToken(data.access_token);
        document.dispatchEvent(new Event("library-auth-changed"));
        window.location.href = `${pagesBase()}/books.html`;
      } catch (ex) {
        err.textContent = ex.message || "Ошибка входа";
      }
    });
  });
})();
