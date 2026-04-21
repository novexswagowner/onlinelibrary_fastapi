(function () {
  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  function updateAuthNav() {
    const authed = document.querySelectorAll("[data-nav-auth]");
    const guest = document.querySelectorAll("[data-nav-guest]");
    const logged = window.LibraryAuth && window.LibraryAuth.isLoggedIn();
    authed.forEach((el) => {
      el.hidden = !logged;
    });
    guest.forEach((el) => {
      el.hidden = logged;
    });
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.LibraryAuth.clearToken();
        document.dispatchEvent(new Event("library-auth-changed"));
        updateAuthNav();
        window.location.href = `${pagesBase()}/login.html`;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateAuthNav();
    bindLogout();
    if (window.LibraryChat) {
      window.LibraryChat.mount();
    }
  });
})();
