(function () {
  const POLL_MS = 12000;

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function loadMessages(listEl, statusEl) {
    if (!window.LibraryAuth.isLoggedIn()) {
      listEl.innerHTML =
        '<p class="chat-hint">Войдите, чтобы видеть сообщения и писать в чате.</p>';
      statusEl.textContent = "";
      return;
    }
    statusEl.textContent = "…";
    try {
      const msgs = await window.LibraryAPI.apiFetch(
        "/api/chat/messages?limit=50"
      );
      listEl.innerHTML = (msgs || [])
        .map(
          (m) => `
        <div class="chat-msg" data-id="${m.id}">
          <div class="chat-msg-meta">
            <span class="chat-msg-author">${esc(m.sender_name || "Участник")}</span>
            <span class="chat-msg-time">${esc(formatTime(m.created_at))}</span>
          </div>
          <div class="chat-msg-text">${esc(m.text || "")}</div>
        </div>`
        )
        .join("");
      listEl.scrollTop = listEl.scrollHeight;
      statusEl.textContent = "";
    } catch (e) {
      statusEl.textContent = e.message || "Ошибка";
      listEl.innerHTML = `<p class="chat-hint">${esc(
        e.message || "Не удалось загрузить чат"
      )}</p>`;
    }
  }

  async function sendMessage(input, listEl, statusEl, sendBtn) {
    const text = (input.value || "").trim();
    if (!text) return;
    if (!window.LibraryAuth.isLoggedIn()) {
      statusEl.textContent = "Войдите в аккаунт.";
      return;
    }
    sendBtn.disabled = true;
    statusEl.textContent = "…";
    try {
      await window.LibraryAPI.apiFetch("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      input.value = "";
      await loadMessages(listEl, statusEl);
    } catch (e) {
      statusEl.textContent = e.message || "Ошибка";
    } finally {
      sendBtn.disabled = false;
    }
  }

  function mount() {
    if (document.getElementById("library-chat-dock")) return;

    document.body.classList.add("has-library-chat");

    const root = document.createElement("div");
    root.id = "library-chat-dock";
    root.className = "chat-dock";
    root.innerHTML = `
      <div class="chat-panel" id="library-chat-panel">
        <div class="chat-panel-head">
          <h2 class="chat-panel-title">Общий чат</h2>
        </div>
        <div class="chat-panel-body">
          <div id="library-chat-list" class="chat-list" role="log" aria-live="polite"></div>
          <p id="library-chat-status" class="chat-status" role="status"></p>
        </div>
        <form class="chat-form" id="library-chat-form">
          <label class="visually-hidden" for="library-chat-input">Сообщение</label>
          <textarea id="library-chat-input" class="chat-input" rows="2" maxlength="1000" placeholder="Сообщение…"></textarea>
          <button type="submit" class="btn btn-primary chat-send">Отправить</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const listEl = root.querySelector("#library-chat-list");
    const statusEl = root.querySelector("#library-chat-status");
    const form = root.querySelector("#library-chat-form");
    const input = root.querySelector("#library-chat-input");
    const sendBtn = root.querySelector(".chat-send");

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      sendMessage(input, listEl, statusEl, sendBtn);
    });

    let timer = null;
    function schedulePoll() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (window.LibraryAuth.isLoggedIn()) {
          loadMessages(listEl, statusEl);
        }
      }, POLL_MS);
    }
    schedulePoll();

    document.addEventListener("library-auth-changed", () => {
      loadMessages(listEl, statusEl);
    });

    loadMessages(listEl, statusEl);
  }

  window.LibraryChat = { mount };
})();
