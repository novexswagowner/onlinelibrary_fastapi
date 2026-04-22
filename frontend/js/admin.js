(function () {
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function pagesBase() {
    return (window.LIBRARY_PAGES || "/frontend/pages").replace(/\/$/, "");
  }

  async function loadStats(root, errEl) {
    errEl.textContent = "";
    try {
      const s = await window.LibraryAPI.apiFetch("/api/admin/stats");
      root.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-value">${s.users_count}</span><span class="stat-label">Пользователей</span></div>
          <div class="stat-card"><span class="stat-value">${s.books_count}</span><span class="stat-label">Книг</span></div>
          <div class="stat-card"><span class="stat-value">${s.messages_count}</span><span class="stat-label">Сообщений в чате</span></div>
          <div class="stat-card"><span class="stat-value">${s.ratings_count}</span><span class="stat-label">Оценок</span></div>
        </div>`;
    } catch (e) {
      errEl.textContent = e.message || "Нет доступа к статистике";
      root.innerHTML = "";
    }
  }

  async function loadUsers(tbody, msgEl) {
    msgEl.textContent = "";
    tbody.innerHTML = '<tr><td colspan="6" class="muted">Загрузка…</td></tr>';
    try {
      const users = await window.LibraryAPI.apiFetch("/api/admin/users");
      if (!users.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="muted">Нет пользователей</td></tr>';
        return;
      }
      tbody.innerHTML = users
        .map(
          (u) => `
        <tr data-user-id="${u.id}">
          <td>${u.id}</td>
          <td>${escapeHtml(u.email)}</td>
          <td>${escapeHtml(u.full_name)}</td>
          <td>
            <select class="user-role-select" data-user-id="${u.id}" aria-label="Роль">
              <option value="reader" ${u.role === "reader" ? "selected" : ""}>reader</option>
              <option value="librarian" ${u.role === "librarian" ? "selected" : ""}>librarian</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            </select>
            <button type="button" class="btn btn-ghost btn-tiny role-save" data-user-id="${u.id}">Сохранить роль</button>
          </td>
          <td>${u.is_active ? "активен" : "заблокирован"}</td>
          <td>
            <button type="button" class="btn btn-ghost btn-tiny status-toggle" data-user-id="${u.id}" data-active="${u.is_active ? "1" : "0"}">
              ${u.is_active ? "Заблокировать" : "Разблокировать"}
            </button>
          </td>
        </tr>`
        )
        .join("");

      tbody.querySelectorAll(".role-save").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-user-id"));
          const sel = tbody.querySelector(`select.user-role-select[data-user-id="${id}"]`);
          const role = sel.value;
          msgEl.textContent = "";
          try {
            await window.LibraryAPI.apiFetch(`/api/admin/users/${id}/role`, {
              method: "PATCH",
              body: JSON.stringify({ role }),
            });
            msgEl.textContent = `Роль пользователя ${id} обновлена.`;
            await loadUsers(tbody, msgEl);
          } catch (e) {
            msgEl.textContent = e.message || "Ошибка";
          }
        });
      });

      tbody.querySelectorAll(".status-toggle").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = Number(btn.getAttribute("data-user-id"));
          const active = btn.getAttribute("data-active") === "1";
          msgEl.textContent = "";
          try {
            await window.LibraryAPI.apiFetch(`/api/admin/users/${id}/status`, {
              method: "PATCH",
              body: JSON.stringify({ is_active: !active }),
            });
            msgEl.textContent = `Статус пользователя ${id} обновлён.`;
            await loadUsers(tbody, msgEl);
          } catch (e) {
            msgEl.textContent = e.message || "Ошибка";
          }
        });
      });
    } catch (e) {
      tbody.innerHTML = "";
      msgEl.textContent = e.message || "Нет доступа к списку пользователей";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.LibraryAuth.isLoggedIn()) {
      window.location.href = `${pagesBase()}/login.html`;
      return;
    }
    const err = document.getElementById("admin-error");
    const statsRoot = document.getElementById("admin-stats");
    const tbody = document.querySelector("#admin-users tbody");
    const msg = document.getElementById("admin-msg");
    try {
      const me = await window.LibraryAPI.apiFetch("/api/users/me");
      if (me.role !== "admin") {
        err.textContent = "Страница доступна только администратору.";
        return;
      }
    } catch (e) {
      err.textContent = e.message || "Не удалось проверить роль";
      return;
    }
    await loadStats(statsRoot, err);
    await loadUsers(tbody, msg);
  });
})();
