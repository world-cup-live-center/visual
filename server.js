const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

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
  ".webm": "video/webm"
};

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
      // Gercek bir dosya yolu adayi: yalnizca dosya gercekten varsa kullan.
      // (Linux'ta "C:\\ffmpeg\\..." gibi Windows yollari burada elenir; boylece
      //  "ffmpeg" / "ffprobe" PATH fallback'ine duser.)
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }
    // Ciplak komut ("ffmpeg"): PATH uzerinden calistirilir.
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

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function serveStaticFile(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(ROOT_DIR, normalizedPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(response, 403, { error: "Yasak yol." });
    return;
  }

  fs.readFile(filePath, (error, fileBuffer) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendJson(response, 404, { error: "Dosya bulunamadi." });
        return;
      }

      sendJson(response, 500, { error: "Dosya okunamadi." });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(fileBuffer);
  });
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

    request.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    request.on("error", reject);
  });
}

function runProcess(command, args) {
  console.log("[ffmpeg]", command, args.join(" "));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(stderr.trim() || `${command} basarisiz oldu (${exitCode}).`));
    });
  });
}

async function probeBinary(bin) {
  // Binary'yi gercekten calistirip versiyonunu alir. fs.existsSync ciplak
  // komutlar ("ffmpeg") icin yaniltici oldugundan kesin sonuc icin bunu kullaniriz.
  if (!bin) {
    return { ok: false, error: "yol bulunamadi" };
  }
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
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=pix_fmt",
    "-of",
    "json",
    inputFile
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
  if (!filePath) {
    return;
  }

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Gecici dosya silinemedi:", filePath);
    }
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

      const filterComplex = "[1:v]format=gray[alpha];[0:v][alpha]alphamerge[outv]";

      await runProcess(ffmpegPath, [
        "-y", "-i", inputFile, "-i", matteFile,
        "-filter_complex", filterComplex,
        "-map", "[outv]", "-map", "0:a?",
        "-c:v", "prores_ks",
        "-profile:v", "4",
        "-pix_fmt", "yuva444p10le",
        "-qscale:v", "20",
        "-c:a", "aac", "-b:a", "256k",
        outputFile
      ]);

      return {
        outputFile,
        downloadName: `${baseName}-alpha.mov`,
        mimeType: "video/quicktime"
      };
    }

    if (mode === "transparent") {
      const alphaAvailable = await probeVideoAlpha(inputFile);

      if (!alphaAvailable) {
        throw Object.assign(new Error("Tarayici bu kayitta alpha kanali uretmedi."), {
          code: "ALPHA_UNAVAILABLE"
        });
      }

      await runProcess(ffmpegPath, [
        "-y", "-i", inputFile,
        "-c:v", "prores_ks",
        "-profile:v", "4",
        "-pix_fmt", "yuva444p10le",
        "-qscale:v", "20",
        "-c:a", "aac", "-b:a", "256k",
        outputFile
      ]);

      return {
        outputFile,
        downloadName: `${baseName}-alpha.mov`,
        mimeType: "video/quicktime"
      };
    }

    await runProcess(ffmpegPath, [
      "-y",
      "-i",
      inputFile,
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "12",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "320k",
      "-movflags",
      "+faststart",
      outputFile
    ]);

    return {
      outputFile,
      downloadName: `${baseName}.mp4`,
      mimeType: "video/mp4"
    };
  } catch (error) {
    // Hata durumunda yarim kalmis cikti dosyasini da temizle
    await safeUnlink(outputFile);
    throw error;
  } finally {
    // Girdi/matte gecici dosyalari her durumda silinir; cikti dosyasi
    // basariliysa caller tarafindan stream edilip sonra silinir.
    await safeUnlink(inputFile);
    await safeUnlink(matteFile);
  }
}

async function handleTranscode(request, response, requestUrl) {
  try {
    const inputBuffer = await collectRequestBody(request);
    const requestMode = requestUrl.searchParams.get("mode");
    const mode =
      requestMode === "transparent-dual"
        ? "transparent-dual"
        : requestMode === "transparent"
          ? "transparent"
          : "standard";
    const basename = requestUrl.searchParams.get("basename") || "visualizer";
    const result = await transcodeRecording(inputBuffer, {
      mode,
      basename
    });

    // Cikti dosyasini bellege okumadan dogrudan stream et. Boylece
    // 2 GB+ ProRes ciktilari (uzun kayitlar) fs.readFile sinirina takilmaz.
    const { size } = await fs.promises.stat(result.outputFile);
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${result.downloadName}"`,
      "Content-Length": size,
      "Content-Type": result.mimeType,
      "X-Download-Name": result.downloadName
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
    return;
  } catch (error) {
    if (error.code === "PAYLOAD_TOO_LARGE") {
      sendJson(response, 413, {
        code: error.code,
        error: error.message
      });
      return;
    }

    if (error.code === "ALPHA_UNAVAILABLE") {
      sendJson(response, 422, {
        code: error.code,
        error: error.message
      });
      return;
    }

    if (error.code === "INVALID_DUAL_PASS") {
      sendJson(response, 400, {
        code: error.code,
        error: error.message
      });
      return;
    }

    sendJson(response, 500, {
      code: error.code || "TRANSCODE_FAILED",
      error: error.message || "Transcode sirasinda hata olustu."
    });
  }
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (request.method === "GET" && requestUrl.pathname === "/api/debug") {
    Promise.all([probeBinary(ffmpegPath), probeBinary(ffprobePath)])
      .then(([ffmpeg, ffprobe]) => {
        sendJson(response, 200, {
          platform: process.platform,
          ffmpegPath,
          ffprobePath,
          ffmpeg,
          ffprobe,
          ready: ffmpeg.ok && ffprobe.ok
        });
      })
      .catch((error) => {
        sendJson(response, 500, { error: error.message });
      });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/transcode") {
    handleTranscode(request, response, requestUrl);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Desteklenmeyen istek." });
    return;
  }

  serveStaticFile(requestUrl.pathname, response);
});

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

if (require.main === module) {
  listenWithFallback(DEFAULT_PORT, MAX_PORT_ATTEMPTS);
}

module.exports = {
  listenWithFallback,
  server,
  transcodeRecording
};
