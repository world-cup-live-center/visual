# Hesap Sistemi Kurulumu (Railway)

Bu sürümde kullanıcı hesapları (e-posta + şifre, e-posta onay kodu), kişiye özel
preset'ler ve bir admin paneli eklendi. Çalışması için Railway'de **PostgreSQL** ve
birkaç **ortam değişkeni** gerekiyor. Aşağıdaki adımları sırayla uygula.

---

## 1) Railway'e PostgreSQL ekle

1. Railway projeni aç → **+ New** (veya **Create**) → **Database** → **Add PostgreSQL**.
2. Eklenen Postgres servisine tıkla → **Variables** sekmesi. Burada `DATABASE_URL` otomatik oluşur.
3. Uygulama servisin (visual) Postgres ile **aynı proje** içinde olduğundan emin ol.
   Aynı projedeyseler `DATABASE_URL`'i referansla bağlayabilirsin (bir sonraki adım).

## 2) Uygulama servisine ortam değişkenlerini gir

Uygulama servisin (visual) → **Variables** sekmesi → şunları ekle:

| Değişken         | Değer |
|------------------|-------|
| `DATABASE_URL`   | Postgres servisindeki `DATABASE_URL`'in aynısı. En temizi: `${{ Postgres.DATABASE_URL }}` referansı (Railway "Add Reference" ile) |
| `JWT_SECRET`     | `oxe-GVIDg_ANCzul_ThrxHmLXr_QqgUKfWPpuya13ATyGT_ORI98OzhOTEQs5DJ1` (bu sana özel üretildi; istersen değiştir) |
| `RESEND_API_KEY` | `re_AQANXQDu_FqumHdLkF6wj42CNoqms2wgu` (Resend panelinden yeniden üretmeni öneririm, çünkü sohbette paylaşıldı) |
| `MAIL_FROM`      | `MoS Rhythm <onboarding@resend.dev>` (kendi domainini doğrularsan `MoS Rhythm <no-reply@senin-domainin.com>`) |
| `ADMIN_EMAIL`    | `mosmossevinc@gmail.com` — bu adresle kayıt olan otomatik admin olur |
| `APP_URL`        | `https://visual-production-b3fc.up.railway.app` |
| `DATABASE_SSL`   | Railway iç ağı için gerekmez. `DATABASE_URL` referansını kullanıyorsan boş bırak; **public** Postgres URL kullanırsan `true` yap |

> Not: `PORT`, `HOST`, `FFMPEG_THREADS` gibi mevcut değişkenler aynen kalır.

## 3) Resend hazırlığı

- Zaten API anahtarın var. Doğrulama e-postaları başta `onboarding@resend.dev`
  adresinden gider (Resend'in test göndericisi). Bu, kendine ve doğruladığın
  adreslere gönderim için yeterlidir.
- **Herkese sorunsuz mail** göndermek için Resend'de bir **domain doğrula**
  (Domains → Add Domain → DNS kayıtlarını ekle), sonra `MAIL_FROM`'u o domaine çevir.
- Mail hiç gitmezse: kod yine de Railway **Deploy Logs**'ta yazılır
  (`[mailer] ... dogrulama kodu: 123456`), böylece test edebilirsin.

## 4) Deploy et ve admin ol

1. Kod `main`'e push'landığında Railway otomatik yeniden deploy eder.
2. Deploy loglarında `[db] sema hazir.` satırını görmelisin (tablolar oluştu).
3. Siteye gir → **Giriş / Kayıt** → **Kayıt ol** → `mosmossevinc@gmail.com` + ad + şifre.
4. Gelen 6 haneli kodu gir → hesabın doğrulanır ve **otomatik admin** olursun.
5. Sağ üstteki hesap menüsünden **Admin paneli**'ne gir (`/admin.html`).

---

## Nasıl çalışıyor? (özet)

- **Misafir** (giriş yok): sadece şarkı yükleyip çalabilir ve varsayılan görseli izler.
  Tüm ayarlar, kayıt/export, snapshot, klip ve preset'ler kilitlidir.
- **Girişli kullanıcı**: tüm özellikler açılır; preset'leri hesabında kalıcı saklanır.
- **Admin**: `/admin.html` üzerinden kullanıcıları görür; askıya alır/aktive eder,
  admin yapar/geri alır, siler ve preset'lerini inceler.
- **Güvenlik**: şifreler bcrypt ile hash'lenir, oturum httpOnly imzalı cookie'dedir,
  export ucu (`/api/transcode`) giriş ister, `.env`/kaynak dosyalar statik sunulmaz.

## Yerel test (opsiyonel)

Yerelde denemek istersen bir Postgres gerekir. `.env` içine `DATABASE_URL` yaz,
`npm start` ile çalıştır. `RESEND_API_KEY` yoksa onay kodu konsola yazılır.
