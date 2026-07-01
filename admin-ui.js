// MoS Rhythm — admin paneli.
(function () {
  "use strict";

  let allUsers = [];

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

  function rowHtml(u) {
    return `<tr class="border-t border-white/5 hover:bg-white/[0.02]" data-id="${u.id}">
      <td class="px-3 py-2.5">${esc(u.email)}</td>
      <td class="px-3 py-2.5">${esc(u.name)}</td>
      <td class="px-3 py-2.5">${statusBadge(u)}</td>
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
      await Promise.all([loadStats(), loadUsers()]);
    } catch (err) {
      gate.innerHTML = `<p class="text-muted">Yüklenemedi: ${esc(err.message)}</p>`;
    }
  })();
})();
