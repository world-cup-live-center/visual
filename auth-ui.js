// MoS Rhythm — kimlik dogrulama arayuzu ve misafir kilitleme.
// window.MosAuth arayuzunu saglar; app.js premium eylemlerde requireAuth() cagirir.
(function () {
  "use strict";

  let currentUser = null;
  let pendingEmail = "";

  // --- API yardimcisi ---
  async function api(path, { method = "GET", body } = {}) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin"
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || "Bir hata olustu.");
      err.code = data.code;
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // --- DOM ---
  const overlay = document.getElementById("auth-overlay");
  const views = {
    login: document.getElementById("auth-view-login"),
    register: document.getElementById("auth-view-register"),
    verify: document.getElementById("auth-view-verify")
  };
  const titleEl = document.getElementById("auth-title");
  const subtitleEl = document.getElementById("auth-subtitle");
  const tabsWrap = document.getElementById("auth-tabs");

  function isAuthed() { return !!currentUser; }

  // --- Modal ---
  function openModal(tab) {
    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    overlay.setAttribute("aria-hidden", "false");
    showView(tab || "login");
  }
  function closeModal() {
    overlay.classList.add("hidden");
    overlay.classList.remove("flex");
    overlay.setAttribute("aria-hidden", "true");
  }

  function clearErrors() {
    document.querySelectorAll(".auth-error").forEach((el) => {
      el.classList.add("hidden");
      el.textContent = "";
    });
  }

  function showError(view, message) {
    const el = views[view] ? views[view].querySelector(".auth-error") : null;
    if (el) { el.textContent = message; el.classList.remove("hidden"); }
  }

  function showView(name) {
    clearErrors();
    Object.entries(views).forEach(([key, el]) => {
      const active = key === name;
      el.classList.toggle("hidden", !active);
      el.classList.toggle("flex", active);
    });
    // Sekme gorunumu (login/register icin)
    tabsWrap.querySelectorAll(".auth-tab").forEach((btn) => {
      btn.classList.toggle("auth-tab-active", btn.dataset.authTab === name);
    });
    if (name === "verify") {
      tabsWrap.classList.add("hidden");
      titleEl.textContent = "E-postani dogrula";
      subtitleEl.textContent = "Gelen kutunu (ve spam klasorunu) kontrol et.";
    } else {
      tabsWrap.classList.remove("hidden");
      titleEl.textContent = name === "register" ? "Ucretsiz hesap oluştur" : "Hesabına giriş yap";
      subtitleEl.textContent = name === "register"
        ? "E-posta ile kayıt ol; sana bir doğrulama kodu göndereceğiz."
        : "Tüm özellikleri açmak için giriş yap.";
    }
  }

  // --- Misafir kilitleme ---
  function applyGate() {
    const authed = isAuthed();
    document.body.classList.toggle("is-guest", !authed);
    document.body.classList.toggle("is-authed", authed);

    document.querySelectorAll("[data-lock]").forEach((el) => {
      el.classList.toggle("locked", !authed);
      if (el.tagName === "DETAILS") {
        const content = el.querySelector(":scope > div");
        if (content) content.inert = !authed;
        if (!authed) el.open = false;
      }
    });
  }

  // --- Hesap widget ---
  function renderAccount() {
    const btn = document.getElementById("account-btn");
    const menu = document.getElementById("account-menu");
    const emailEl = document.getElementById("account-email");
    const adminLink = document.getElementById("account-admin-link");
    if (!btn) return;

    if (isAuthed()) {
      btn.textContent = currentUser.name || "Hesabım";
      emailEl.textContent = currentUser.email;
      adminLink.classList.toggle("hidden", !currentUser.isAdmin);
    } else {
      btn.textContent = "Giriş / Kayıt";
      if (menu) menu.classList.add("hidden");
    }
  }

  function setUser(user) {
    currentUser = user || null;
    applyGate();
    renderAccount();
    document.dispatchEvent(new CustomEvent("mos-auth-change", { detail: { user: currentUser } }));
  }

  // --- window.MosAuth ---
  function requireAuth() {
    if (isAuthed()) return true;
    openModal("login");
    return false;
  }
  window.MosAuth = {
    isAuthed,
    requireAuth,
    open: openModal,
    get user() { return currentUser; }
  };

  // --- Olaylar ---
  document.getElementById("auth-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.classList.contains("hidden")) closeModal();
  });

  tabsWrap.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.authTab));
  });

  // Hesap butonu: misafirse modal, girisliyse menu.
  const accountBtn = document.getElementById("account-btn");
  const accountMenu = document.getElementById("account-menu");
  accountBtn.addEventListener("click", () => {
    if (isAuthed()) {
      accountMenu.classList.toggle("hidden");
    } else {
      openModal("login");
    }
  });
  document.addEventListener("click", (e) => {
    if (accountMenu && !accountMenu.classList.contains("hidden")) {
      if (!e.target.closest("#account-widget")) accountMenu.classList.add("hidden");
    }
  });
  document.getElementById("account-logout").addEventListener("click", async () => {
    try { await api("/api/auth/logout", { method: "POST" }); } catch {}
    accountMenu.classList.add("hidden");
    setUser(null);
  });

  // Kilitli bolumlere tiklaninca modal ac.
  document.querySelectorAll("details[data-lock] > summary").forEach((summary) => {
    summary.addEventListener("click", (e) => {
      if (!isAuthed()) { e.preventDefault(); openModal("register"); }
    });
  });

  // KAYIT
  views.register.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const btn = views.register.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api("/api/auth/register", { method: "POST", body: { name, email, password } });
      pendingEmail = email;
      document.getElementById("verify-email-label").textContent = email;
      showView("verify");
      if (res.emailDelivered === false) {
        showError("verify", "E-posta gonderilemedi ama kod sunucu gunlugunde. (Gelistirme modu)");
      }
      document.getElementById("verify-code").focus();
    } catch (err) {
      showError("register", err.message);
    } finally {
      btn.disabled = false;
    }
  });

  // KOD DOGRULAMA
  views.verify.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    const code = document.getElementById("verify-code").value.trim();
    const btn = views.verify.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api("/api/auth/verify", { method: "POST", body: { email: pendingEmail, code } });
      setUser(res.user);
      closeModal();
    } catch (err) {
      showError("verify", err.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("verify-resend").addEventListener("click", async () => {
    clearErrors();
    try {
      await api("/api/auth/resend", { method: "POST", body: { email: pendingEmail } });
      showError("verify", "Yeni kod gonderildi.");
    } catch (err) {
      showError("verify", err.message);
    }
  });

  // GIRIS
  views.login.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErrors();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const btn = views.login.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const res = await api("/api/auth/login", { method: "POST", body: { email, password } });
      setUser(res.user);
      closeModal();
    } catch (err) {
      if (err.code === "UNVERIFIED") {
        pendingEmail = email;
        document.getElementById("verify-email-label").textContent = email;
        try { await api("/api/auth/resend", { method: "POST", body: { email } }); } catch {}
        showView("verify");
        showError("verify", "Once e-postani dogrula. Yeni bir kod gonderdik.");
      } else {
        showError("login", err.message);
      }
    } finally {
      btn.disabled = false;
    }
  });

  // --- Baslangic ---
  applyGate();
  renderAccount();
  api("/api/auth/me")
    .then((data) => setUser(data.user))
    .catch(() => setUser(null));
})();
