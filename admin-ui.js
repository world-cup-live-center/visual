// MoS Rhythm — admin paneli.
(function () {
  "use strict";

  let allUsers = [];
  let allPlans = [];

  const fmtPrice = (v) => Number(v || 0).toLocaleString("tr-TR") + " ₺";

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin"
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const err = new Error(data.error || "Hata");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const gate = document.getElementById("gate");
  const panel = document.getElementById("panel");

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtDate(v) {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("tr-TR") + " " + d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }

  function statusBadge(u) {
    if (u.status === "banned") return '<span class="rounded px-1.5 py-0.5 text-[0.7rem]" style="background:rgba(232,23,42,.15);color:#ff6b76">Askıda</span>';
    const parts = [];
    if (u.is_admin) parts.push('<span class="rounded px-1.5 py-0.5 text-[0.7rem]" style="background:rgba(255,77,96,.15);color:#ff8a97">Admin</span>');
    parts.push(u.email_verified
      ? '<span class="rounded px-1.5 py-0.5 text-[0.7rem]" style="background:rgba(80,220,140,.12);color:#7ee6a8">Doğrulu</span>'
      : '<span class="rounded px-1.5 py-0.5 text-[0.7rem]" style="background:rgba(255,255,255,.08);color:#9a9aa5">Bekliyor</span>');
    return parts.join(" ");
  }

  function planSelect(u) {
    const opts = ['<option value="">Varsayılan</option>'].concat(
      allPlans.map((p) => `<option value="${p.id}" ${String(u.plan_id) === String(p.id) ? "selected" : ""}>${esc(p.name)}</option>`)
    );
    return `<select data-planselect class="ctl !w-32 !py-1 !px-2 text-xs">${opts.join("")}</select>`;
  }

  function rowHtml(u) {
    return `<tr class="border-t border-white/5 hover:bg-white/[0.02]" data-id="${u.id}">
      <td class="px-3 py-2.5">${esc(u.email)}</td>
      <td class="px-3 py-2.5">${esc(u.name)}</td>
      <td class="px-3 py-2.5">${statusBadge(u)}</td>
      <td class="px-3 py-2.5">${planSelect(u)}</td>
      <td class="px-3 py-2.5">
        ${u.preset_count > 0
          ? `<button class="text-mint underline" data-act="presets">${u.preset_count}</button>`
          : '<span class="text-muted">0</span>'}
      </td>
      <td class="px-3 py-2.5 text-muted">${fmtDate(u.created_at)}</td>
      <td class="px-3 py-2.5 text-muted">${fmtDate(u.last_login_at)}</td>
      <td class="px-3 py-2.5">
        <div class="flex justify-end gap-1.5">
          ${u.status === "banned"
            ? '<button class="btn !px-2.5 !py-1 text-xs" data-act="unban">Aktif et</button>'
            : '<button class="btn !px-2.5 !py-1 text-xs" data-act="ban">Askıya al</button>'}
          ${u.is_admin
            ? '<button class="btn !px-2.5 !py-1 text-xs" data-act="unadmin">Admin al</button>'
            : '<button class="btn !px-2.5 !py-1 text-xs" data-act="admin">Admin yap</button>'}
          <button class="btn !px-2.5 !py-1 text-xs" data-act="delete" style="border-color:rgba(232,23,42,.4)">Sil</button>
        </div>
      </td>
    </tr>`;
  }

  function render(users) {
    const body = document.getElementById("users-body");
    const empty = document.getElementById("empty");
    if (!users.length) {
      body.innerHTML = "";
      empty.classList.remove("hidden");
      return;
    }
    empty.classList.add("hidden");
    body.innerHTML = users.map(rowHtml).join("");
  }

  async function loadStats() {
    try {
      const s = await api("/api/admin/stats");
      document.getElementById("stat-total").textContent = s.total;
      document.getElementById("stat-verified").textContent = s.verified;
      document.getElementById("stat-banned").textContent = s.banned;
      document.getElementById("stat-last7").textContent = s.last7;
      document.getElementById("stat-presets").textContent = s.presets;
    } catch {}
  }

  async function loadUsers() {
    const data = await api("/api/admin/users");
    allUsers = data.users || [];
    applySearch();
  }

  function applySearch() {
    const q = document.getElementById("search").value.trim().toLowerCase();
    const filtered = q
      ? allUsers.filter((u) => (u.email + " " + u.name).toLowerCase().includes(q))
      : allUsers;
    render(filtered);
  }

  // Tablo eylemleri
  document.getElementById("users-body").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const tr = btn.closest("tr");
    const id = tr.dataset.id;
    const act = btn.dataset.act;
    const user = allUsers.find((u) => String(u.id) === String(id));

    try {
      if (act === "presets") {
        const data = await api(`/api/admin/users/${id}/presets`);
        document.getElementById("preset-title").textContent = `${user.email} — ${data.presets.length} preset`;
        document.getElementById("preset-content").textContent =
          data.presets.map((p) => `• ${p.name}\n${JSON.stringify(p.data, null, 2)}`).join("\n\n") || "Preset yok.";
        openPresetModal();
        return;
      }
      if (act === "ban" || act === "unban") {
        await api(`/api/admin/users/${id}/status`, { method: "POST", body: { status: act === "ban" ? "banned" : "active" } });
      } else if (act === "admin" || act === "unadmin") {
        await api(`/api/admin/users/${id}/admin`, { method: "POST", body: { isAdmin: act === "admin" } });
      } else if (act === "delete") {
        if (!confirm(`${user.email} kalıcı olarak silinsin mi? Preset'leri de silinir.`)) return;
        await api(`/api/admin/users/${id}`, { method: "DELETE" });
      }
      await loadUsers();
      await loadStats();
    } catch (err) {
      alert(err.message || "İşlem başarısız.");
    }
  });

  document.getElementById("search").addEventListener("input", applySearch);

  function openPresetModal() {
    const o = document.getElementById("preset-overlay");
    o.classList.remove("hidden");
    o.classList.add("flex");
  }
  function closePresetModal() {
    const o = document.getElementById("preset-overlay");
    o.classList.add("hidden");
    o.classList.remove("flex");
  }
  document.getElementById("preset-close").addEventListener("click", closePresetModal);
  document.getElementById("preset-overlay").addEventListener("click", (e) => {
    if (e.target.id === "preset-overlay") closePresetModal();
  });

  // Kullaniciya plan atama (satirdaki select degisince)
  document.getElementById("users-body").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-planselect]");
    if (!sel) return;
    const id = sel.closest("tr").dataset.id;
    const planId = sel.value ? Number(sel.value) : null;
    try {
      await api(`/api/admin/users/${id}/plan`, { method: "PUT", body: { planId } });
      const u = allUsers.find((x) => String(x.id) === String(id));
      if (u) u.plan_id = planId;
    } catch (err) {
      alert(err.message || "Plan atanamadı.");
      await loadUsers();
    }
  });

  // ── Paketler ──
  async function loadPlans() {
    const data = await api("/api/admin/plans");
    allPlans = data.plans || [];
    renderPlans();
  }
  function planRow(p) {
    const badge = p.is_default
      ? ' <span class="rounded px-1.5 py-0.5 text-[0.7rem]" style="background:rgba(255,77,96,.15);color:#ff8a97">Varsayılan</span>'
      : "";
    return `<tr class="border-t border-white/5" data-id="${p.id}">
      <td class="px-3 py-2.5"><div class="font-semibold">${esc(p.name)}${badge}</div><div class="text-xs text-muted">${esc(p.description)}</div></td>
      <td class="px-3 py-2.5">${p.monthly_quota}</td>
      <td class="px-3 py-2.5">${fmtPrice(p.price_monthly)}</td>
      <td class="px-3 py-2.5">${fmtPrice(p.price_yearly)}</td>
      <td class="px-3 py-2.5">${p.is_active ? '<span style="color:#7ee6a8">Aktif</span>' : '<span class="text-muted">Pasif</span>'}</td>
      <td class="px-3 py-2.5">${p.subscriber_count}</td>
      <td class="px-3 py-2.5"><div class="flex justify-end gap-1.5">
        <button class="btn !px-2.5 !py-1 text-xs" data-pact="edit">Düzenle</button>
        ${!p.is_default ? '<button class="btn !px-2.5 !py-1 text-xs" data-pact="default">Varsayılan</button>' : ""}
        ${!p.is_default ? '<button class="btn !px-2.5 !py-1 text-xs" data-pact="delete" style="border-color:rgba(232,23,42,.4)">Sil</button>' : ""}
      </div></td>
    </tr>`;
  }
  function renderPlans() {
    document.getElementById("plans-body").innerHTML = allPlans.map(planRow).join("");
  }

  document.getElementById("plans-body").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-pact]");
    if (!btn) return;
    const id = btn.closest("tr").dataset.id;
    const act = btn.dataset.pact;
    const plan = allPlans.find((p) => String(p.id) === String(id));
    if (act === "edit") { openPlanModal(plan); return; }
    try {
      if (act === "default") {
        await api(`/api/admin/plans/${id}/default`, { method: "POST" });
      } else if (act === "delete") {
        if (!confirm(`"${plan.name}" paketi silinsin mi? Bu paketteki üyeler varsayılana düşer.`)) return;
        await api(`/api/admin/plans/${id}`, { method: "DELETE" });
      }
      await loadPlans(); await loadUsers();
    } catch (err) { alert(err.message || "İşlem başarısız."); }
  });

  const planOverlay = document.getElementById("plan-overlay");
  const pv = (id) => document.getElementById(id);
  function openPlanModal(plan) {
    pv("plan-error").classList.add("hidden");
    pv("plan-modal-title").textContent = plan ? "Paketi düzenle" : "Yeni paket";
    pv("plan-id").value = plan ? plan.id : "";
    pv("plan-name").value = plan ? plan.name : "";
    pv("plan-desc").value = plan ? plan.description : "";
    pv("plan-quota").value = plan ? plan.monthly_quota : 5;
    pv("plan-price-m").value = plan ? Number(plan.price_monthly) : 0;
    pv("plan-price-y").value = plan ? Number(plan.price_yearly) : 0;
    pv("plan-order").value = plan ? plan.sort_order : allPlans.length;
    pv("plan-active").checked = plan ? plan.is_active : true;
    pv("plan-default").checked = plan ? plan.is_default : false;
    planOverlay.classList.remove("hidden"); planOverlay.classList.add("flex");
  }
  function closePlanModal() { planOverlay.classList.add("hidden"); planOverlay.classList.remove("flex"); }
  pv("plan-close").addEventListener("click", closePlanModal);
  planOverlay.addEventListener("click", (e) => { if (e.target === planOverlay) closePlanModal(); });
  pv("plan-new").addEventListener("click", () => openPlanModal(null));
  pv("plan-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = pv("plan-id").value;
    const body = {
      name: pv("plan-name").value.trim(),
      description: pv("plan-desc").value.trim(),
      monthlyQuota: Number(pv("plan-quota").value),
      priceMonthly: Number(pv("plan-price-m").value),
      priceYearly: Number(pv("plan-price-y").value),
      sortOrder: Number(pv("plan-order").value),
      isActive: pv("plan-active").checked,
      isDefault: pv("plan-default").checked
    };
    try {
      if (id) await api(`/api/admin/plans/${id}`, { method: "PUT", body });
      else await api("/api/admin/plans", { method: "POST", body });
      closePlanModal(); await loadPlans(); await loadUsers();
    } catch (err) {
      const el = pv("plan-error"); el.textContent = err.message; el.classList.remove("hidden");
    }
  });

  // ── Odeme ayarlari (iyzico) ──
  async function loadSettings() {
    try {
      const d = await api("/api/admin/settings");
      pv("iyz-key").value = d.iyzico.apiKey || "";
      pv("iyz-sandbox").checked = d.iyzico.sandbox;
      pv("iyz-sub-enabled").checked = Boolean(d.iyzico.subscriptionEnabled);
      pv("iyz-secret-hint").textContent = d.iyzico.secretSet
        ? "Kayıtlı: " + d.iyzico.secretHint + " · değiştirmek için yeni gir"
        : "Henüz girilmedi";
    } catch (e) { /* sessiz */ }
  }
  pv("iyz-save").addEventListener("click", async () => {
    const status = pv("iyz-status");
    try {
      await api("/api/admin/settings", { method: "POST", body: {
        apiKey: pv("iyz-key").value.trim(),
        secret: pv("iyz-secret").value,
        sandbox: pv("iyz-sandbox").checked,
        subscriptionEnabled: pv("iyz-sub-enabled").checked
      }});
      pv("iyz-secret").value = "";
      status.textContent = "Kaydedildi ✓";
      status.style.color = "#7ee6a8";
      await loadSettings();
      setTimeout(() => { status.textContent = ""; status.style.color = ""; }, 2500);
    } catch (e) {
      status.textContent = e.message || "Kaydedilemedi";
      status.style.color = "#ff8a97";
    }
  });

  pv("iyz-test").addEventListener("click", async () => {
    const out = pv("iyz-test-out");
    out.classList.remove("hidden");
    out.textContent = "Test ediliyor…";
    try {
      // Ham fetch: sunucudan donen her seyi (durum kodu + govde) oldugu gibi goster.
      const resp = await fetch("/api/admin/settings/test-iyzico", { credentials: "same-origin", cache: "no-store" });
      const text = await resp.text();
      let pretty = text;
      let header = "HTTP " + resp.status;
      try {
        const j = JSON.parse(text);
        header = (j.ok ? "✓ BAGLANTI BASARILI" : "✗ BASARISIZ") + " · HTTP " + resp.status +
          "\nOrtam: " + (j.env || "-") + (j.error ? "\nHata: " + j.error : "");
        pretty = JSON.stringify(j.raw || j, null, 2);
      } catch {}
      out.textContent = header + "\n\nHam cevap:\n" + pretty.slice(0, 2000);
    } catch (e) {
      out.textContent = "✗ Test istegi atilamadi: " + (e.message || "");
    }
  });

  // Baslangic: yetki kontrolu
  (async () => {
    try {
      const me = await api("/api/auth/me");
      if (!me.user) {
        gate.innerHTML = '<p class="text-muted">Bu sayfa için giriş yapmalısın.</p><a href="index.html" class="btn mt-4 inline-flex">Giriş yap</a>';
        return;
      }
      if (!me.user.isAdmin) {
        gate.innerHTML = '<p class="text-muted">Bu sayfaya erişim yetkin yok.</p><a href="index.html" class="btn mt-4 inline-flex">Ana sayfa</a>';
        return;
      }
      gate.classList.add("hidden");
      panel.classList.remove("hidden");
      await loadPlans(); // once planlar (kullanici satirlarindaki select icin)
      await Promise.all([loadStats(), loadUsers(), loadSettings()]);
    } catch (err) {
      gate.innerHTML = `<p class="text-muted">Yüklenemedi: ${esc(err.message)}</p>`;
    }
  })();
})();
