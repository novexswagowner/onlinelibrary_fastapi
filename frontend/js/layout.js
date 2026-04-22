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

  async function refreshRoleNav() {
    const adminEls = document.querySelectorAll("[data-nav-admin]");
    const staffEls = document.querySelectorAll("[data-nav-staff]");
    adminEls.forEach((el) => {
      el.hidden = true;
    });
    staffEls.forEach((el) => {
      el.hidden = true;
    });
    document.body.removeAttribute("data-user-role");
    if (!window.LibraryAuth || !window.LibraryAuth.isLoggedIn()) {
      return;
    }
    try {
      const me = await window.LibraryAPI.apiFetch("/api/users/me");
      document.body.dataset.userRole = me.role;
      const isAdmin = me.role === "admin";
      const isStaff = me.role === "admin" || me.role === "librarian";
      adminEls.forEach((el) => {
        el.hidden = !isAdmin;
      });
      staffEls.forEach((el) => {
        el.hidden = !isStaff;
      });
    } catch {
      adminEls.forEach((el) => {
        el.hidden = true;
      });
      staffEls.forEach((el) => {
        el.hidden = true;
      });
    }
  }

  function bindLogout() {
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        window.LibraryAuth.clearToken();
        document.dispatchEvent(new Event("library-auth-changed"));
        updateAuthNav();
        refreshRoleNav();
        window.location.href = `${pagesBase()}/login.html`;
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateAuthNav();
    refreshRoleNav();
    bindLogout();
    if (window.LibraryChat) {
      window.LibraryChat.mount();
    }
  });

  document.addEventListener("library-auth-changed", () => {
    refreshRoleNav();
  });
})();
