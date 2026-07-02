// MoS Rhythm — paketler / fiyatlandirma sayfasi.
(function () {
  "use strict";

  let plans = [];
  let me = null;        // { user } veya null
  let myPlan = null;    // /api/me/plan cevabi (girisliyse)
  let period = "monthly";

  const grid = document.getElementById("plans-grid");

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
      const err = new Error(data.error || "Bir hata olustu.");
      err.code = data.code;
      throw err;
    }
    return data;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  const fmt = (v) => Number(v || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

  function isCurrentPlan(p) {
    if (!myPlan) return false;
    if (myPlan.plan.id != null) return Number(myPlan.plan.id) === Number(p.id);
    return Boolean(p.is_default); // plani atanmamis kullanici varsayilan pakettedir
  }

  function priceBlock(p) {
    const price = period === "yearly" ? Number(p.price_yearly) : Number(p.price_monthly);
    const unit = period === "yearly" ? "/yıl" : "/ay";
    if (price <= 0) {
      return '<div class="mt-4"><span class="font-display text-4xl font-bold">Ücretsiz</span></div>';
    }
    let saving = "";
    if (period === "yearly" && Number(p.price_monthly) > 0) {
      const full = Number(p.price_monthly) * 12;
      if (full > price) {
        saving = `<div class="mt-1 text-xs text-mint">Aylığa göre %${Math.round((1 - price / full) * 100)} avantajlı</div>`;
      }
    }
    return `<div class="mt-4"><span class="font-display text-4xl font-bold">${fmt(price)} ₺</span><span class="text-sm text-muted">${unit}</span>${saving}</div>`;
  }

  function ctaBlock(p) {
    const current = isCurrentPlan(p);
    if (current) {
      return '<button type="button" class="btn w-full cursor-default border-white/20 opacity-70" disabled>Mevcut planın ✓</button>';
    }
    if (p.is_default || Number(period === "yearly" ? p.price_yearly : p.price_monthly) <= 0) {
      return '<button type="button" class="btn w-full" data-free>Ücretsiz kullan</button>';
    }
    return '<button type="button" class="btn btn-primary w-full" data-buy>Bu pakete geç</button>';
  }

  function planCard(p, featured) {
    return `
    <div class="relative flex flex-col rounded-2xl border ${featured ? "border-accent/50 bg-accent/[0.05] shadow-[0_0_40px_rgba(232,23,42,0.15)]" : "border-white/10 bg-white/[0.02]"} p-6" data-plan-id="${p.id}">
      ${featured ? '<span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent to-accent2 px-3 py-0.5 text-[0.7rem] font-bold text-white">Popüler</span>' : ""}
      <h3 class="font-display text-xl font-bold">${esc(p.name)}</h3>
      <p class="mt-1 text-sm text-muted">${esc(p.description)}</p>
      ${priceBlock(p)}
      <ul class="mt-5 flex-1 space-y-2 text-sm">
        <li class="flex items-start gap-2"><span class="text-mint">✓</span> Ayda <strong>${p.monthly_quota}</strong> temiz (filigransız) export</li>
        <li class="flex items-start gap-2"><span class="text-mint">✓</span> 22 görsel mod, tüm ayarlar</li>
        <li class="flex items-start gap-2"><span class="text-mint">✓</span> MP4 + şeffaf MOV çıktı</li>
        <li class="flex items-start gap-2"><span class="text-mint">✓</span> Kişisel preset'ler</li>
        <li class="flex items-start gap-2"><span class="text-mint">✓</span> Kota sonrası filigranlı sınırsız export</li>
      </ul>
      <div class="mt-6">${ctaBlock(p)}</div>
      <p class="plan-msg mt-2 hidden rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent"></p>
    </div>`;
  }

  function render() {
    if (!plans.length) {
      grid.innerHTML = '<p class="col-span-full py-16 text-center text-muted">Şu an görüntülenecek paket yok.</p>';
      return;
    }
    // Ortadaki (ya da en pahali) paketi one cikar
    const paid = plans.filter((p) => Number(p.price_monthly) > 0);
    const featuredId = paid.length ? paid[Math.min(1, paid.length - 1)].id : null;
    grid.innerHTML = plans.map((p) => planCard(p, p.id === featuredId)).join("");

    // Yillik sekme ipucu (ilk ucretli paketten oran)
    const hint = document.getElementById("yearly-hint");
    const sample = paid.find((p) => Number(p.price_yearly) > 0 && Number(p.price_yearly) < Number(p.price_monthly) * 12);
    hint.textContent = sample
      ? `%${Math.round((1 - Number(sample.price_yearly) / (Number(sample.price_monthly) * 12)) * 100)} indirim`
      : "";
  }

  function setPeriod(p) {
    period = p;
    document.getElementById("tab-monthly").classList.toggle("period-active", p === "monthly");
    document.getElementById("tab-yearly").classList.toggle("period-active", p === "yearly");
    render();
  }

  // Kart eylemleri
  grid.addEventListener("click", async (e) => {
    const buy = e.target.closest("[data-buy]");
    const free = e.target.closest("[data-free]");
    if (!buy && !free) return;
    const card = e.target.closest("[data-plan-id]");
    const planId = Number(card.dataset.planId);
    const msg = card.querySelector(".plan-msg");
    msg.classList.add("hidden");

    if (!me || !me.user) {
      // Giris yok -> uygulamaya, kayit modalina
      window.location.href = "index.html#kayit";
      return;
    }

    if (free) {
      msg.textContent = "Ücretsiz paket zaten herkes için geçerlidir — ek işlem gerekmez.";
      msg.classList.remove("hidden");
      return;
    }

    const btn = buy;
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = "Hazırlanıyor…";
    try {
      await api("/api/checkout", { method: "POST", body: { planId, period } });
    } catch (err) {
      msg.textContent = err.code === "PAYMENT_NOT_READY"
        ? "Ödeme sistemi çok yakında aktif olacak. 🎉 Şimdilik paketler bilgilendirme amaçlıdır."
        : (err.message || "Ödeme başlatılamadı.");
      msg.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  document.getElementById("tab-monthly").addEventListener("click", () => setPeriod("monthly"));
  document.getElementById("tab-yearly").addEventListener("click", () => setPeriod("yearly"));

  // Baslangic
  (async () => {
    try {
      const [plansRes, meRes] = await Promise.all([
        api("/api/plans"),
        api("/api/auth/me").catch(() => ({ user: null }))
      ]);
      plans = plansRes.plans || [];
      me = meRes;

      if (me.user) {
        const chip = document.getElementById("me-chip");
        chip.textContent = me.user.name;
        chip.classList.remove("hidden");
        try {
          myPlan = await api("/api/me/plan");
          document.getElementById("my-plan").classList.remove("hidden");
          document.getElementById("my-plan-name").textContent = myPlan.plan.name;
          document.getElementById("my-plan-quota").textContent =
            `Bu dönem kalan temiz export: ${myPlan.remaining}/${myPlan.quota}`;
        } catch {}
      }
      setPeriod("monthly");
    } catch (err) {
      grid.innerHTML = `<p class="col-span-full py-16 text-center text-muted">Paketler yüklenemedi: ${esc(err.message)}</p>`;
    }
  })();
})();
