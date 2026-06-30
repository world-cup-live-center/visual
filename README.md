# Rhythm Forge — Müzik Visualizer

Müzik dosyanı tarayıcıda gerçek zamanlı analiz edip ritme uyumlu görseller çizen,
istersen sonucu MP4 ya da saydam (alpha) MOV video olarak dışa aktarabilen yerel bir
müzik görselleştirme stüdyosu. Dış kütüphane kullanmaz — saf JavaScript, Canvas 2D ve
Web Audio API ile çalışır.

## Özellikler

- 9 görselleştirme modu: Spectrum Bars, Halo Ring, Wave Ribbon, Geometry Pulse,
  Mirror Bars, Spiral Bloom, Neon Tunnel, Particle Burst, Pulse Lattice
- 4 renk paleti, 3 sahne arkaplanı
- Oynatma sırasında anlık değişen ayarlar: bant yoğunluğu, hassasiyet, yumuşatma, glow
- Canlı analiz göstergeleri: Enerji / Bass / Mid / High / Peak frekans / Zaman
- Kayıt ve export: MP4 (libx264) veya saydam MOV (ProRes 4444, alpha kanallı)
- Green Screen / Blue Screen / Luma Matte / Blend on Black export zeminleri
- Müzik dosyası dışarı gönderilmez; tamamen yerelde işlenir

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
