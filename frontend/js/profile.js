(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const root = document.getElementById("profile-root");
    const err = document.getElementById("profile-error");
    if (!window.LibraryAuth.isLoggedIn()) {
      window.location.href = `${pagesBase()}/login.html`;
      return;
    }
    try {
      const u = await window.LibraryAPI.apiFetch("/api/users/me");
      root.innerHTML = `
        <div class="card profile-card">
          <h1>Профиль</h1>
          <dl class="profile-dl">
            <div><dt>Имя</dt><dd>${escapeHtml(u.full_name)}</dd></div>
            <div><dt>Email</dt><dd>${escapeHtml(u.email)}</dd></div>
            <div><dt>Роль</dt><dd>${escapeHtml(u.role)}</dd></div>
            <div><dt>Статус</dt><dd>${u.is_active ? "активен" : "заблокирован"}</dd></div>
            <div><dt>Регистрация</dt><dd>${escapeHtml(
              new Date(u.created_at).toLocaleString()
            )}</dd></div>
          </dl>
        </div>
      `;
    } catch (e) {
      err.textContent = e.message || "Не удалось загрузить профиль";
    }
  });
})();
