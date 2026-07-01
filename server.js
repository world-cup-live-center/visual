require("dotenv").config();

const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("./db");
const authModule = require("./lib/auth");
const presetsModule = require("./lib/presets");
const adminModule = require("./lib/admin");
const billingModule = require("./lib/billing");
const quota = require("./lib/quota");

// ffmpeg, gorunur CPU sayisi kadar thread acar. Railway gibi cok-cekirdek goren
// ama RAM'i kisitli konteynerlerde bu, ProRes encode sirasinda bellegi tasirip
// surecin OOM ile oldurulmesine yol acar. Thread'i sinirlamak tepe bellegi dusurur.
const FFMPEG_THREADS = String(process.env.FFMPEG_THREADS || 2);

const ROOT_DIR = __dirname;
const DEFAULT_PORT = Number(process.env.PORT || 4174);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_PORT_ATTEMPTS = 10;
const TEMP_EXPORT_DIR = path.join(ROOT_DIR, ".export-cache");
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

// Statik olarak ASLA sunulmayacak dosyalar (kaynak/sirlar). lib/ ve node_modules/
// klasorleri ile nokta ile baslayan dosyalar (.env, .git) ayrica yol kuraliyla engellenir.
const BLOCKED_FILES = new Set([
  "server.js",
  "db.js",
  "package.json",
  "package-lock.json",
  ".env",
  ".env.example"
]);

function looksLikeFilePath(candidate) {
  // POSIX mutlak yol, Windows surucu harfi (C:\...) ya da icinde ayrac olan her sey.
  return (
    path.isAbsolute(candidate) ||
    /^[a-zA-Z]:[\\/]/.test(candidate) ||
    /[\\/]/.test(candidate)
  );
}

function resolveBinary(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (looksLikeFilePath(candidate)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }
    return candidate;
  }
  return null;
}

function findWinGetBinary(exe) {
  try {
    const local = process.env.LOCALAPPDATA;
    if (!local) return null;
    const packagesDir = path.join(local, "Microsoft", "WinGet", "Packages");
    if (!fs.existsSync(packagesDir)) return null;
    const pkgDirs = fs.readdirSync(packagesDir).filter(d => d.toLowerCase().startsWith("gyan.ffmpeg"));
    for (const pkgDir of pkgDirs) {
      const pkgPath = path.join(packagesDir, pkgDir);
      const subDirs = fs.readdirSync(pkgPath).filter(d => d.startsWith("ffmpeg"));
      for (const sub of subDirs) {
        const candidate = path.join(pkgPath, sub, "bin", exe);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {}
  return null;
}

const ffmpegPath = resolveBinary([
  process.env.FFMPEG_PATH,
  "C:\\ffmpeg\\bin\\ffmpeg.exe",
  "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
  "C:\\tools\\ffmpeg\\bin\\ffmpeg.exe",
  process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "scoop", "shims", "ffmpeg.exe") : null,
  findWinGetBinary("ffmpeg.exe"),
  "ffmpeg"
]);

const ffprobePath = resolveBinary([
  process.env.FFPROBE_PATH,
  "C:\\ffmpeg\\bin\\ffprobe.exe",
  "C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe",
  "C:\\tools\\ffmpeg\\bin\\ffprobe.exe",
  process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "scoop", "shims", "ffprobe.exe") : null,
  findWinGetBinary("ffprobe.exe"),
  "ffprobe"
]);

// --- Watermark (kota dolunca export'a basilir) ---
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || "ritimstudyo";

function resolveFontFile() {
  const candidates = [
    process.env.WATERMARK_FONT,
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "C:\\Windows\\Fonts\\arial.ttf"
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return null;
}
const WATERMARK_FONT = resolveFontFile();

// drawtext icin font yolunu kacir (Windows'ta ":" ve "\" ozel karakter).
function escapeFontPath(p) {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

// Filigran drawtext filtresi. Font bulunamazsa null (watermark atlanir).
function watermarkFilter() {
  if (!WATERMARK_FONT) return null;
  const font = escapeFontPath(WATERMARK_FONT);
  const text = WATERMARK_TEXT.replace(/[\\:']/g, "");
  return `drawtext=fontfile='${font}':text='${text}':fontcolor=white@0.5:fontsize=h/18:` +
    `x=w-tw-24:y=h-th-24:box=1:boxcolor=black@0.25:boxborderw=10`;
}

function collectRequestBody(request, maxBytes = MAX_UPLOAD_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    request.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        reject(Object.assign(new Error("Kayit dosyasi cok buyuk."), { code: "PAYLOAD_TOO_LARGE" }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function runProcess(command, args) {
  console.log("[ffmpeg]", command, args.join(" "));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) { resolve({ stdout, stderr }); return; }
      reject(new Error(stderr.trim() || `${command} basarisiz oldu (${exitCode}).`));
    });
  });
}

function readCgroupMemoryLimitMB() {
  const candidates = [
    "/sys/fs/cgroup/memory.max",
    "/sys/fs/cgroup/memory/memory.limit_in_bytes"
  ];
  for (const file of candidates) {
    try {
      const raw = fs.readFileSync(file, "utf8").trim();
      if (raw && raw !== "max") {
        const bytes = Number(raw);
        if (Number.isFinite(bytes) && bytes > 0 && bytes < 1e15) {
          return Math.round(bytes / 1048576);
        }
      }
    } catch {}
  }
  return null;
}

async function probeBinary(bin) {
  if (!bin) return { ok: false, error: "yol bulunamadi" };
  try {
    const { stdout } = await runProcess(bin, ["-version"]);
    return { ok: true, version: (stdout.split("\n")[0] || "").trim() };
  } catch (error) {
    return { ok: false, error: (error.message || "").split("\n")[0] };
  }
}

async function ensureTempExportDir() {
  await fs.promises.mkdir(TEMP_EXPORT_DIR, { recursive: true });
}

function hasAlphaPixelFormat(pixelFormat) {
  return /(yuva|rgba|bgra|argb|abgr|gbrap|ya)/i.test(pixelFormat || "");
}

async function probeVideoAlpha(inputFile) {
  if (!ffprobePath) {
    throw Object.assign(new Error("ffprobe bulunamadi."), { code: "FFPROBE_MISSING" });
  }
  const { stdout } = await runProcess(ffprobePath, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=pix_fmt", "-of", "json", inputFile
  ]);
  const payload = JSON.parse(stdout);
  const pixelFormat = payload?.streams?.[0]?.pix_fmt || "";
  return hasAlphaPixelFormat(pixelFormat);
}

function slugify(value) {
  return String(value || "visualizer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "visualizer";
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Gecici dosya silinemedi:", filePath);
  }
}

function unpackDualPassPayload(inputBuffer) {
  if (!Buffer.isBuffer(inputBuffer) || inputBuffer.length < 8) {
    throw Object.assign(new Error("Dual-pass kayit verisi bozuk."), { code: "INVALID_DUAL_PASS" });
  }
  const colorLength = inputBuffer.readUInt32BE(0);
  const matteLength = inputBuffer.readUInt32BE(4);
  const expectedLength = 8 + colorLength + matteLength;
  if (!colorLength || !matteLength || inputBuffer.length !== expectedLength) {
    throw Object.assign(new Error("Dual-pass kayit uzunlugu gecersiz."), { code: "INVALID_DUAL_PASS" });
  }
  return {
    colorBuffer: inputBuffer.subarray(8, 8 + colorLength),
    matteBuffer: inputBuffer.subarray(8 + colorLength, expectedLength)
  };
}

async function transcodeRecording(inputBuffer, options = {}) {
  if (!ffmpegPath) {
    throw Object.assign(new Error("ffmpeg bulunamadi."), { code: "FFMPEG_MISSING" });
  }

  await ensureTempExportDir();

  const mode =
    options.mode === "transparent-dual"
      ? "transparent-dual"
      : options.mode === "transparent"
        ? "transparent"
        : "standard";
  const baseName = slugify(options.basename || "visualizer");
  const wm = options.watermark ? watermarkFilter() : null; // kota dolduysa filigran
  const token = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const inputFile = path.join(TEMP_EXPORT_DIR, `${token}.webm`);
  const matteFile = mode === "transparent-dual" ? path.join(TEMP_EXPORT_DIR, `${token}-matte.webm`) : null;
  const outputExtension = mode === "standard" ? ".mp4" : ".mov";
  const outputFile = path.join(TEMP_EXPORT_DIR, `${token}-out${outputExtension}`);

  if (mode === "transparent-dual") {
    const { colorBuffer, matteBuffer } = unpackDualPassPayload(inputBuffer);
    await fs.promises.writeFile(inputFile, colorBuffer);
    await fs.promises.writeFile(matteFile, matteBuffer);
  } else {
    await fs.promises.writeFile(inputFile, inputBuffer);
  }

  try {
    if (mode === "transparent-dual") {
      const colorStats = await fs.promises.stat(inputFile).catch(() => ({ size: 0 }));
      const matteStats = await fs.promises.stat(matteFile).catch(() => ({ size: 0 }));
      if (colorStats.size === 0 || matteStats.size === 0) {
        throw Object.assign(
          new Error(`Kayit dosyasi bos (renk=${colorStats.size} bayt, matte=${matteStats.size} bayt). Kaydi tekrar dene.`),
          { code: "EMPTY_INPUT" }
        );
      }

      const filterComplex = wm
        ? `[1:v]format=gray[alpha];[0:v][alpha]alphamerge[wmv];[wmv]${wm}[outv]`
        : "[1:v]format=gray[alpha];[0:v][alpha]alphamerge[outv]";
      await runProcess(ffmpegPath, [
        "-y", "-i", inputFile, "-i", matteFile,
        "-filter_complex", filterComplex,
        "-map", "[outv]", "-map", "0:a?",
        "-threads", FFMPEG_THREADS,
        "-c:v", "prores_ks", "-profile:v", "4",
        "-pix_fmt", "yuva444p10le", "-qscale:v", "20",
        "-c:a", "aac", "-b:a", "256k",
        outputFile
      ]);

      return { outputFile, downloadName: `${baseName}-alpha.mov`, mimeType: "video/quicktime" };
    }

    if (mode === "transparent") {
      const alphaAvailable = await probeVideoAlpha(inputFile);
      if (!alphaAvailable) {
        throw Object.assign(new Error("Tarayici bu kayitta alpha kanali uretmedi."), { code: "ALPHA_UNAVAILABLE" });
      }
      const alphaArgs = ["-y", "-i", inputFile, "-threads", FFMPEG_THREADS];
      if (wm) alphaArgs.push("-vf", wm);
      alphaArgs.push(
        "-c:v", "prores_ks", "-profile:v", "4",
        "-pix_fmt", "yuva444p10le", "-qscale:v", "20",
        "-c:a", "aac", "-b:a", "256k",
        outputFile
      );
      await runProcess(ffmpegPath, alphaArgs);
      return { outputFile, downloadName: `${baseName}-alpha.mov`, mimeType: "video/quicktime" };
    }

    const mp4Args = ["-y", "-i", inputFile, "-threads", FFMPEG_THREADS];
    if (wm) mp4Args.push("-vf", wm);
    mp4Args.push(
      "-c:v", "libx264", "-preset", "slow", "-crf", "12",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "320k",
      "-movflags", "+faststart",
      outputFile
    );
    await runProcess(ffmpegPath, mp4Args);

    return { outputFile, downloadName: `${baseName}.mp4`, mimeType: "video/mp4" };
  } catch (error) {
    await safeUnlink(outputFile);
    throw error;
  } finally {
    await safeUnlink(inputFile);
    await safeUnlink(matteFile);
  }
}

async function handleTranscode(request, response) {
  try {
    const inputBuffer = await collectRequestBody(request);
    const requestMode = request.query.mode;
    const mode =
      requestMode === "transparent-dual"
        ? "transparent-dual"
        : requestMode === "transparent"
          ? "transparent"
          : "standard";
    const basename = request.query.basename || "visualizer";

    // Kota: dolduysa filigran bas, dolmadiysa temiz uret + sayaci artir.
    let quotaStatus = null;
    let watermark = false;
    try {
      quotaStatus = await quota.getQuotaStatus(request.authUser);
      watermark = quotaStatus.watermark;
    } catch (quotaError) {
      console.warn("[transcode] kota okunamadi:", quotaError.message);
    }

    const result = await transcodeRecording(inputBuffer, { mode, basename, watermark });

    if (!watermark && quotaStatus) {
      quota.incrementUsage(request.authUser.id, quotaStatus.periodStart)
        .catch((e) => console.warn("[transcode] kota artirilamadi:", e.message));
    }

    const { size } = await fs.promises.stat(result.outputFile);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.downloadName}"`,
      "Content-Length": size,
      "Content-Type": result.mimeType,
      "X-Download-Name": result.downloadName,
      "X-Watermarked": watermark ? "1" : "0"
    });

    const fileStream = fs.createReadStream(result.outputFile);
    let cleaned = false;
    const cleanupOutput = () => {
      if (cleaned) return;
      cleaned = true;
      safeUnlink(result.outputFile);
    };

    fileStream.on("error", (streamError) => {
      console.error("[transcode] cikti gonderilemedi:", streamError.message);
      cleanupOutput();
      response.destroy();
    });
    fileStream.on("close", cleanupOutput);
    response.on("close", () => fileStream.destroy());
    fileStream.pipe(response);
  } catch (error) {
    const status =
      error.code === "PAYLOAD_TOO_LARGE" ? 413 :
      error.code === "ALPHA_UNAVAILABLE" ? 422 :
      error.code === "INVALID_DUAL_PASS" ? 400 : 500;
    if (!response.headersSent) {
      response.status(status).json({
        code: error.code || "TRANSCODE_FAILED",
        error: error.message || "Transcode sirasinda hata olustu."
      });
    }
  }
}

// --- Guvenli statik dosya sunumu (whitelist) ---
function serveStaticFile(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ error: "Gecersiz yol." });
  }
  if (pathname === "/") pathname = "/index.html";

  // Nokta ile baslayan segment (.env, .git) veya sunucu klasorleri engellenir.
  if (/(^|\/)\.[^/]/.test(pathname) || /(^|\/)(lib|node_modules)(\/|$)/.test(pathname)) {
    return res.status(404).json({ error: "Bulunamadi." });
  }

  const filePath = path.normalize(path.join(ROOT_DIR, pathname));
  if (!filePath.startsWith(ROOT_DIR)) {
    return res.status(403).json({ error: "Yasak yol." });
  }
  if (BLOCKED_FILES.has(path.basename(filePath))) {
    return res.status(404).json({ error: "Bulunamadi." });
  }
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension];
  if (!contentType) {
    return res.status(404).json({ error: "Bulunamadi." });
  }

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      const code = error.code === "ENOENT" ? 404 : 500;
      return res.status(code).json({ error: code === 404 ? "Dosya bulunamadi." : "Dosya okunamadi." });
    }
    // HTML/JS/CSS her deploy'da tazelensin (eski onbellek app.js'i tutmasin);
    // gorsel/font'lar kisa sureli onbelleklenebilir.
    const cacheControl = /\.(html|js|css)$/i.test(filePath) ? "no-cache" : "public, max-age=3600";
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
    res.end(fileBuffer);
  });
}

// --- Express uygulamasi ---
const app = express();
app.disable("x-powered-by");
app.use(cookieParser());

// /api altindaki tum isteklerde oturum kullanicisini cikar.
app.use("/api", authModule.attachUser);

// Kimlik / preset / admin rotalari (JSON govde).
const jsonParser = express.json({ limit: "1mb" });
app.use("/api/auth", jsonParser, authModule.router);
app.use("/api/presets", jsonParser, presetsModule.router);
app.use("/api/admin", jsonParser, adminModule.router);
app.use("/api", billingModule.router);

// Bozuk JSON govdesi icin temiz hata.
app.use("/api", (err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Gecersiz istek govdesi." });
  }
  next(err);
});

// Video export — giris zorunlu (misafir export yapamaz). Ham govde stream edilir.
app.post("/api/transcode", authModule.requireAuth, handleTranscode);

app.get("/api/debug", (req, res) => {
  Promise.all([probeBinary(ffmpegPath), probeBinary(ffprobePath)])
    .then(([ffmpeg, ffprobe]) => {
      res.json({
        platform: process.platform,
        ffmpegPath, ffprobePath, ffmpeg, ffprobe,
        ready: ffmpeg.ok && ffprobe.ok,
        ffmpegThreads: FFMPEG_THREADS,
        cpus: os.cpus().length,
        memoryLimitMB: readCgroupMemoryLimitMB(),
        hostTotalMB: Math.round(os.totalmem() / 1048576),
        dbConfigured: db.isConfigured(),
        dbReady: db.isReady()
      });
    })
    .catch((error) => res.status(500).json({ error: error.message }));
});

// Statik dosyalar (GET/HEAD). Diger her sey icin catch-all.
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Bulunamadi." });
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Desteklenmeyen istek." });
  }
  serveStaticFile(req, res);
});

// Genel hata yakalayici.
app.use((err, req, res, next) => {
  console.error("[express]", err.message);
  if (!res.headersSent) res.status(500).json({ error: "Sunucu hatasi." });
});

const server = http.createServer(app);

function listenWithFallback(startPort, attemptsLeft) {
  server
    .once("error", (error) => {
      if (error.code === "EADDRINUSE" && attemptsLeft > 1) {
        listenWithFallback(startPort + 1, attemptsLeft - 1);
        return;
      }
      console.error("Sunucu baslatilamadi:", error.message);
      process.exit(1);
    })
    .listen(startPort, HOST, () => {
      console.log(`Rhythm Forge http://${HOST}:${startPort} adresinde hazir.`);
    });
}

async function cleanupExportDir() {
  try {
    const files = await fs.promises.readdir(TEMP_EXPORT_DIR);
    await Promise.all(files.map((f) => fs.promises.unlink(path.join(TEMP_EXPORT_DIR, f)).catch(() => {})));
  } catch {}
}

function handleShutdown() {
  cleanupExportDir().finally(() => process.exit(0));
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

async function start() {
  try {
    await db.initSchema();
  } catch (error) {
    console.error("[db] sema kurulamadi:", error.message);
  }
  listenWithFallback(DEFAULT_PORT, MAX_PORT_ATTEMPTS);
}

if (require.main === module) {
  start();
}

module.exports = { app, server, listenWithFallback, transcodeRecording };
