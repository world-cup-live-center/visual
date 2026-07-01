# Rhythm Forge — Müzik Visualizer

Müzik dosyanı tarayıcıda gerçek zamanlı analiz edip ritme uyumlu görseller çizen,
istersen sonucu MP4 ya da saydam (alpha) MOV video olarak dışa aktarabilen bir
müzik görselleştirme stüdyosu. Görselleştirme ve analiz tarayıcıda çalışır; MP4/MOV
dönüşümü sunucudaki FFmpeg ile yapılır. Dış kütüphane kullanmaz — saf JavaScript,
Canvas 2D ve Web Audio API ile çalışır. Canlı: https://visual-production-b3fc.up.railway.app

## Özellikler

- 9 görselleştirme modu: Spectrum Bars, Halo Ring, Wave Ribbon, Geometry Pulse,
  Mirror Bars, Spiral Bloom, Neon Tunnel, Particle Burst, Pulse Lattice
- 4 renk paleti, 3 sahne arkaplanı
- Oynatma sırasında anlık değişen ayarlar: bant yoğunluğu, hassasiyet, yumuşatma, glow
- Canlı analiz göstergeleri: Enerji / Bass / Mid / High / Peak frekans / Zaman
- Kayıt ve export: MP4 (libx264) veya saydam MOV (ProRes 4444, alpha kanallı)
- Green Screen / Blue Screen / Luma Matte / Blend on Black export zeminleri
- Müzik dosyası sunucuya yüklenmez; yalnızca tarayıcıda görselleştirme için kullanılır (sunucuya sadece dışa aktarılan video, dönüşüm için gönderilir)

## Dosyalar

| Dosya          | Görev                                                        |
|----------------|-------------------------------------------------------------|
| `index.html`   | Arayüz                                                       |
| `styles.css`   | Tasarım / görsel dil                                         |
| `app.js`       | Ses analizi, görselleştirme ve kayıt mantığı                |
| `server.js`    | HTTP sunucusu + FFmpeg ile video dönüştürme (`/api/transcode`) |
| `package.json` | `npm start` betiği                                           |

## Gereksinimler

- Node.js
- FFmpeg ve FFprobe (export/dönüştürme için). Sunucu sırayla şunları dener:
  `FFMPEG_PATH` ortam değişkeni → `C:\ffmpeg\bin\ffmpeg.exe` → PATH üzerindeki `ffmpeg`.

## Çalıştırma

```bash
npm start
```

Ardından tarayıcıdan `http://localhost:4174` adresini aç. Port doluysa sunucu
otomatik olarak sonraki uygun portu dener.

## Ortam değişkenleri (opsiyonel)

| Değişken       | Açıklama                                  |
|----------------|-------------------------------------------|
| `PORT`         | Sunucu portu (varsayılan 4174)            |
| `HOST`         | Bağlanılacak host (varsayılan 0.0.0.0)    |
| `FFMPEG_PATH`  | ffmpeg çalıştırılabilir dosya yolu        |
| `FFPROBE_PATH` | ffprobe çalıştırılabilir dosya yolu       |
| `FFMPEG_THREADS` | ffmpeg thread limiti (varsayılan 2, OOM'a karşı) |

## Hesap sistemi (kullanıcı girişi + admin)

Kullanıcı hesapları, e-posta onay kodu, kişiye özel preset'ler ve admin paneli
eklendi. Bunlar için PostgreSQL ve birkaç ortam değişkeni gerekir. Ayrıntılı
kurulum: **[SETUP-HESAP.md](SETUP-HESAP.md)**.

| Değişken         | Açıklama                                              |
|------------------|------------------------------------------------------|
| `DATABASE_URL`   | PostgreSQL bağlantı dizesi (Railway otomatik sağlar) |
| `DATABASE_SSL`   | Public Postgres için `true`                          |
| `JWT_SECRET`     | Oturum imzalama anahtarı (uzun, rastgele)            |
| `RESEND_API_KEY` | Resend e-posta API anahtarı                          |
| `MAIL_FROM`      | Gönderen adresi (örn. `MoS Rhythm <onboarding@resend.dev>`) |
| `ADMIN_EMAIL`    | Bu e-posta ile doğrulanan kullanıcı otomatik admin olur |
| `APP_URL`        | Canlı URL (e-posta metinleri için)                   |

Yeni sunucu bağımlılıkları: `express`, `pg`, `bcryptjs`, `jsonwebtoken`,
`cookie-parser`, `resend`, `dotenv`.
