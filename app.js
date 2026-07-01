// ─── Palet ön-hesaplama yardımcıları ──────────────────────────────────────────
// Hex rengi bir kez [r, g, b] tuple'ına çevir; frame başına string parse yok.
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  const e = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return [parseInt(e.slice(0, 2), 16), parseInt(e.slice(2, 4), 16), parseInt(e.slice(4, 6), 16)];
}

// Frame içinde çağrılan hızlı rgba() builder.
function rgba(rgb, alpha) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// Palette objesine *Rgb kardeşlerini ekler (primaryRgb, secondaryRgb, accentRgb, bg1Rgb, bg2Rgb).
function withRgb(palette) {
  const result = { ...palette };
  for (const key of ["bg1", "bg2", "primary", "secondary", "accent"]) {
    if (result[key]) {
      result[`${key}Rgb`] = hexToRgb(result[key]);
    }
  }
  return result;
}
// ──────────────────────────────────────────────────────────────────────────────

const CREAM_RGB = hexToRgb("#f7f1e8");

const PALETTES = {
  redWhite: {
    label: "Kirmizi Beyaz",
    backdropLabel: "Kirmizi Gece",
    bg1: "#0b0205",
    bg2: "#220609",
    primary: "#ffffff",
    secondary: "#e6122b",
    accent: "#ff495a"
  },
  amberMint: {
    label: "Amber Mint",
    backdropLabel: "Aurora Mist",
    bg1: "#07111a",
    bg2: "#143549",
    primary: "#ff9754",
    secondary: "#85e3c4",
    accent: "#ffd37a"
  },
  neonCity: {
    label: "Neon City",
    backdropLabel: "Laser Grid",
    bg1: "#09091a",
    bg2: "#23154a",
    primary: "#1dc5ff",
    secondary: "#ff54b9",
    accent: "#ffef75"
  },
  solarDusk: {
    label: "Solar Dusk",
    backdropLabel: "Heat Bloom",
    bg1: "#180912",
    bg2: "#41194d",
    primary: "#ff6874",
    secondary: "#ffc575",
    accent: "#79f0ff"
  },
  frostPulse: {
    label: "Frost Pulse",
    backdropLabel: "Glass Air",
    bg1: "#071720",
    bg2: "#0f3641",
    primary: "#73d7ff",
    secondary: "#e4f7ff",
    accent: "#9effda"
  },
  monoWhite: {
    label: "Mono White",
    backdropLabel: "Ink Field",
    bg1: "#04070b",
    bg2: "#12161c",
    primary: "#ffffff",
    secondary: "#f1f4f7",
    accent: "#dfe6ec"
  }
};

// Normal paletler — Rgb dizileri önceden hesaplanmış.
const PALETTES_COMPUTED = Object.fromEntries(
  Object.entries(PALETTES).map(([key, palette]) => [key, withRgb(palette)])
);

// Export moduna özgü özel paletler (getActivePalette tarafından döndürülür).
const SPECIAL_PALETTES = {
  matte: withRgb({
    label: "Luma Matte",
    bg1: "#000000",
    bg2: "#000000",
    primary: "#ffffff",
    secondary: "#ffffff",
    accent: "#ffffff"
  })
};

const STYLE_LABELS = {
  bars: "Spectrum Bars",
  radial: "Halo Ring",
  wave: "Wave Ribbon",
  polygon: "Geometry Pulse",
  mirror: "Mirror Bars",
  spiral: "Spiral Bloom",
  tunnel: "Neon Tunnel",
  particles: "Particle Burst",
  lattice: "Pulse Lattice",
  area: "Aurora Wave",
  matrix: "Pulse Grid",
  blob: "Liquid Bloom",
  dots: "Dot Stream",
  oscilloscope: "Oscilloscope",
  stereo: "Stereo Field",
  neonstring: "Neon String",
  dotline: "Dot Line",
  mirror3d: "Mirror 3D",
  petalburst: "Petal Burst",
  spectrogram: "Spectrogram",
  ripplebeat: "Ripple Beat",
  dnahelix: "DNA Helix"
};

// Her modun dikey "agirlik merkezi" (yuksekligin orani). "Ortala" bu noktayi
// canvas merkezine (0.5) tasiyacak offset'i hesaplamak icin kullanir.
const MODE_ANCHOR_Y = {
  bars: 0.8,
  mirror: 0.55,
  wave: 0.52,
  area: 0.82,
  dots: 0.5,
  radial: 0.5,
  polygon: 0.5,
  spiral: 0.5,
  tunnel: 0.5,
  particles: 0.5,
  lattice: 0.56,
  blob: 0.5,
  matrix: 0.5,
  oscilloscope: 0.5,
  stereo: 0.5,
  neonstring: 0.5,
  dotline: 0.5,
  mirror3d: 0.5,
  petalburst: 0.5,
  spectrogram: 0.5,
  ripplebeat: 0.5,
  dnahelix: 0.5
};

const BACKDROP_LABELS = {
  aurora: "Aurora Mist",
  grid: "Laser Grid",
  void: "Deep Void",
  custom: "Kendi Gorselin"
};

const EXPORT_BACKGROUND_LABELS = {
  normal: "Normal Backdrop",
  blend: "Blend on Black",
  transparent: "Alpha Demo",
  green: "Green Screen",
  blue: "Blue Screen",
  matte: "Luma Matte"
};

const dom = {
  statusBanner: document.querySelector("#status-banner"),
  fileDrop: document.querySelector("#file-drop"),
  audioUpload: document.querySelector("#audio-upload"),
  audioPlayer: document.querySelector("#audio-player"),
  playToggle: document.querySelector("#play-toggle"),
  recordToggle: document.querySelector("#record-toggle"),
  fullscreenToggle: document.querySelector("#fullscreen-toggle"),
  downloadLink: document.querySelector("#download-link"),
  trackName: document.querySelector("#track-name"),
  trackMeta: document.querySelector("#track-meta"),
  styleSelect: document.querySelector("#style-select"),
  paletteSelect: document.querySelector("#palette-select"),
  backdropSelect: document.querySelector("#backdrop-select"),
  backdropUploadRow: document.querySelector("#backdrop-upload-row"),
  backdropDrop: document.querySelector("#backdrop-drop"),
  backdropImageUpload: document.querySelector("#backdrop-image-upload"),
  backdropImageName: document.querySelector("#backdrop-image-name"),
  backdropImageClear: document.querySelector("#backdrop-image-clear"),
  backdropDim: document.querySelector("#backdrop-dim"),
  backdropDimValue: document.querySelector("#backdrop-dim-value"),
  visualScale: document.querySelector("#visual-scale"),
  visualScaleValue: document.querySelector("#visual-scale-value"),
  visualOffsetX: document.querySelector("#visual-offset-x"),
  visualOffsetXValue: document.querySelector("#visual-offset-x-value"),
  visualOffsetY: document.querySelector("#visual-offset-y"),
  visualOffsetYValue: document.querySelector("#visual-offset-y-value"),
  visualCenter: document.querySelector("#visual-center"),
  visualReset: document.querySelector("#visual-reset"),
  barCount: document.querySelector("#bar-count"),
  sensitivity: document.querySelector("#sensitivity"),
  smoothing: document.querySelector("#smoothing"),
  glow: document.querySelector("#glow"),
  exportBgSelect: document.querySelector("#export-bg-select"),
  exportResolutionSelect: document.querySelector("#export-resolution-select"),
  exportFpsSelect: document.querySelector("#export-fps-select"),
  overlayCleanToggle: document.querySelector("#overlay-clean-toggle"),
  canvasLabelToggle: document.querySelector("#canvas-label-toggle"),
  barCountValue: document.querySelector("#bar-count-value"),
  sensitivityValue: document.querySelector("#sensitivity-value"),
  smoothingValue: document.querySelector("#smoothing-value"),
  glowValue: document.querySelector("#glow-value"),
  styleBadge: document.querySelector("#style-badge"),
  paletteBadge: document.querySelector("#palette-badge"),
  backdropBadge: document.querySelector("#backdrop-badge"),
  recordingPill: document.querySelector("#recording-pill"),
  energyValue: document.querySelector("#energy-value"),
  bassValue: document.querySelector("#bass-value"),
  midValue: document.querySelector("#mid-value"),
  highValue: document.querySelector("#high-value"),
  peakValue: document.querySelector("#peak-value"),
  timeValue: document.querySelector("#time-value"),
  progressTrack: document.querySelector("#progress-track"),
  emptyState: document.querySelector("#empty-state"),
  stageShell: document.querySelector("#stage-shell"),
  canvas: document.querySelector("#visualizer-canvas"),
  loopToggle: document.querySelector("#loop-toggle"),
  snapshotBtn: document.querySelector("#snapshot-btn"),
  micToggle: document.querySelector("#mic-toggle"),
  bpmValue: document.querySelector("#bpm-value"),
  customPaletteRow: document.querySelector("#custom-palette-row"),
  customPrimary: document.querySelector("#custom-primary"),
  customSecondary: document.querySelector("#custom-secondary"),
  customAccent: document.querySelector("#custom-accent"),
  presetName: document.querySelector("#preset-name"),
  presetSave: document.querySelector("#preset-save"),
  presetList: document.querySelector("#preset-list"),
  waveformTrack: document.querySelector("#waveform-track"),
  volumeSlider: document.querySelector("#volume-slider"),
  overlayTextToggle: document.querySelector("#overlay-text-toggle"),
  overlayArtist: document.querySelector("#overlay-artist"),
  overlayTitle: document.querySelector("#overlay-title"),
  overlayPosition: document.querySelector("#overlay-position"),
  overlayTextSize: document.querySelector("#overlay-text-size"),
  overlayTextSizeValue: document.querySelector("#overlay-text-size-value"),
  overlayTextColor: document.querySelector("#overlay-text-color"),
  overlayAnimation: document.querySelector("#overlay-animation"),
  beatFlashToggle: document.querySelector("#beat-flash-toggle"),
  reactiveHueToggle: document.querySelector("#reactive-hue-toggle"),
  albumArtInput: document.querySelector("#album-art-input"),
  albumArtClear: document.querySelector("#album-art-clear"),
  albumArtName: document.querySelector("#album-art-name"),
  albumArtOptions: document.querySelector("#album-art-options"),
  albumArtModeSelect: document.querySelector("#album-art-mode"),
  albumArtScale: document.querySelector("#album-art-scale"),
  albumArtScaleValue: document.querySelector("#album-art-scale-value"),
  albumArtOffsetX: document.querySelector("#album-art-offset-x"),
  albumArtOffsetXValue: document.querySelector("#album-art-offset-x-value"),
  albumArtOffsetY: document.querySelector("#album-art-offset-y"),
  albumArtOffsetYValue: document.querySelector("#album-art-offset-y-value"),
  albumArtResetBtn: document.querySelector("#album-art-reset"),
  quickclipBtn: document.querySelector("#quickclip-btn")
};

const context = dom.canvas.getContext("2d");
const TAU = Math.PI * 2;

const state = {
  style: dom.styleSelect.value,
  palette: dom.paletteSelect.value,
  backdrop: dom.backdropSelect.value,
  barCount: Number(dom.barCount.value),
  sensitivity: Number(dom.sensitivity.value),
  smoothing: Number(dom.smoothing.value),
  glow: Number(dom.glow.value),
  backdropDim: Number(dom.backdropDim.value),
  visualScale: Number(dom.visualScale.value),
  visualOffsetX: Number(dom.visualOffsetX.value),
  visualOffsetY: Number(dom.visualOffsetY.value),
  exportBackground: dom.exportBgSelect.value,
  exportResolution: dom.exportResolutionSelect.value,
  exportFps: Number(dom.exportFpsSelect.value) || 30,
  overlayClean: dom.overlayCleanToggle.checked,
  showCanvasLabel: dom.canvasLabelToggle.checked,
  width: 0,
  height: 0,
  lastFrameTime: performance.now(),
  lastUiUpdate: 0,
  audioContext: null,
  analyser: null,
  sourceNode: null,
  mediaDestination: null,
  frequencyData: null,
  waveformData: null,
  objectUrl: null,
  customBackdropImage: null,
  customBackdropUrl: null,
  customBackdropReady: false,
  recordingUrl: null,
  recorder: null,
  auxiliaryRecorders: [],
  recorderChunks: [],
  auxiliaryRecorderChunks: [],
  recorderTracks: [],
  auxiliaryRecorderTracks: [],
  fileSizeLabel: "",
  fileStem: "visualizer",
  barPeaks: [],
  rotation: 0,
  overlayCleanTouched: false,
  isFinalizingRecording: false,
  recordingProfile: null,
  transparentExportSurfaces: createTransparentExportSurfaces(),
  smoothed: {
    energy: 0.14,
    bass: 0.12,
    mid: 0.11,
    high: 0.1
  },
  lastMetrics: null,
  stars: createStars(120),
  loop: false,
  micActive: false,
  micStream: null,
  micSourceNode: null,
  customPalette: { primary: "#ff9754", secondary: "#85e3c4", accent: "#ffd37a" },
  stereoAnalyserL: null,
  stereoAnalyserR: null,
  stereoDataL: null,
  stereoDataR: null,
  waveformPeaks: null,
  overlayTextEnabled: false,
  overlayArtist: "",
  overlayTitle: "",
  overlayPosition: "bottom-left",
  overlayTextSize: 36,
  overlayTextColor: "#ffffff",
  overlayAnimation: "none",
  overlayAnimStartTime: 0,
  beatFlash: false,
  _beatFlashIntensity: 0,
  _lastBeatFlashTime: 0,
  reactiveHue: false,
  _hueOffset: 0,
  albumArt: null,
  albumArtMode: "center",
  albumArtScale: 1,
  albumArtOffsetX: 0,
  albumArtOffsetY: 0,
  ripples: []
};

const bpmTracker = { times: [], lastHigh: false, value: 0, lastBeat: 0 };
let _customPaletteCache = null;

initialize();

function initialize() {
  syncRangeLabels();
  syncSelectionBadges();
  syncOutputMode();
  syncBackdropUploadVisibility();
  syncCustomPaletteVisibility();
  bindEvents();
  resizeCanvasToDisplaySize();
  renderPresetList();
  // Oturum degisince (giris/cikis) preset'leri sunucudan tazele.
  document.addEventListener("mos-auth-change", reloadPresetsFromServer);
  checkServerAvailability();
  setStatus("idle", "Baslamak icin bir muzik dosyasi sec veya surukleyip birak.");
  requestAnimationFrame(renderFrame);
}

function bindEvents() {
  dom.audioUpload.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (file) {
      await loadTrack(file);
    }
  });

  dom.fileDrop.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dom.fileDrop.dataset.dragging = "true";
  });

  dom.fileDrop.addEventListener("dragover", (event) => {
    event.preventDefault();
    dom.fileDrop.dataset.dragging = "true";
  });

  dom.fileDrop.addEventListener("dragleave", () => {
    dom.fileDrop.dataset.dragging = "false";
  });

  dom.fileDrop.addEventListener("drop", async (event) => {
    event.preventDefault();
    dom.fileDrop.dataset.dragging = "false";

    const [file] = event.dataTransfer?.files || [];
    if (file) {
      await loadTrack(file);
    }
  });

  dom.fileDrop.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dom.audioUpload.click();
    }
  });

  // Muzik dosyasini dogrudan sahne (visual) alanina surukleyip birakabilme
  if (dom.stageShell) {
    dom.stageShell.addEventListener("dragover", (event) => {
      if (event.dataTransfer?.types?.includes("Files")) {
        event.preventDefault();
        dom.stageShell.dataset.dropping = "true";
      }
    });

    dom.stageShell.addEventListener("dragleave", (event) => {
      if (event.target === dom.stageShell) {
        dom.stageShell.dataset.dropping = "false";
      }
    });

    dom.stageShell.addEventListener("drop", async (event) => {
      event.preventDefault();
      dom.stageShell.dataset.dropping = "false";
      const [file] = event.dataTransfer?.files || [];
      if (file && isSupportedAudio(file)) {
        await loadTrack(file);
      }
    });
  }

  dom.playToggle.addEventListener("click", async () => {
    await togglePlayback();
  });

  dom.recordToggle.addEventListener("click", async () => {
    await toggleRecording();
  });

  dom.fullscreenToggle.addEventListener("click", async () => {
    await toggleFullscreen();
  });

  dom.styleSelect.addEventListener("change", () => {
    state.style = dom.styleSelect.value;
    syncSelectionBadges();
  });

  dom.paletteSelect.addEventListener("change", () => {
    state.palette = dom.paletteSelect.value;
    syncSelectionBadges();
    syncCustomPaletteVisibility();
  });

  dom.backdropSelect.addEventListener("change", () => {
    state.backdrop = dom.backdropSelect.value;
    syncSelectionBadges();
    syncBackdropUploadVisibility();
  });

  if (dom.backdropImageUpload) {
    dom.backdropImageUpload.addEventListener("change", (event) => {
      const [file] = event.target.files || [];
      if (file) {
        loadBackdropImage(file);
      }
    });
  }

  if (dom.backdropImageClear) {
    dom.backdropImageClear.addEventListener("click", (event) => {
      event.preventDefault();
      clearBackdropImage();
    });
  }

  if (dom.backdropDrop) {
    dom.backdropDrop.addEventListener("dragover", (event) => {
      event.preventDefault();
      dom.backdropDrop.dataset.dragging = "true";
    });

    dom.backdropDrop.addEventListener("dragleave", () => {
      dom.backdropDrop.dataset.dragging = "false";
    });

    dom.backdropDrop.addEventListener("drop", (event) => {
      event.preventDefault();
      dom.backdropDrop.dataset.dragging = "false";
      const [file] = event.dataTransfer?.files || [];
      if (file) {
        loadBackdropImage(file);
      }
    });
  }

  dom.barCount.addEventListener("input", () => {
    state.barCount = Number(dom.barCount.value);
    dom.barCountValue.textContent = `${state.barCount} bant`;
  });

  dom.sensitivity.addEventListener("input", () => {
    state.sensitivity = Number(dom.sensitivity.value);
    dom.sensitivityValue.textContent = `${state.sensitivity.toFixed(2)}x`;
  });

  dom.smoothing.addEventListener("input", () => {
    state.smoothing = Number(dom.smoothing.value);
    dom.smoothingValue.textContent = state.smoothing.toFixed(2);
    if (state.analyser) {
      state.analyser.smoothingTimeConstant = state.smoothing;
    }
    if (state.stereoAnalyserL) state.stereoAnalyserL.smoothingTimeConstant = state.smoothing;
    if (state.stereoAnalyserR) state.stereoAnalyserR.smoothingTimeConstant = state.smoothing;
  });

  dom.glow.addEventListener("input", () => {
    state.glow = Number(dom.glow.value);
    dom.glowValue.textContent = `${state.glow} px`;
  });

  dom.backdropDim.addEventListener("input", () => {
    state.backdropDim = Number(dom.backdropDim.value);
    dom.backdropDimValue.textContent = `${Math.round(state.backdropDim * 100)}%`;
  });

  dom.visualScale.addEventListener("input", () => {
    state.visualScale = Number(dom.visualScale.value);
    dom.visualScaleValue.textContent = `${state.visualScale.toFixed(2)}x`;
  });

  dom.visualOffsetX.addEventListener("input", () => {
    state.visualOffsetX = Number(dom.visualOffsetX.value);
    dom.visualOffsetXValue.textContent = formatSignedPercent(state.visualOffsetX);
  });

  dom.visualOffsetY.addEventListener("input", () => {
    state.visualOffsetY = Number(dom.visualOffsetY.value);
    dom.visualOffsetYValue.textContent = formatSignedPercent(state.visualOffsetY);
  });

  bindStepperButtons();

  if (dom.visualCenter) {
    dom.visualCenter.addEventListener("click", () => {
      const anchorY = MODE_ANCHOR_Y[state.style] ?? 0.5;
      const minOffset = Number(dom.visualOffsetY.min);
      const maxOffset = Number(dom.visualOffsetY.max);
      const centeredOffsetY = clamp(0.5 - anchorY, minOffset, maxOffset);

      setRangeValue(dom.visualOffsetX, 0);
      setRangeValue(dom.visualOffsetY, Number(centeredOffsetY.toFixed(2)));
    });
  }

  if (dom.visualReset) {
    dom.visualReset.addEventListener("click", () => {
      setRangeValue(dom.visualScale, 1);
      setRangeValue(dom.visualOffsetX, 0);
      setRangeValue(dom.visualOffsetY, 0);
    });
  }

  dom.exportBgSelect.addEventListener("change", () => {
    state.exportBackground = dom.exportBgSelect.value;
    if (!state.overlayCleanTouched) {
      const shouldClean = state.exportBackground !== "normal";
      state.overlayClean = shouldClean;
      dom.overlayCleanToggle.checked = shouldClean;
    }
    syncOutputMode();
    notifyDeferredExportChange("Export zemini");
  });

  dom.exportResolutionSelect.addEventListener("change", () => {
    state.exportResolution = dom.exportResolutionSelect.value;
    resizeCanvasToDisplaySize();
    notifyDeferredExportChange("Kayit cozunurlugu");
  });

  dom.exportFpsSelect.addEventListener("change", () => {
    state.exportFps = Number(dom.exportFpsSelect.value) || 30;
    notifyDeferredExportChange("Kare hizi");
  });

  dom.overlayCleanToggle.addEventListener("change", () => {
    state.overlayCleanTouched = true;
    state.overlayClean = dom.overlayCleanToggle.checked;
    notifyDeferredExportChange("Overlay temiz cizim");
  });

  dom.canvasLabelToggle.addEventListener("change", () => {
    state.showCanvasLabel = dom.canvasLabelToggle.checked;
    notifyDeferredExportChange("Canvas basligi");
  });

  dom.audioPlayer.addEventListener("play", async () => {
    await ensureAudioReady();
    setStatus(
      state.recorder ? "recording" : "playing",
      state.recorder
        ? "Kayit devam ediyor. Muzik ve canvas ayni anda yakalaniyor."
        : "Analiz canli. Modlari oynarken degistirebilirsin."
    );
    dom.playToggle.textContent = "Duraklat";
  });

  dom.audioPlayer.addEventListener("pause", () => {
    if (!dom.audioPlayer.ended) {
      setStatus("paused", state.recorder ? "Kayit acik, oynatma durakladi." : "Oynatma duraklatildi.");
    }
    dom.playToggle.textContent = dom.audioPlayer.currentTime > 0 ? "Devam Et" : "Oynat";
  });

  dom.audioPlayer.addEventListener("ended", async () => {
    if (state.loop && !state.recorder) {
      dom.audioPlayer.currentTime = 0;
      await dom.audioPlayer.play();
      return;
    }

    dom.playToggle.textContent = "Bastan Oynat";
    setStatus("ready", "Parca sona geldi. Tekrar oynatabilir veya yeni bir dosya yukleyebilirsin.");

    if (state.recorder) {
      stopRecording();
    }
  });

  dom.audioPlayer.addEventListener("loadedmetadata", () => {
    updateTrackMeta();
  });

  dom.audioPlayer.addEventListener("timeupdate", updateProgressBar);
  dom.audioPlayer.addEventListener("loadedmetadata", updateProgressBar);

  if (dom.progressTrack) {
    dom.progressTrack.addEventListener("pointerdown", (event) => {
      if (!Number.isFinite(dom.audioPlayer.duration) || dom.audioPlayer.duration <= 0) {
        return;
      }

      event.preventDefault();
      dom.progressTrack.setPointerCapture?.(event.pointerId);

      const seekTo = (clientX) => {
        const rect = dom.progressTrack.getBoundingClientRect();
        const ratio = clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1);
        dom.audioPlayer.currentTime = ratio * dom.audioPlayer.duration;
        updateProgressBar();
      };

      seekTo(event.clientX);

      const onMove = (moveEvent) => seekTo(moveEvent.clientX);
      const onUp = () => {
        dom.progressTrack.removeEventListener("pointermove", onMove);
        dom.progressTrack.removeEventListener("pointerup", onUp);
        dom.progressTrack.removeEventListener("pointercancel", onUp);
      };

      dom.progressTrack.addEventListener("pointermove", onMove);
      dom.progressTrack.addEventListener("pointerup", onUp);
      dom.progressTrack.addEventListener("pointercancel", onUp);
    });
  }

  window.addEventListener("resize", resizeCanvasToDisplaySize);

  if (dom.loopToggle) {
    dom.loopToggle.addEventListener("click", toggleLoop);
  }

  if (dom.snapshotBtn) {
    dom.snapshotBtn.addEventListener("click", takeSnapshot);
  }

  if (dom.micToggle) {
    dom.micToggle.addEventListener("click", async () => { await toggleMic(); });
  }

  if (dom.customPrimary) {
    dom.customPrimary.addEventListener("input", () => {
      state.customPalette.primary = dom.customPrimary.value;
      _customPaletteCache = null;
    });
  }

  if (dom.customSecondary) {
    dom.customSecondary.addEventListener("input", () => {
      state.customPalette.secondary = dom.customSecondary.value;
      _customPaletteCache = null;
    });
  }

  if (dom.customAccent) {
    dom.customAccent.addEventListener("input", () => {
      state.customPalette.accent = dom.customAccent.value;
      _customPaletteCache = null;
    });
  }

  if (dom.presetSave) {
    dom.presetSave.addEventListener("click", () => {
      savePreset(dom.presetName?.value || "");
      if (dom.presetName) {
        dom.presetName.value = "";
      }
    });
  }

  if (dom.volumeSlider) {
    dom.volumeSlider.addEventListener("input", () => {
      dom.audioPlayer.volume = Number(dom.volumeSlider.value);
    });
  }

  if (dom.overlayTextToggle) {
    dom.overlayTextToggle.addEventListener("change", () => {
      state.overlayTextEnabled = dom.overlayTextToggle.checked;
      if (state.overlayTextEnabled) state.overlayAnimStartTime = performance.now();
    });
  }

  if (dom.overlayArtist) {
    dom.overlayArtist.addEventListener("input", () => {
      state.overlayArtist = dom.overlayArtist.value;
      state.overlayAnimStartTime = performance.now();
    });
  }

  if (dom.overlayTitle) {
    dom.overlayTitle.addEventListener("input", () => {
      state.overlayTitle = dom.overlayTitle.value;
      state.overlayAnimStartTime = performance.now();
    });
  }

  if (dom.overlayPosition) {
    dom.overlayPosition.addEventListener("change", () => {
      state.overlayPosition = dom.overlayPosition.value;
    });
  }

  if (dom.overlayTextSize) {
    dom.overlayTextSize.addEventListener("input", () => {
      state.overlayTextSize = Number(dom.overlayTextSize.value);
      if (dom.overlayTextSizeValue) {
        dom.overlayTextSizeValue.textContent = `${state.overlayTextSize} px`;
      }
    });
  }

  if (dom.overlayTextColor) {
    dom.overlayTextColor.addEventListener("input", () => {
      state.overlayTextColor = dom.overlayTextColor.value;
    });
  }

  if (dom.overlayAnimation) {
    dom.overlayAnimation.addEventListener("change", () => {
      state.overlayAnimation = dom.overlayAnimation.value;
      state.overlayAnimStartTime = performance.now();
    });
  }

  if (dom.waveformTrack) {
    const waveformObserver = new ResizeObserver(() => drawWaveformTrack());
    waveformObserver.observe(dom.waveformTrack);
  }

  if (dom.beatFlashToggle) {
    dom.beatFlashToggle.addEventListener("change", () => {
      state.beatFlash = dom.beatFlashToggle.checked;
    });
  }

  if (dom.reactiveHueToggle) {
    dom.reactiveHueToggle.addEventListener("change", () => {
      state.reactiveHue = dom.reactiveHueToggle.checked;
      if (!state.reactiveHue) {
        state._hueOffset = 0;
        context.filter = "none";
      }
    });
  }

  if (dom.albumArtInput) {
    dom.albumArtInput.addEventListener("change", () => {
      const file = dom.albumArtInput.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.albumArt = img;
        if (dom.albumArtName) dom.albumArtName.textContent = file.name;
        if (dom.albumArtClear) dom.albumArtClear.hidden = false;
        if (dom.albumArtOptions) dom.albumArtOptions.hidden = false;
      };
      img.src = url;
    });
  }

  if (dom.albumArtClear) {
    dom.albumArtClear.addEventListener("click", (e) => {
      e.preventDefault();
      state.albumArt = null;
      if (dom.albumArtInput) dom.albumArtInput.value = "";
      if (dom.albumArtName) dom.albumArtName.textContent = "Gorsel sec";
      if (dom.albumArtClear) dom.albumArtClear.hidden = true;
      if (dom.albumArtOptions) dom.albumArtOptions.hidden = true;
    });
  }

  if (dom.albumArtModeSelect) {
    dom.albumArtModeSelect.addEventListener("change", () => {
      state.albumArtMode = dom.albumArtModeSelect.value;
    });
  }

  if (dom.albumArtScale) {
    dom.albumArtScale.addEventListener("input", () => {
      state.albumArtScale = Number(dom.albumArtScale.value);
      if (dom.albumArtScaleValue) {
        dom.albumArtScaleValue.textContent = `${state.albumArtScale.toFixed(2)}x`;
      }
    });
  }

  if (dom.albumArtOffsetX) {
    dom.albumArtOffsetX.addEventListener("input", () => {
      state.albumArtOffsetX = Number(dom.albumArtOffsetX.value);
      if (dom.albumArtOffsetXValue) {
        dom.albumArtOffsetXValue.textContent = `${Math.round(state.albumArtOffsetX * 100)}%`;
      }
    });
  }

  if (dom.albumArtOffsetY) {
    dom.albumArtOffsetY.addEventListener("input", () => {
      state.albumArtOffsetY = Number(dom.albumArtOffsetY.value);
      if (dom.albumArtOffsetYValue) {
        dom.albumArtOffsetYValue.textContent = `${Math.round(state.albumArtOffsetY * 100)}%`;
      }
    });
  }

  if (dom.albumArtResetBtn) {
    dom.albumArtResetBtn.addEventListener("click", () => {
      state.albumArtOffsetX = 0;
      state.albumArtOffsetY = 0;
      if (dom.albumArtOffsetX) dom.albumArtOffsetX.value = "0";
      if (dom.albumArtOffsetY) dom.albumArtOffsetY.value = "0";
      if (dom.albumArtOffsetXValue) dom.albumArtOffsetXValue.textContent = "0%";
      if (dom.albumArtOffsetYValue) dom.albumArtOffsetYValue.textContent = "0%";
    });
  }

  if (dom.quickclipBtn) {
    dom.quickclipBtn.addEventListener("click", exportQuickClip);
  }

  document.addEventListener("keydown", async (event) => {
    const tagName = document.activeElement?.tagName;
    if (tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA") {
      return;
    }

    switch (event.code) {
      case "Space":
        event.preventDefault();
        await togglePlayback();
        break;
      case "KeyM":
        dom.audioPlayer.muted = !dom.audioPlayer.muted;
        setStatus(
          dom.audioPlayer.paused ? "ready" : "playing",
          dom.audioPlayer.muted ? "Ses kapatildi. (M ile ac)" : "Ses acildi."
        );
        break;
      case "KeyR":
        event.preventDefault();
        await toggleRecording();
        break;
      case "KeyL":
        toggleLoop();
        break;
      case "KeyS":
        event.preventDefault();
        takeSnapshot();
        break;
      case "ArrowLeft":
        if (Number.isFinite(dom.audioPlayer.duration)) {
          event.preventDefault();
          dom.audioPlayer.currentTime = Math.max(0, dom.audioPlayer.currentTime - 5);
          updateProgressBar();
        }
        break;
      case "ArrowRight":
        if (Number.isFinite(dom.audioPlayer.duration)) {
          event.preventDefault();
          dom.audioPlayer.currentTime = Math.min(dom.audioPlayer.duration, dom.audioPlayer.currentTime + 5);
          updateProgressBar();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        dom.audioPlayer.volume = Math.min(1, dom.audioPlayer.volume + 0.05);
        if (dom.volumeSlider) dom.volumeSlider.value = dom.audioPlayer.volume;
        break;
      case "ArrowDown":
        event.preventDefault();
        dom.audioPlayer.volume = Math.max(0, dom.audioPlayer.volume - 0.05);
        if (dom.volumeSlider) dom.volumeSlider.value = dom.audioPlayer.volume;
        break;
      case "KeyC":
        event.preventDefault();
        exportQuickClip();
        break;
    }
  });
}

async function loadTrack(file) {
  if (!isSupportedAudio(file)) {
    setStatus("error", "Desteklenmeyen dosya tipi. MP3, WAV, M4A, AAC, OGG veya FLAC dene.");
    return;
  }

  if (state.micActive) {
    deactivateMic();
  }

  if (state.recorder) {
    stopRecording();
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.objectUrl = URL.createObjectURL(file);
  state.fileSizeLabel = formatFileSize(file.size);
  state.fileStem = file.name.replace(/\.[^.]+$/, "") || "visualizer";
  state.lastMetrics = null;
  state.barPeaks = [];
  releaseRecordingUrl();

  dom.audioPlayer.src = state.objectUrl;
  dom.audioPlayer.load();
  dom.trackName.textContent = file.name;
  dom.trackMeta.textContent = `${state.fileSizeLabel} - metadata okunuyor`;
  dom.emptyState.hidden = true;

  state.waveformPeaks = null;
  drawWaveformTrack();
  file.arrayBuffer().then((buf) => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = state.audioContext || new Ctx();
    return ctx.decodeAudioData(buf);
  }).then((decoded) => {
    if (!decoded) return;
    state.waveformPeaks = decodeWaveformPeaks(decoded, 600);
    drawWaveformTrack();
  }).catch(() => {});
  dom.fileDrop.dataset.loaded = "true";
  dom.downloadLink.hidden = true;
  dom.downloadLink.textContent = "Kaydi indir";

  try {
    await ensureAudioReady();
    setStatus("ready", "Parca hazir. Oynat tusuna bastiginda canli analiz baslayacak.");
  } catch (error) {
    setStatus("error", "Tarayici ses analizini baslatamadi. Sayfayi yenileyip tekrar dene.");
  }
}

async function togglePlayback() {
  if (!dom.audioPlayer.src) {
    setStatus("idle", "Once bir muzik dosyasi secmelisin.");
    return;
  }

  await ensureAudioReady();

  if (dom.audioPlayer.paused) {
    if (dom.audioPlayer.ended || dom.audioPlayer.currentTime >= dom.audioPlayer.duration - 0.05) {
      dom.audioPlayer.currentTime = 0;
    }

    await dom.audioPlayer.play();
    return;
  }

  dom.audioPlayer.pause();
}

// Premium eylem guard'i: misafirse giris modalini acar ve eylemi durdurur.
function requirePremium() {
  if (window.MosAuth && !window.MosAuth.isAuthed()) {
    window.MosAuth.requireAuth();
    setStatus("idle", "Bu ozellik icin ucretsiz giris/kayit gerekli.");
    return false;
  }
  return true;
}

async function toggleRecording() {
  if (!requirePremium()) return;
  if (state.isFinalizingRecording) {
    setStatus("paused", "Onceki kayit isleniyor. Bir kac saniye bekleyip tekrar dene.");
    return;
  }

  if (state.recorder) {
    stopRecording();
    return;
  }

  if (!dom.audioPlayer.src) {
    setStatus("error", "Kayit icin once bir muzik dosyasi yuklemelisin.");
    return;
  }

  if (!window.MediaRecorder || typeof dom.canvas.captureStream !== "function") {
    setStatus("error", "Bu tarayici canvas kaydini desteklemiyor.");
    return;
  }

  await ensureAudioReady();

  if (dom.audioPlayer.ended || dom.audioPlayer.currentTime >= dom.audioPlayer.duration - 0.05) {
    dom.audioPlayer.currentTime = 0;
  }

  startRecording();

  if (dom.audioPlayer.paused) {
    await dom.audioPlayer.play();
  }
}

function startRecording() {
  if (!state.mediaDestination) {
    setStatus("error", "Audio graph hazir degil. Bir kez oynatip tekrar dene.");
    return;
  }

  const recordingProfile = captureRecordingProfile();
  const isTransparent = recordingProfile.exportBackground === "transparent";
  const mimeType = pickRecordingMimeType(isTransparent);

  if (!mimeType) {
    setStatus("error", "Bu tarayici uygun video codec kaydi vermiyor.");
    return;
  }

  state.recordingProfile = recordingProfile;
  syncOutputMode();
  resizeCanvasToDisplaySize();
  releaseRecordingUrl();
  dom.downloadLink.hidden = true;
  dom.downloadLink.textContent = "Kaydi indir";

  if (recordingProfile.exportBackground === "transparent") {
    startTransparentRecording(recordingProfile, mimeType);
  } else {
    startStandardRecording(recordingProfile, mimeType);
  }
}

function startStandardRecording(recordingProfile, mimeType) {
  const fps = recordingProfile.exportFps || 30;
  const canvasStream = dom.canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...state.mediaDestination.stream.getAudioTracks()
  ]);
  const recorder = new MediaRecorder(combinedStream, getRecorderOptions(mimeType));
  state.recorderChunks = [];
  const rawBlobPromise = createRecorderBlobPromise(recorder, state.recorderChunks);

  state.recorder = recorder;
  state.auxiliaryRecorders = [];
  state.recorderTracks = combinedStream.getTracks();
  state.auxiliaryRecorderTracks = [];
  state.auxiliaryRecorderChunks = [];

  recorder.addEventListener("stop", async () => {
    const recordingProfileForExport = state.recordingProfile || captureRecordingProfile();
    const rawBlob = await rawBlobPromise;
    await finalizeStoppedRecording({
      rawBlob,
      recordingProfile: recordingProfileForExport
    });
  });

  recorder.start(250);
  dom.recordToggle.textContent = "Kaydi Bitir";
  dom.recordingPill.hidden = false;
  setStatus("recording", "Kayit aliniyor. Durdurdugunda video dosyasi indirilebilir olacak.");
}

function startTransparentRecording(recordingProfile, mimeType) {
  syncTransparentExportSurfaces();

  const exportSurfaces = state.transparentExportSurfaces;
  const fps = recordingProfile.exportFps || 30;
  const colorStream = exportSurfaces.colorCanvas.captureStream(fps);
  const matteStream = exportSurfaces.matteCanvas.captureStream(fps);
  const combinedColorStream = new MediaStream([
    ...colorStream.getVideoTracks(),
    ...state.mediaDestination.stream.getAudioTracks()
  ]);
  const colorRecorder = new MediaRecorder(combinedColorStream, getRecorderOptions(mimeType));
  const matteRecorder = new MediaRecorder(matteStream, getRecorderOptions(pickVideoOnlyMimeType(), false));

  state.recorderChunks = [];
  state.auxiliaryRecorderChunks = [];
  const colorBlobPromise = createRecorderBlobPromise(colorRecorder, state.recorderChunks);
  const matteBlobPromise = createRecorderBlobPromise(matteRecorder, state.auxiliaryRecorderChunks);

  state.recorder = colorRecorder;
  state.auxiliaryRecorders = [matteRecorder];
  state.recorderTracks = combinedColorStream.getTracks();
  state.auxiliaryRecorderTracks = matteStream.getTracks();

  colorRecorder.addEventListener("stop", async () => {
    const recordingProfileForExport = state.recordingProfile || captureRecordingProfile();
    try {
      const [rawBlob, matteBlob] = await Promise.all([colorBlobPromise, matteBlobPromise]);
      await finalizeStoppedRecording({ rawBlob, matteBlob, recordingProfile: recordingProfileForExport });
    } catch (error) {
      console.error("[Visualizer] Transparent kayit hatasi:", error);
      const rawBlob = await colorBlobPromise.catch(() => new Blob([], { type: "video/webm" }));
      await finalizeStoppedRecording({ rawBlob, recordingProfile: recordingProfileForExport });
    }
  });

  colorRecorder.start(100);
  matteRecorder.start(100);
  dom.recordToggle.textContent = "Kaydi Bitir";
  dom.recordingPill.hidden = false;
  setStatus("recording", "Alpha MOV kayit aliniyor — iki kanal eslestirilecek.");
}

async function finalizeStoppedRecording({ rawBlob, recordingProfile, matteBlob = null }) {
  const wasPlaying = !dom.audioPlayer.paused && !dom.audioPlayer.ended;
  const playbackEnded = dom.audioPlayer.ended;

  state.recorderTracks.forEach((track) => track.stop());
  state.auxiliaryRecorderTracks.forEach((track) => track.stop());
  state.recorderTracks = [];
  state.auxiliaryRecorderTracks = [];
  state.recorder = null;
  state.auxiliaryRecorders = [];
  state.recordingProfile = null;
  state.isFinalizingRecording = true;
  syncOutputMode();
  resizeCanvasToDisplaySize();

  dom.recordToggle.disabled = true;
  dom.recordToggle.textContent = "Video Isleniyor";
  dom.recordingPill.hidden = true;
  setStatus("recording", "Kayit alindi. Video isleniyor, bu bir kac saniye surebilir.");

  try {
    const result = await finalizeRecordingBlob(rawBlob, recordingProfile, matteBlob);
    setDownloadFile(result.blob, result.downloadName, result.warningCode);

    if (result.warningCode) {
      setStatus("error", buildRecordingWarningMessage(result.warningCode, result.warningDetail));
      return;
    }

    if (wasPlaying) {
      setStatus("playing", buildRecordingReadyMessage(result.downloadName));
    } else if (playbackEnded) {
      setStatus("ready", buildRecordingReadyMessage(result.downloadName));
    } else {
      setStatus("paused", buildRecordingReadyMessage(result.downloadName));
    }
  } finally {
    state.isFinalizingRecording = false;
    dom.recordToggle.disabled = false;
    dom.recordToggle.textContent = "Kaydi Baslat";
  }
}

function stopRecording() {
  if (state.recorder && state.recorder.state !== "inactive") {
    state.recorder.stop();
  }

  state.auxiliaryRecorders.forEach((recorder) => {
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  });
}

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  await dom.stageShell.requestFullscreen();
}

async function ensureAudioReady() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("AudioContext unsupported");
    }

    state.audioContext = new AudioContextClass();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.minDecibels = -100;
    state.analyser.maxDecibels = -18;
    state.analyser.smoothingTimeConstant = state.smoothing;

    state.sourceNode = state.audioContext.createMediaElementSource(dom.audioPlayer);
    state.mediaDestination = state.audioContext.createMediaStreamDestination();

    state.sourceNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);
    state.analyser.connect(state.mediaDestination);

    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    state.waveformData = new Uint8Array(state.analyser.fftSize);

    const splitter = state.audioContext.createChannelSplitter(2);
    state.sourceNode.connect(splitter);
    state.stereoAnalyserL = state.audioContext.createAnalyser();
    state.stereoAnalyserL.fftSize = 2048;
    state.stereoAnalyserL.smoothingTimeConstant = state.smoothing;
    state.stereoAnalyserR = state.audioContext.createAnalyser();
    state.stereoAnalyserR.fftSize = 2048;
    state.stereoAnalyserR.smoothingTimeConstant = state.smoothing;
    try { splitter.connect(state.stereoAnalyserL, 0); } catch (_) {}
    try { splitter.connect(state.stereoAnalyserR, 1); } catch (_) {}
    state.stereoDataL = new Float32Array(state.stereoAnalyserL.fftSize);
    state.stereoDataR = new Float32Array(state.stereoAnalyserR.fftSize);
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }
}

function renderFrame(now) {
  const delta = now - state.lastFrameTime || 16;
  state.lastFrameTime = now;
  state.rotation += delta * 0.00022;

  try {
    const metrics = readMetrics(now);
    const renderSettings = getRenderSettings();
    context.clearRect(0, 0, state.width, state.height);

    // Reaktif renk: her frame'de hue offset'i guncelle, canvas filter'a yaz
    if (state.reactiveHue) {
      state._hueOffset = (state._hueOffset + metrics.energy * 2.2 + 0.28) % 360;
      context.filter = `hue-rotate(${Math.round(state._hueOffset)}deg)`;
    }

    if (renderSettings.exportBackground === "normal") {
      drawBackdrop(metrics, now);
    } else if (renderSettings.exportBackground !== "transparent") {
      fillExportBackground();
    }

    // Albüm kapağı — arka plan modu (visual'dan önce)
    if (state.albumArt && state.albumArtMode === "backdrop") {
      drawAlbumArt(metrics);
    }

    const offsetX = state.visualOffsetX * state.width;
    const offsetY = state.visualOffsetY * state.height;
    const transformVisual = state.visualScale !== 1 || offsetX !== 0 || offsetY !== 0;
    if (transformVisual) {
      context.save();
      context.translate(state.width / 2 + offsetX, state.height / 2 + offsetY);
      context.scale(state.visualScale, state.visualScale);
      context.translate(-state.width / 2, -state.height / 2);
    }

    switch (state.style) {
      case "radial":
        drawRadial(metrics);
        break;
      case "wave":
        drawWave(metrics, now);
        break;
      case "polygon":
        drawPolygon(metrics, now);
        break;
      case "mirror":
        drawMirrorBars(metrics);
        break;
      case "spiral":
        drawSpiral(metrics, now);
        break;
      case "tunnel":
        drawTunnel(metrics, now);
        break;
      case "particles":
        drawParticleBurst(metrics, now);
        break;
      case "lattice":
        drawPulseLattice(metrics, now);
        break;
      case "area":
        drawAuroraWave(metrics);
        break;
      case "matrix":
        drawPulseGrid(metrics);
        break;
      case "blob":
        drawLiquidBloom(metrics, now);
        break;
      case "dots":
        drawDotStream(metrics, now);
        break;
      case "oscilloscope":
        drawOscilloscope(metrics, now);
        break;
      case "stereo":
        drawStereoField(metrics, now);
        break;
      case "neonstring":
        drawNeonString(metrics, now);
        break;
      case "dotline":
        drawDotLine(metrics, now);
        break;
      case "mirror3d":
        drawMirror3D(metrics, now);
        break;
      case "petalburst":
        drawPetalBurst(metrics, now);
        break;
      case "spectrogram":
        drawSpectrogram(metrics, now);
        break;
      case "ripplebeat":
        drawRippleBeat(metrics, now);
        break;
      case "dnahelix":
        drawDNAHelix(metrics, now);
        break;
      case "bars":
      default:
        drawBars(metrics);
        break;
    }

    if (transformVisual) {
      context.restore();
    }

    // Albüm kapağı — merkez daire modu (visual'dan sonra)
    if (state.albumArt && state.albumArtMode === "center") {
      drawAlbumArt(metrics);
    }

    // Beat flash: bass vurusunda radyal parlaklık dalgası
    if (state.beatFlash && metrics.isLive) {
      state._beatFlashIntensity = (state._beatFlashIntensity || 0) * 0.80;
      if (metrics.bass > 0.56 && now - (state._lastBeatFlashTime || 0) > 155) {
        state._beatFlashIntensity = metrics.bass * 0.72;
        state._lastBeatFlashTime = now;
      }
      if (state._beatFlashIntensity > 0.006) {
        const fp = getActivePalette();
        const fg = context.createRadialGradient(
          state.width * 0.5, state.height * 0.5, 0,
          state.width * 0.5, state.height * 0.5, Math.min(state.width, state.height) * 0.72
        );
        fg.addColorStop(0,   rgba(fp.primaryRgb, state._beatFlashIntensity * 0.50));
        fg.addColorStop(0.4, rgba(fp.primaryRgb, state._beatFlashIntensity * 0.18));
        fg.addColorStop(1,   rgba(fp.primaryRgb, 0));
        context.fillStyle = fg;
        context.fillRect(0, 0, state.width, state.height);
      }
    }

    if (renderSettings.showCanvasLabel) {
      drawCenterBadge(metrics);
    }

    drawTrackOverlay(metrics, now);

    // Reaktif renk filter'i sifirla
    if (state.reactiveHue) context.filter = "none";

    if (state.recordingProfile?.exportBackground === "transparent") {
      syncTransparentExportSurfaces();
    }

    if (now - state.lastUiUpdate > 120) {
      updateRuntimeUi(metrics);
      state.lastUiUpdate = now;
    }
  } catch (_) {}

  requestAnimationFrame(renderFrame);
}

function readMetrics(now) {
  const isLive = state.analyser && (state.micActive || (!dom.audioPlayer.paused && !dom.audioPlayer.ended));
  if (isLive) {
    state.analyser.getByteFrequencyData(state.frequencyData);
    state.analyser.getByteTimeDomainData(state.waveformData);

    const samples = sampleFrequencyBins(state.barCount);

    // Sinyalsiz (dead zone) barlara mikro-animasyon: donuk görünmesin.
    // Sinyali olan barlar bu bloğa girmez, sadece gerçekten boş olanlar etkilenir.
    const t = now * 0.001;
    for (let i = 0; i < samples.length; i++) {
      if (samples[i] < 0.022) {
        // Dinamik cap sonrası hala boş kalan barlar için hızlı nefes
        samples[i] = 0.04
          + Math.abs(Math.sin(t * 3.2 + i * 0.23)) * 0.06
          + Math.abs(Math.cos(t * 2.1 + i * 0.31)) * 0.025;
      }
    }

    const bandAverages = computeBandAverages();
    const energyTarget = clamp(
      ((bandAverages.low * 1.28 + bandAverages.mid + bandAverages.high * 0.82) / 3.1) *
        state.sensitivity,
      0,
      1.3
    );

    state.smoothed.energy = lerp(state.smoothed.energy, energyTarget, 0.18);
    state.smoothed.bass = lerp(state.smoothed.bass, clamp(bandAverages.low * state.sensitivity, 0, 1.2), 0.16);
    state.smoothed.mid = lerp(state.smoothed.mid, clamp(bandAverages.mid * state.sensitivity, 0, 1.2), 0.16);
    state.smoothed.high = lerp(state.smoothed.high, clamp(bandAverages.high * state.sensitivity, 0, 1.2), 0.16);

    updateBpm(state.smoothed.bass, now);

    const metrics = {
      samples,
      energy: state.smoothed.energy,
      bass: state.smoothed.bass,
      mid: state.smoothed.mid,
      high: state.smoothed.high,
      peakFrequency: resolvePeakFrequency(),
      waveform: state.waveformData,
      isLive: true
    };

    state.lastMetrics = metrics;
    return metrics;
  }

  return buildPassiveMetrics(now);
}

function buildPassiveMetrics(now) {
  const t = now * 0.001;
  const source = state.lastMetrics?.samples || [];
  const sampleCount = state.barCount;
  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const held = source[index] || 0.08;
    const idle = 0.06 + Math.sin(t * 1.7 + index * 0.22) * 0.03 + Math.cos(t * 0.8 + index * 0.15) * 0.02;
    return clamp(lerp(held, idle, 0.22), 0.02, 0.42);
  });

  state.smoothed.energy = lerp(state.smoothed.energy, 0.16, 0.05);
  state.smoothed.bass = lerp(state.smoothed.bass, 0.14, 0.05);
  state.smoothed.mid = lerp(state.smoothed.mid, 0.12, 0.05);
  state.smoothed.high = lerp(state.smoothed.high, 0.1, 0.05);

  return {
    samples,
    energy: state.smoothed.energy,
    bass: state.smoothed.bass,
    mid: state.smoothed.mid,
    high: state.smoothed.high,
    peakFrequency: state.lastMetrics?.peakFrequency || 0,
    waveform: state.lastMetrics?.waveform || null,
    isLive: false
  };
}

function drawBackdrop(metrics, now) {
  const palette = getActivePalette();
  const width = state.width;
  const height = state.height;

  if (state.backdrop === "custom") {
    drawCustomBackdrop(palette, width, height, metrics, now);
    return;
  }

  const baseGradient = context.createLinearGradient(0, 0, width, height);
  baseGradient.addColorStop(0, palette.bg1);
  baseGradient.addColorStop(1, palette.bg2);
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, width, height);

  if (state.backdrop === "aurora") {
    for (let index = 0; index < 3; index += 1) {
      const shift = now * 0.00016 + index * 1.9;
      drawGlow(
        width * (0.18 + index * 0.28 + Math.sin(shift) * 0.05),
        height * (0.26 + Math.cos(shift * 1.1) * 0.08),
        Math.min(width, height) * (0.22 + metrics.energy * 0.08),
        index % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb,
        0.18
      );
    }
  } else if (state.backdrop === "grid") {
    context.save();
    context.strokeStyle = rgba(palette.secondaryRgb, 0.08);
    context.lineWidth = 1;

    for (let x = 0; x <= width; x += 42) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    for (let y = 0; y <= height; y += 42) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.restore();
    drawGlow(width * 0.5, height * 0.48, Math.min(width, height) * 0.24, palette.primaryRgb, 0.16);
  } else {
    context.save();

    state.stars.forEach((star, index) => {
      const twinkle = 0.2 + (Math.sin(now * 0.001 * star.speed + star.offset) + 1) * 0.2;
      context.fillStyle = rgba(index % 2 === 0 ? palette.secondaryRgb : palette.accentRgb, twinkle);
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    });

    context.restore();
    drawGlow(width * 0.52, height * 0.45, Math.min(width, height) * 0.18, palette.primaryRgb, 0.14);
    drawGlow(width * 0.38, height * 0.58, Math.min(width, height) * 0.13, palette.secondaryRgb, 0.12);
  }

  const vignette = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7
  );
  vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function drawCustomBackdrop(palette, width, height, metrics, now) {
  if (state.customBackdropReady && state.customBackdropImage) {
    const energy = metrics ? metrics.energy : 0;
    const bass = metrics ? metrics.bass : 0;

    // Sese tepkili hafif zoom + yumusak parallax kaymasi
    const zoom = 1.045 + bass * 0.05 + energy * 0.025;
    const driftX = Math.sin(now * 0.00018) * width * 0.012 * (0.35 + energy);
    const driftY = Math.cos(now * 0.00015) * height * 0.012 * (0.35 + energy);

    drawImageCover(state.customBackdropImage, width, height, zoom, driftX, driftY);

    // Visualizer'in okunur kalmasi icin ayarlanabilir karartma
    context.fillStyle = `rgba(4, 8, 13, ${clamp(state.backdropDim, 0, 0.92)})`;
    context.fillRect(0, 0, width, height);
  } else {
    const fallback = context.createLinearGradient(0, 0, width, height);
    fallback.addColorStop(0, palette.bg1);
    fallback.addColorStop(1, palette.bg2);
    context.fillStyle = fallback;
    context.fillRect(0, 0, width, height);
  }

  const vignette = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.7
  );
  vignette.addColorStop(0, "rgba(255, 255, 255, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function drawBars(metrics) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const bottom = height * 0.8;
  const top = height * 0.18;
  const padding = Math.max(22, width * 0.04);
  const count = metrics.samples.length;
  const gap = count > 100 ? 2 : 4;
  const barWidth = Math.max(3, (width - padding * 2 - gap * (count - 1)) / count);
  const maxHeight = bottom - top;

  context.save();
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.65 * profile.glowAlpha);

  for (let index = 0; index < count; index += 1) {
    const sample = metrics.samples[index];
    const barHeight = clamp(sample, 0.04, 1.28) * maxHeight;
    const x = padding + index * (barWidth + gap);
    const y = bottom - barHeight;

    state.barPeaks[index] = Math.max(barHeight, (state.barPeaks[index] || 0) - 1.6);

    const gradient = context.createLinearGradient(0, y, 0, bottom);
    gradient.addColorStop(0, palette.secondary);
    gradient.addColorStop(0.55, palette.primary);
    gradient.addColorStop(1, rgba(palette.primaryRgb, 0.28 * profile.fillAlpha));
    context.fillStyle = gradient;
    fillRoundedRect(context, x, y, barWidth, barHeight, Math.min(barWidth * 0.45, 6));

    if (profile.reflectionAlpha > 0) {
      const reflectionHeight = barHeight * 0.24;
      context.fillStyle = rgba(palette.secondaryRgb, 0.08 * profile.reflectionAlpha);
      fillRoundedRect(context, x, bottom + 10, barWidth, reflectionHeight, Math.min(barWidth * 0.45, 6));
    }
  }

  context.shadowBlur = 0;
  context.fillStyle = rgba(palette.accentRgb, 0.9);

  for (let index = 0; index < count; index += 1) {
    const peak = state.barPeaks[index] || 0;
    const x = padding + index * (barWidth + gap);
    const capY = bottom - peak - 6;
    fillRoundedRect(context, x, capY, barWidth, 3, 999);
  }

  context.restore();
}

function drawRadial(metrics) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.16;
  const extension = Math.min(width, height) * 0.21;
  const samples = resample(metrics.samples, Math.min(metrics.samples.length, 112));

  context.save();
  context.translate(centerX, centerY);
  context.rotate(state.rotation * 0.8);
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.72 * profile.glowAlpha);

  for (let index = 0; index < samples.length; index += 1) {
    const value = samples[index];
    const angle = (index / samples.length) * TAU;
    const inner = radius;
    const outer = radius + value * extension;
    const hueColor = index % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb;

    context.strokeStyle = rgba(hueColor, 0.88);
    context.lineWidth = 2.2 + value * 4.8;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  context.shadowBlur = 0;
  context.lineWidth = 2;
  context.strokeStyle = rgba(palette.accentRgb, 0.82);
  context.beginPath();
  context.arc(0, 0, radius + metrics.bass * 18, 0, TAU);
  context.stroke();

  if (profile.allowSoftFill) {
    const coreGradient = context.createRadialGradient(0, 0, 10, 0, 0, radius * 0.88);
    coreGradient.addColorStop(0, rgba(palette.secondaryRgb, 0.86 * profile.fillAlpha));
    coreGradient.addColorStop(1, rgba(palette.primaryRgb, 0.16 * profile.fillAlpha));
    context.fillStyle = coreGradient;
    context.beginPath();
    context.arc(0, 0, radius * (0.48 + metrics.energy * 0.16), 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawWave(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.52;
  const waveform = metrics.waveform;

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.7 * profile.glowAlpha);

  context.beginPath();

  if (waveform) {
    const step = Math.max(1, Math.floor(waveform.length / Math.max(120, width / 3)));

    for (let index = 0; index < waveform.length; index += step) {
      const x = (index / (waveform.length - 1)) * width;
      const normalized = (waveform[index] - 128) / 128;
      const y = centerY + normalized * height * 0.26;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
  } else {
    for (let index = 0; index < width; index += 8) {
      const y = centerY + Math.sin(now * 0.003 + index * 0.02) * height * 0.06;
      if (index === 0) {
        context.moveTo(index, y);
      } else {
        context.lineTo(index, y);
      }
    }
  }

  context.strokeStyle = rgba(palette.primaryRgb, 0.95);
  context.lineWidth = 4;
  context.stroke();

  context.beginPath();
  for (let x = 0; x <= width; x += 14) {
    const wave = Math.sin(now * 0.0023 + x * 0.022) * height * 0.04;
    const y = centerY + wave + Math.cos(now * 0.0015 + x * 0.012) * height * 0.02;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.strokeStyle = rgba(palette.secondaryRgb, 0.68);
  context.lineWidth = 2;
  context.stroke();

  context.shadowBlur = 0;
  if (profile.allowSoftFill) {
    drawGlow(width * 0.5, centerY, Math.min(width, height) * (0.08 + metrics.energy * 0.04), palette.accentRgb, 0.16 * profile.glowAlpha);
  }
  context.restore();
}

function drawPolygon(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const baseRadius = Math.min(width, height) * 0.15;
  const samples = resample(metrics.samples, clamp(Math.round(state.barCount * 0.34), 12, 42));

  context.save();
  context.translate(centerX, centerY);
  context.rotate(state.rotation * 0.65 + metrics.energy * 0.12);
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.secondaryRgb, 0.7 * profile.glowAlpha);

  context.beginPath();
  samples.forEach((sample, index) => {
    const angle = (index / samples.length) * TAU;
    const radius = baseRadius + sample * Math.min(width, height) * 0.16;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.closePath();

  context.fillStyle = rgba(palette.primaryRgb, 0.16 * profile.fillAlpha);
  context.strokeStyle = rgba(palette.secondaryRgb, 0.92);
  context.lineWidth = 3;
  if (profile.allowSoftFill) {
    context.fill();
  }
  context.stroke();

  context.beginPath();
  context.arc(0, 0, baseRadius * (0.38 + metrics.mid * 0.18), 0, TAU);
  context.fillStyle = rgba(palette.accentRgb, 0.82 * (profile.allowSoftFill ? 1 : 0.4));
  context.fill();

  context.shadowBlur = 0;
  context.strokeStyle = rgba(palette.accentRgb, 0.72);
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(0, 0, baseRadius + Math.sin(now * 0.002) * 8 + metrics.high * 18, 0, TAU);
  context.stroke();

  for (let orbit = 0; orbit < 4; orbit += 1) {
    const angle = now * 0.0012 + orbit * (TAU / 4);
    const orbitRadius = baseRadius * 1.25 + orbit * 22 + metrics.energy * 16;
    const x = Math.cos(angle) * orbitRadius;
    const y = Math.sin(angle) * orbitRadius;

    context.fillStyle = rgba(orbit % 2 === 0 ? palette.secondaryRgb : palette.primaryRgb, 0.9);
    context.beginPath();
    context.arc(x, y, 4 + metrics.energy * 4, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawMirrorBars(metrics) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.55;
  const samples = resample(metrics.samples, clamp(Math.round(state.barCount * 0.72), 24, 96));
  const sidePadding = Math.max(22, width * 0.05);
  const gap = samples.length > 84 ? 2 : 4;
  const barWidth = Math.max(3, (width - sidePadding * 2 - gap * (samples.length - 1)) / samples.length);
  const maxReach = Math.min(height * 0.28, centerY - 24);

  context.save();
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.secondaryRgb, 0.6 * profile.glowAlpha);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const reach = clamp(sample, 0.03, 1.2) * maxReach;
    const x = sidePadding + index * (barWidth + gap);
    const gradient = context.createLinearGradient(0, centerY - reach, 0, centerY + reach);
    gradient.addColorStop(0, palette.secondary);
    gradient.addColorStop(0.52, palette.accent);
    gradient.addColorStop(1, palette.primary);
    context.fillStyle = gradient;
    fillRoundedRect(context, x, centerY - reach, barWidth, reach * 2, Math.min(barWidth * 0.45, 7));
  }

  context.shadowBlur = 0;
  context.strokeStyle = rgba(palette.secondaryRgb, 0.34);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(sidePadding * 0.65, centerY);
  context.lineTo(width - sidePadding * 0.65, centerY);
  context.stroke();
  context.restore();
}

function drawSpiral(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const samples = resample(metrics.samples, 84);
  const maxRadius = Math.min(width, height) * 0.34;

  context.save();
  context.translate(centerX, centerY);
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.55 * profile.glowAlpha);

  for (let layer = 0; layer < 3; layer += 1) {
    context.beginPath();

    for (let index = 0; index < samples.length; index += 1) {
      const progress = index / (samples.length - 1);
      const angle = progress * TAU * (2.2 + layer * 0.45) + state.rotation * (1.1 + layer * 0.22);
      const wobble = Math.sin(now * 0.0015 + index * 0.2 + layer) * 6;
      const radius = 18 + progress * maxRadius + samples[index] * 48 + wobble;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.strokeStyle = rgba(layer % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb, 0.9 - layer * 0.18);
    context.lineWidth = 3.6 - layer * 0.8;
    context.stroke();
  }

  context.shadowBlur = 0;
  if (profile.allowSoftFill) {
    context.fillStyle = rgba(palette.accentRgb, 0.86 * profile.fillAlpha);
    context.beginPath();
    context.arc(0, 0, 10 + metrics.energy * 18, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawTunnel(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const ringCount = 9;
  const baseRadius = Math.min(width, height) * 0.09;
  const spacing = Math.min(width, height) * 0.045;

  context.save();
  context.lineWidth = 2;
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.secondaryRgb, 0.62 * profile.glowAlpha);

  for (let ring = 0; ring < ringCount; ring += 1) {
    const pulse = Math.sin(now * 0.0021 + ring * 0.48) * 5;
    const radius = baseRadius + ring * spacing + pulse + metrics.energy * 20;
    context.strokeStyle = rgba(ring % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb, 0.84 - ring * 0.07);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, TAU);
    context.stroke();
  }

  const spokeCount = 12;
  for (let spoke = 0; spoke < spokeCount; spoke += 1) {
    const angle = (spoke / spokeCount) * TAU + state.rotation * 0.45;
    const reach = Math.min(width, height) * (0.28 + metrics.high * 0.08);
    context.strokeStyle = rgba(palette.accentRgb, 0.34);
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(centerX + Math.cos(angle) * reach, centerY + Math.sin(angle) * reach);
    context.stroke();
  }

  context.shadowBlur = 0;
  if (profile.allowSoftFill) {
    drawGlow(centerX, centerY, Math.min(width, height) * (0.08 + metrics.bass * 0.04), palette.primaryRgb, 0.16 * profile.glowAlpha);
  }
  context.restore();
}

function drawParticleBurst(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const samples = resample(metrics.samples, 78);
  const innerRadius = Math.min(width, height) * 0.09;
  const outerRange = Math.min(width, height) * 0.28;

  context.save();
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.62 * profile.glowAlpha);

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const angle = (index / samples.length) * TAU + state.rotation * 1.3;
    const drift = Math.sin(now * 0.002 + index * 0.31) * 10;
    const outerRadius = innerRadius + outerRange * sample + drift;
    const x1 = centerX + Math.cos(angle) * innerRadius;
    const y1 = centerY + Math.sin(angle) * innerRadius;
    const x2 = centerX + Math.cos(angle) * outerRadius;
    const y2 = centerY + Math.sin(angle) * outerRadius;

    context.strokeStyle = rgba(index % 3 === 0 ? palette.secondaryRgb : palette.primaryRgb, 0.78);
    context.lineWidth = 1.2 + sample * 3.4;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    if (profile.allowSoftFill) {
      context.fillStyle = rgba(index % 2 === 0 ? palette.accentRgb : palette.secondaryRgb, 0.9 * profile.fillAlpha);
      context.beginPath();
      context.arc(x2, y2, 1.6 + sample * 5.6, 0, TAU);
      context.fill();
    }
  }

  context.shadowBlur = 0;
  if (profile.allowSoftFill) {
    context.fillStyle = rgba(palette.primaryRgb, 0.9 * profile.fillAlpha);
    context.beginPath();
    context.arc(centerX, centerY, 12 + metrics.energy * 16, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawPulseLattice(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const baseY = height * 0.56;
  const points = [];
  const samples = resample(metrics.samples, clamp(Math.round(state.barCount * 0.3), 12, 48));
  const waveTime = now * 0.0018;

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    const x = width * 0.08 + (index / (samples.length - 1)) * width * 0.84;
    const swing = Math.sin(waveTime + index * 0.48) * height * 0.045;
    const y = baseY + swing - sample * height * 0.22;
    points.push({ x, y, sample });
  }

  context.save();
  context.lineWidth = 1.4;
  context.shadowBlur = profile.shadowBlur * 0.6;
  context.shadowColor = rgba(palette.secondaryRgb, 0.48 * profile.glowAlpha);

  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index];
    const next = points[index + 1];
    context.strokeStyle = rgba(index % 2 === 0 ? palette.secondaryRgb : palette.primaryRgb, 0.72);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(next.x, next.y);
    context.stroke();

    if (index + 3 < points.length) {
      const jump = points[index + 3];
      context.strokeStyle = rgba(palette.accentRgb, 0.22);
      context.beginPath();
      context.moveTo(point.x, point.y);
      context.lineTo(jump.x, jump.y);
      context.stroke();
    }
  }

  context.shadowBlur = 0;
  points.forEach((point, index) => {
    context.fillStyle = rgba(index % 2 === 0 ? palette.primaryRgb : palette.secondaryRgb, 0.9);
    context.beginPath();
    context.arc(point.x, point.y, 3.2 + point.sample * 5.4, 0, TAU);
    context.fill();
  });

  context.restore();
}

function drawAuroraWave(metrics) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const baseline = height * 0.82;
  const top = height * 0.16;
  const maxHeight = baseline - top;
  const samples = metrics.samples;
  const count = samples.length;

  if (count < 2) {
    return;
  }

  const points = samples.map((sample, index) => ({
    x: (index / (count - 1)) * width,
    y: baseline - clamp(sample, 0.02, 1.25) * maxHeight
  }));

  const traceCurve = () => {
    context.moveTo(points[0].x, points[0].y);
    for (let index = 0; index < points.length - 1; index += 1) {
      const midX = (points[index].x + points[index + 1].x) / 2;
      const midY = (points[index].y + points[index + 1].y) / 2;
      context.quadraticCurveTo(points[index].x, points[index].y, midX, midY);
    }
    context.lineTo(points[count - 1].x, points[count - 1].y);
  };

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.6 * profile.glowAlpha);

  context.beginPath();
  context.moveTo(0, baseline);
  context.lineTo(points[0].x, points[0].y);
  for (let index = 0; index < points.length - 1; index += 1) {
    const midX = (points[index].x + points[index + 1].x) / 2;
    const midY = (points[index].y + points[index + 1].y) / 2;
    context.quadraticCurveTo(points[index].x, points[index].y, midX, midY);
  }
  context.lineTo(points[count - 1].x, points[count - 1].y);
  context.lineTo(width, baseline);
  context.closePath();

  const fillGradient = context.createLinearGradient(0, top, 0, baseline);
  fillGradient.addColorStop(0, rgba(palette.secondaryRgb, (profile.allowSoftFill ? 0.5 : 0.12) * profile.fillAlpha));
  fillGradient.addColorStop(1, rgba(palette.primaryRgb, 0.04 * profile.fillAlpha));
  context.fillStyle = fillGradient;
  context.fill();

  context.beginPath();
  traceCurve();
  context.strokeStyle = rgba(palette.primaryRgb, 0.95);
  context.lineWidth = 3;
  context.stroke();

  context.shadowBlur = 0;
  context.fillStyle = rgba(palette.accentRgb, 0.9);
  for (let index = 0; index < points.length; index += Math.max(1, Math.round(count / 26))) {
    context.beginPath();
    context.arc(points[index].x, points[index].y, 2.4, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawPulseGrid(metrics) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const cols = clamp(Math.round(state.barCount * 0.5), 16, 72);
  const rows = 14;
  const samples = resample(metrics.samples, cols);
  const padX = Math.max(20, width * 0.05);
  const padY = height * 0.16;
  const cellWidth = (width - padX * 2) / cols;
  const cellHeight = (height - padY * 2) / rows;
  const dotRadius = Math.min(cellWidth, cellHeight) * 0.32;

  context.save();
  context.shadowBlur = profile.shadowBlur * 0.5;
  context.shadowColor = rgba(palette.primaryRgb, 0.5 * profile.glowAlpha);

  for (let col = 0; col < cols; col += 1) {
    const level = clamp(samples[col], 0, 1.2);
    const litRows = Math.round(level * rows);

    for (let row = 0; row < rows; row += 1) {
      const fromBottom = rows - 1 - row;
      const centerX = padX + col * cellWidth + cellWidth / 2;
      const centerY = padY + row * cellHeight + cellHeight / 2;
      const lit = fromBottom < litRows;

      if (!lit) {
        context.fillStyle = rgba(palette.secondaryRgb, 0.06);
      } else {
        const ratio = fromBottom / rows;
        const color = ratio > 0.72 ? palette.accentRgb : ratio > 0.4 ? palette.primaryRgb : palette.secondaryRgb;
        context.fillStyle = rgba(color, 0.92);
      }

      context.beginPath();
      context.arc(centerX, centerY, dotRadius, 0, TAU);
      context.fill();
    }
  }

  context.restore();
}

function drawLiquidBloom(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const baseRadius = Math.min(width, height) * (0.16 + metrics.energy * 0.05);
  const samples = resample(metrics.samples, clamp(Math.round(state.barCount), 24, 160));
  const count = samples.length;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(state.rotation * 0.4);
  context.lineJoin = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.6 * profile.glowAlpha);

  const points = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    const wobble = Math.sin(now * 0.0014 + index * 0.5) * 6;
    const radius = baseRadius + samples[index] * Math.min(width, height) * 0.16 + wobble;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  context.beginPath();
  context.moveTo((points[0].x + points[count - 1].x) / 2, (points[0].y + points[count - 1].y) / 2);
  for (let index = 0; index < count; index += 1) {
    const next = points[(index + 1) % count];
    const midX = (points[index].x + next.x) / 2;
    const midY = (points[index].y + next.y) / 2;
    context.quadraticCurveTo(points[index].x, points[index].y, midX, midY);
  }
  context.closePath();

  const bloomGradient = context.createRadialGradient(0, 0, baseRadius * 0.2, 0, 0, baseRadius * 1.7);
  bloomGradient.addColorStop(0, rgba(palette.secondaryRgb, (profile.allowSoftFill ? 0.85 : 0.14) * profile.fillAlpha));
  bloomGradient.addColorStop(0.6, rgba(palette.primaryRgb, 0.4 * profile.fillAlpha));
  bloomGradient.addColorStop(1, rgba(palette.primaryRgb, 0.05 * profile.fillAlpha));
  context.fillStyle = bloomGradient;
  context.fill();

  context.strokeStyle = rgba(palette.accentRgb, 0.9);
  context.lineWidth = 2.5;
  context.stroke();

  context.shadowBlur = 0;
  if (profile.allowSoftFill) {
    context.fillStyle = rgba(palette.accentRgb, 0.85 * profile.fillAlpha);
    context.beginPath();
    context.arc(0, 0, 8 + metrics.energy * 14, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawDotStream(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.5;
  const restGap = Math.min(height * 0.07, 70);
  const amplitude = height * 0.2;
  const sidePadding = Math.max(20, width * 0.035);
  const dotCount = clamp(Math.round(state.barCount * 0.42), 26, 60);
  const samples = resample(metrics.samples, dotCount);
  const usableWidth = width - sidePadding * 2;
  const spacing = usableWidth / Math.max(1, dotCount - 1);
  const dotRadius = clamp(spacing * 0.22, 3, 7);

  context.save();
  context.shadowBlur = profile.shadowBlur * 0.55;
  context.shadowColor = rgba(palette.primaryRgb, 0.5 * profile.glowAlpha);

  for (let index = 0; index < dotCount; index += 1) {
    const sample = clamp(samples[index], 0.02, 1.2);
    const x = sidePadding + (index / Math.max(1, dotCount - 1)) * (width - sidePadding * 2);
    const flow = Math.sin(now * 0.0016 + index * 0.32) * height * 0.018;
    const lift = sample * amplitude;

    const topY = centerY - restGap - lift + flow;
    const bottomY = centerY + restGap + lift - flow;

    context.fillStyle = rgba(palette.accentRgb, 0.96);
    context.beginPath();
    context.arc(x, topY, dotRadius, 0, TAU);
    context.fill();

    context.fillStyle = rgba(palette.secondaryRgb, 0.96);
    context.beginPath();
    context.arc(x, bottomY, dotRadius, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawCenterBadge(metrics) {
  const palette = getActivePalette();
  const renderSettings = getRenderSettings();
  const width = state.width;
  const height = state.height;
  const modeLabel =
    renderSettings.exportBackground === "normal"
      ? BACKDROP_LABELS[state.backdrop]
      : EXPORT_BACKGROUND_LABELS[renderSettings.exportBackground];
  const boxWidth = Math.min(270, width * 0.44);
  const boxHeight = 82;
  const x = width * 0.5 - boxWidth * 0.5;
  const y = height - boxHeight - 18;

  context.save();
  context.fillStyle = "rgba(6, 18, 28, 0.54)";
  context.strokeStyle = rgba(palette.secondaryRgb, 0.2);
  context.lineWidth = 1;
  fillRoundedRect(context, x, y, boxWidth, boxHeight, 18);
  context.stroke();

  context.fillStyle = "#f7f1e8";
  context.font = "700 18px Constantia, Georgia, serif";
  context.fillText(STYLE_LABELS[state.style], x + 18, y + 30);

  context.fillStyle = rgba(CREAM_RGB, 0.74);
  context.font = "13px Bahnschrift, Trebuchet MS, sans-serif";
  context.fillText(modeLabel, x + 18, y + 52);
  context.fillText(`${Math.round(metrics.energy * 100)} enerji`, x + boxWidth - 98, y + 52);
  context.restore();
}

function updateRuntimeUi(metrics) {
  dom.energyValue.textContent = formatPercent(metrics.energy);
  dom.bassValue.textContent = formatPercent(metrics.bass);
  dom.midValue.textContent = formatPercent(metrics.mid);
  dom.highValue.textContent = formatPercent(metrics.high);
  dom.peakValue.textContent = metrics.peakFrequency ? `${metrics.peakFrequency} Hz` : "--";
  if (dom.bpmValue) {
    dom.bpmValue.textContent = bpmTracker.value > 0 ? String(bpmTracker.value) : "--";
  }
  dom.timeValue.textContent = `${formatTime(dom.audioPlayer.currentTime)} / ${formatTime(dom.audioPlayer.duration)}`;
  updateProgressBar();
}

function updateProgressBar() {
  drawWaveformTrack();
}

function updateTrackMeta() {
  const durationText = formatTime(dom.audioPlayer.duration);
  dom.trackMeta.textContent = `${state.fileSizeLabel} - ${durationText}`;
}

function syncSelectionBadges() {
  dom.styleBadge.textContent = STYLE_LABELS[state.style];
  dom.paletteBadge.textContent = state.palette === "custom" ? "Ozel Palet" : (PALETTES[state.palette]?.label || state.palette);
  dom.backdropBadge.textContent = BACKDROP_LABELS[state.backdrop];
}

function syncOutputMode() {
  dom.stageShell.dataset.exportMode = getRenderSettings().exportBackground;
}

function syncBackdropUploadVisibility() {
  if (!dom.backdropUploadRow) {
    return;
  }

  dom.backdropUploadRow.hidden = state.backdrop !== "custom";
}

function loadBackdropImage(file) {
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    setStatus("error", "Desteklenmeyen gorsel tipi. PNG, JPG veya WEBP dene.");
    return;
  }

  if (state.customBackdropUrl) {
    URL.revokeObjectURL(state.customBackdropUrl);
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  state.customBackdropUrl = objectUrl;
  state.customBackdropReady = false;

  image.onload = () => {
    state.customBackdropImage = image;
    state.customBackdropReady = true;

    if (dom.backdropImageName) {
      dom.backdropImageName.textContent = file.name;
    }

    if (dom.backdropImageClear) {
      dom.backdropImageClear.hidden = false;
    }

    if (state.backdrop !== "custom") {
      state.backdrop = "custom";
      dom.backdropSelect.value = "custom";
      syncSelectionBadges();
      syncBackdropUploadVisibility();
    }
  };

  image.onerror = () => {
    setStatus("error", "Gorsel yuklenemedi. Baska bir dosya dene.");
    clearBackdropImage();
  };

  image.src = objectUrl;
}

function clearBackdropImage() {
  if (state.customBackdropUrl) {
    URL.revokeObjectURL(state.customBackdropUrl);
  }

  state.customBackdropImage = null;
  state.customBackdropUrl = null;
  state.customBackdropReady = false;

  if (dom.backdropImageUpload) {
    dom.backdropImageUpload.value = "";
  }

  if (dom.backdropImageName) {
    dom.backdropImageName.textContent = "Gorsel sec veya birak";
  }

  if (dom.backdropImageClear) {
    dom.backdropImageClear.hidden = true;
  }
}

function drawImageCover(image, width, height, zoom = 1, driftX = 0, driftY = 0) {
  const imageWidth = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;

  if (!imageWidth || !imageHeight) {
    return;
  }

  const scale = Math.max(width / imageWidth, height / imageHeight) * Math.max(1, zoom);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  // Parallax kaymasini fazla alanla sinirla ki kenarlarda bosluk olusmasin
  const marginX = (drawWidth - width) / 2;
  const marginY = (drawHeight - height) / 2;
  const offsetX = clamp(driftX, -marginX, marginX);
  const offsetY = clamp(driftY, -marginY, marginY);

  const drawX = (width - drawWidth) / 2 + offsetX;
  const drawY = (height - drawHeight) / 2 + offsetY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function syncRangeLabels() {
  dom.barCountValue.textContent = `${state.barCount} bant`;
  dom.sensitivityValue.textContent = `${state.sensitivity.toFixed(2)}x`;
  dom.smoothingValue.textContent = state.smoothing.toFixed(2);
  dom.glowValue.textContent = `${state.glow} px`;
  dom.backdropDimValue.textContent = `${Math.round(state.backdropDim * 100)}%`;
  dom.visualScaleValue.textContent = `${state.visualScale.toFixed(2)}x`;
  dom.visualOffsetXValue.textContent = formatSignedPercent(state.visualOffsetX);
  dom.visualOffsetYValue.textContent = formatSignedPercent(state.visualOffsetY);
}

function formatSignedPercent(value) {
  const percent = Math.round(value * 100);
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

function setRangeValue(input, value) {
  if (!input) {
    return;
  }

  input.value = String(value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function bindStepperButtons() {
  document.querySelectorAll("[data-step-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.querySelector(`#${button.dataset.stepTarget}`);

      if (!input) {
        return;
      }

      const step = Number(input.step) || 1;
      const direction = Number(button.dataset.stepDir) || 1;
      const min = Number(input.min);
      const max = Number(input.max);
      const next = clamp(Number(input.value) + direction * step, min, max);
      setRangeValue(input, Number(next.toFixed(4)));
    });
  });
}

function createTransparentExportSurfaces() {
  const colorCanvas = document.createElement("canvas");
  const matteCanvas = document.createElement("canvas");

  return {
    colorCanvas,
    colorContext: colorCanvas.getContext("2d"),
    matteCanvas,
    matteContext: matteCanvas.getContext("2d")
  };
}

function syncTransparentExportSurfaces() {
  const surfaces = state.transparentExportSurfaces;

  if (!surfaces) {
    return;
  }

  const renderWidth = dom.canvas.width;
  const renderHeight = dom.canvas.height;
  const { colorCanvas, colorContext, matteCanvas, matteContext } = surfaces;

  if (colorCanvas.width !== renderWidth || colorCanvas.height !== renderHeight) {
    colorCanvas.width = renderWidth;
    colorCanvas.height = renderHeight;
  }

  if (matteCanvas.width !== renderWidth || matteCanvas.height !== renderHeight) {
    matteCanvas.width = renderWidth;
    matteCanvas.height = renderHeight;
  }

  colorContext.setTransform(1, 0, 0, 1, 0, 0);
  colorContext.globalCompositeOperation = "source-over";
  colorContext.clearRect(0, 0, renderWidth, renderHeight);
  colorContext.fillStyle = "#000000";
  colorContext.fillRect(0, 0, renderWidth, renderHeight);
  colorContext.drawImage(dom.canvas, 0, 0, renderWidth, renderHeight);

  matteContext.setTransform(1, 0, 0, 1, 0, 0);
  matteContext.globalCompositeOperation = "copy";
  matteContext.drawImage(dom.canvas, 0, 0, renderWidth, renderHeight);
  matteContext.globalCompositeOperation = "source-in";
  matteContext.fillStyle = "#ffffff";
  matteContext.fillRect(0, 0, renderWidth, renderHeight);
  matteContext.globalCompositeOperation = "destination-over";
  matteContext.fillStyle = "#000000";
  matteContext.fillRect(0, 0, renderWidth, renderHeight);
  matteContext.globalCompositeOperation = "source-over";
}

function createRecorderBlobPromise(recorder, chunkStore) {
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunkStore.push(event.data);
    }
  });

  return new Promise((resolve, reject) => {
    recorder.addEventListener(
      "stop",
      () => {
        resolve(
          new Blob(chunkStore, {
            type: recorder.mimeType || "video/webm"
          })
        );
      },
      { once: true }
    );

    recorder.addEventListener(
      "error",
      () => {
        reject(recorder.error || new Error("Kayit alinirken hata olustu."));
      },
      { once: true }
    );
  });
}

function captureRecordingProfile() {
  return {
    exportBackground: state.exportBackground,
    exportResolution: state.exportResolution,
    exportFps: state.exportFps,
    overlayClean: state.overlayClean,
    showCanvasLabel: state.showCanvasLabel
  };
}

function getRenderSettings() {
  return state.recordingProfile || captureRecordingProfile();
}

function notifyDeferredExportChange(label) {
  if (!state.recordingProfile) {
    return;
  }

  setStatus("recording", `${label} bu kayit icin kilitli. Yeni secim sonraki kayitta uygulanacak.`);
}

function releaseRecordingUrl() {
  if (!state.recordingUrl) {
    return;
  }

  URL.revokeObjectURL(state.recordingUrl);
  state.recordingUrl = null;
}

function buildRecordingBaseName(recordingProfile = captureRecordingProfile()) {
  return `${slugify(state.fileStem)}-${slugify(state.style)}-${slugify(recordingProfile.exportBackground)}`;
}

function resolveDownloadLabel(fileName, warningCode = "") {
  if (warningCode) return "Ham kaydi indir";
  if (/\.mov$/i.test(fileName)) return "MOV videoyu indir";
  if (/\.mp4$/i.test(fileName)) return "MP4 videoyu indir";
  return "Kaydi indir";
}

function setDownloadFile(blob, fileName, warningCode = "") {
  releaseRecordingUrl();
  state.recordingUrl = URL.createObjectURL(blob);
  dom.downloadLink.href = state.recordingUrl;
  dom.downloadLink.download = fileName;
  dom.downloadLink.textContent = resolveDownloadLabel(fileName, warningCode);
  dom.downloadLink.hidden = false;
}

function buildRecordingWarningMessage(code, detail) {
  const extra = detail ? ` (${detail.substring(0, 120)})` : "";
  if (code === "FFMPEG_MISSING") return `FFmpeg bulunamadi — ffmpeg yukle, sunucuyu yeniden baslat.${extra}`;
  if (code === "ALPHA_UNAVAILABLE") return `Alpha kanali uretilemedi. Chrome kullan.${extra}`;
  if (code === "TRANSCODE_ROUTE_MISSING") return `Sunucuya ulasilamadi — internet baglantini kontrol edip sayfayi yenile.${extra}`;
  return `MOV donusumu basarisiz — sunucu gecici olarak yanit vermedi. Ham WebM indirildi, tekrar dene.${extra}`;
}

function buildRecordingReadyMessage(fileName) {
  if (/\.mov$/i.test(fileName)) {
    return "Kayit tamamlandi. Alpha korunan MOV cikti hazir; editorune direkt atabilirsin.";
  }

  if (/\.mp4$/i.test(fileName)) {
    return "Kayit tamamlandi. Daha temiz gorunumlu MP4 cikti hazir.";
  }

  return "Kayit tamamlandi. Video dosyasi indirilmeye hazir.";
}


async function finalizeRecordingBlob(rawBlob, recordingProfile = captureRecordingProfile(), matteBlob = null) {
  const fallbackName = `${buildRecordingBaseName(recordingProfile)}.webm`;
  try {
    return await requestTranscodedRecording(rawBlob, recordingProfile, matteBlob);
  } catch (error) {
    console.error("[Visualizer] MOV transcode hatasi:", error);
    const detail = (error?.message || "").substring(0, 300);
    return {
      blob: rawBlob,
      downloadName: fallbackName,
      warningCode: error?.code || "TRANSCODE_FAILED",
      warningDetail: detail
    };
  }
}

async function requestTranscodedRecording(
  rawBlob,
  recordingProfile = captureRecordingProfile(),
  matteBlob = null
) {
  const searchParams = new URLSearchParams({
    basename: buildRecordingBaseName(recordingProfile),
    mode:
      recordingProfile.exportBackground === "transparent" && matteBlob
        ? "transparent-dual"
        : recordingProfile.exportBackground === "transparent"
          ? "transparent"
          : "standard"
  });
  const requestBody = matteBlob
    ? await buildDualPassPayload(rawBlob, matteBlob)
    : rawBlob;
  const response = await fetch(`/api/transcode?${searchParams.toString()}`, {
    method: "POST",
    headers: {
      "Content-Type": matteBlob ? "application/octet-stream" : rawBlob.type || "video/webm"
    },
    body: requestBody
  });

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    const exportError = new Error(payload?.error || "Video islenemedi.");
    exportError.code = payload?.code || (response.status === 404 ? "TRANSCODE_ROUTE_MISSING" : "TRANSCODE_FAILED");
    throw exportError;
  }

  const blob = await response.blob();
  return {
    blob,
    downloadName:
      response.headers.get("X-Download-Name") ||
      `${buildRecordingBaseName(recordingProfile)}${
        recordingProfile.exportBackground === "transparent" ? ".mov" : ".mp4"
      }`
  };
}

async function buildDualPassPayload(colorBlob, matteBlob) {
  const [colorBuffer, matteBuffer] = await Promise.all([colorBlob.arrayBuffer(), matteBlob.arrayBuffer()]);
  const payload = new Uint8Array(8 + colorBuffer.byteLength + matteBuffer.byteLength);
  const view = new DataView(payload.buffer);
  view.setUint32(0, colorBuffer.byteLength);
  view.setUint32(4, matteBuffer.byteLength);
  payload.set(new Uint8Array(colorBuffer), 8);
  payload.set(new Uint8Array(matteBuffer), 8 + colorBuffer.byteLength);
  return payload;
}

function setStatus(mode, message) {
  dom.statusBanner.dataset.state = mode;
  dom.statusBanner.textContent = message;
}

async function checkServerAvailability() {
  try {
    const res = await fetch("/api/debug", { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("not ok");
  } catch {
    setStatus("error",
      "Sunucuya ulasilamiyor. Internet baglantini kontrol edip sayfayi yenile. " +
      "Sunucu olmadan MOV/MP4 cikti alinamaz (gorsellestirme calismaya devam eder)."
    );
  }
}

function fillExportBackground() {
  const renderSettings = getRenderSettings();
  const exportColors = {
    blend: "#000000",
    green: "#00d25b",
    blue: "#2d74ff",
    matte: "#000000"
  };

  context.fillStyle = exportColors[renderSettings.exportBackground] || "#000000";
  context.fillRect(0, 0, state.width, state.height);
}

function getActivePalette() {
  const renderSettings = getRenderSettings();

  // Green/Blue screen: arka plani fillExportBackground anahtar renkle doldurur;
  // gorselin rengi kullanicinin ayarladigi palet olarak korunur.
  if (renderSettings.exportBackground === "matte") {
    return SPECIAL_PALETTES.matte;
  }

  if (renderSettings.exportBackground === "blend") {
    const basePalette = state.palette === "custom" ? buildCustomPalette() : PALETTES_COMPUTED[state.palette];
    return {
      ...basePalette,
      accent: "#ffffff",
      accentRgb: [255, 255, 255]
    };
  }

  if (state.palette === "custom") {
    return buildCustomPalette();
  }

  return PALETTES_COMPUTED[state.palette];
}

function getRenderProfile() {
  const renderSettings = getRenderSettings();

  if (renderSettings.exportBackground === "matte") {
    return {
      clean: true,
      shadowBlur: 0,
      fillAlpha: 1,
      glowAlpha: 0,
      reflectionAlpha: 0,
      allowSoftFill: true,
      matte: true,
      chroma: false,
      blend: false
    };
  }

  if (renderSettings.exportBackground === "green" || renderSettings.exportBackground === "blue") {
    return {
      clean: true,
      shadowBlur: 0,
      fillAlpha: 0.04,
      glowAlpha: 0,
      reflectionAlpha: 0,
      allowSoftFill: false,
      matte: false,
      chroma: true,
      blend: false
    };
  }

  if (renderSettings.exportBackground === "blend") {
    return {
      clean: true,
      shadowBlur: Math.max(0, state.glow * 0.12),
      fillAlpha: 0.08,
      glowAlpha: 0.12,
      reflectionAlpha: 0,
      allowSoftFill: false,
      matte: false,
      chroma: false,
      blend: true
    };
  }

  return {
    clean: renderSettings.overlayClean,
    shadowBlur: renderSettings.overlayClean ? state.glow * 0.18 : state.glow,
    fillAlpha: renderSettings.overlayClean ? 0.18 : 1,
    glowAlpha: renderSettings.overlayClean ? 0.24 : 1,
    reflectionAlpha: renderSettings.overlayClean ? 0 : 1,
    allowSoftFill: !renderSettings.overlayClean,
    matte: renderSettings.exportBackground === "matte",
    chroma: renderSettings.exportBackground === "green" || renderSettings.exportBackground === "blue"
  };
}

function resizeCanvasToDisplaySize() {
  const nextWidth = dom.canvas.clientWidth;
  const nextHeight = dom.canvas.clientHeight;
  const renderSize = resolveRenderSize(nextWidth, nextHeight);
  const displayWidth = renderSize.width;
  const displayHeight = renderSize.height;

  if (dom.canvas.width !== displayWidth || dom.canvas.height !== displayHeight) {
    dom.canvas.width = displayWidth;
    dom.canvas.height = displayHeight;
  }

  state.width = nextWidth;
  state.height = nextHeight;
  context.setTransform(displayWidth / Math.max(nextWidth, 1), 0, 0, displayHeight / Math.max(nextHeight, 1), 0, 0);
}

function resolveRenderSize(width, height) {
  const renderSettings = getRenderSettings();

  if (renderSettings.exportResolution === "preview") {
    const ratio = window.devicePixelRatio || 1;
    return {
      width: Math.max(2, Math.round(width * ratio)),
      height: Math.max(2, Math.round(height * ratio))
    };
  }

  const targetHeight = Number(renderSettings.exportResolution) || 1080;
  const aspectRatio = width / Math.max(height, 1);
  const targetWidth = roundToEven(targetHeight * aspectRatio);

  return {
    width: Math.max(2, targetWidth),
    height: Math.max(2, roundToEven(targetHeight))
  };
}

function getRecorderOptions(mimeType, includeAudio = true) {
  const pixelCount = dom.canvas.width * dom.canvas.height;
  const videoBitsPerSecond = Math.round(clamp(pixelCount * 7, 12_000_000, 60_000_000));
  const options = {
    videoBitsPerSecond
  };

  if (includeAudio) {
    options.audioBitsPerSecond = 320_000;
  }

  if (mimeType) {
    options.mimeType = mimeType;
  }

  return options;
}

function roundToEven(value) {
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function sampleFrequencyBins(sampleCount) {
  const samples = [];
  const hardCap = Math.floor(state.frequencyData.length * 0.73); // ~16kHz mutlak tavan

  // Gercek icerik nerede bitiyor? Yukari'dan tara, anlamli bin'i bul.
  const minCap = Math.floor(state.frequencyData.length * 0.18); // ~4kHz minimum
  let activeCap = minCap;
  for (let i = hardCap - 1; i >= minCap; i--) {
    if (state.frequencyData[i] > 3) {
      activeCap = Math.min(i + 30, hardCap);
      break;
    }
  }

  // Yumusatma: ~1.5 saniyede adapte olur, ani gecis olmaz
  if (!state._smoothActiveCap) state._smoothActiveCap = hardCap;
  state._smoothActiveCap += (activeCap - state._smoothActiveCap) * 0.016;
  const length = Math.max(Math.floor(state._smoothActiveCap), minCap);

  for (let index = 0; index < sampleCount; index += 1) {
    const start = Math.floor(Math.pow(index / sampleCount, 1.5) * length);
    const end = Math.max(start + 1, Math.floor(Math.pow((index + 1) / sampleCount, 1.5) * length));
    let total = 0;

    for (let cursor = start; cursor < end; cursor += 1) {
      total += state.frequencyData[cursor];
    }

    const average = total / Math.max(1, end - start);
    const trebleBoost = 1 + (index / sampleCount) * 1.5;
    samples.push(clamp(Math.pow(average / 255, 1.15) * state.sensitivity * trebleBoost, 0, 1.3));
  }

  return samples;
}

function computeBandAverages() {
  // sampleFrequencyBins'in hesapladigi dinamik siniri kullan
  const length = state._smoothActiveCap
    ? Math.max(Math.floor(state._smoothActiveCap), Math.floor(state.frequencyData.length * 0.18))
    : Math.floor(state.frequencyData.length * 0.73);
  return {
    low:  averageSlice(state.frequencyData, 0,                         Math.floor(length * 0.1)),
    mid:  averageSlice(state.frequencyData, Math.floor(length * 0.1),  Math.floor(length * 0.42)),
    high: averageSlice(state.frequencyData, Math.floor(length * 0.42), length)
  };
}

function resolvePeakFrequency() {
  if (!state.audioContext || !state.frequencyData) {
    return 0;
  }

  let peakValue = -1;
  let peakIndex = 0;

  for (let index = 0; index < state.frequencyData.length; index += 1) {
    if (state.frequencyData[index] > peakValue) {
      peakValue = state.frequencyData[index];
      peakIndex = index;
    }
  }

  return Math.round((peakIndex * state.audioContext.sampleRate) / state.analyser.fftSize);
}

function averageSlice(data, start, end) {
  let total = 0;
  let count = 0;

  for (let index = start; index < end; index += 1) {
    total += data[index];
    count += 1;
  }

  return count ? total / count / 255 : 0;
}

function resample(values, nextLength) {
  if (values.length === nextLength) {
    return values;
  }

  return Array.from({ length: nextLength }, (_, index) => {
    const cursor = (index / Math.max(1, nextLength - 1)) * Math.max(1, values.length - 1);
    const lower = Math.floor(cursor);
    const upper = Math.min(values.length - 1, Math.ceil(cursor));
    const blend = cursor - lower;
    return lerp(values[lower] || 0, values[upper] || 0, blend);
  });
}

function drawGlow(x, y, radius, rgb, alpha) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(rgb, alpha));
  gradient.addColorStop(1, rgba(rgb, 0));
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function fillRoundedRect(target, x, y, width, height, radius) {
  if (typeof target.roundRect === "function") {
    target.beginPath();
    target.roundRect(x, y, width, height, radius);
    target.fill();
    return;
  }

  const safeRadius = Math.min(radius, width / 2, height / 2);
  target.beginPath();
  target.moveTo(x + safeRadius, y);
  target.lineTo(x + width - safeRadius, y);
  target.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  target.lineTo(x + width, y + height - safeRadius);
  target.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  target.lineTo(x + safeRadius, y + height);
  target.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  target.lineTo(x, y + safeRadius);
  target.quadraticCurveTo(x, y, x + safeRadius, y);
  target.closePath();
  target.fill();
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: Math.random() * 2.2 + 0.4,
    speed: Math.random() * 1.8 + 0.5,
    offset: Math.random() * TAU
  }));
}

function pickRecordingMimeType(preferTransparent = false) {
  const candidates = preferTransparent
    ? ["video/webm;codecs=vp9,opus"]
    : ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

function pickVideoOnlyMimeType() {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
}

function isSupportedAudio(file) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
}

function formatPercent(value) {
  return `${Math.round(clamp(value, 0, 1.25) * 100)}%`;
}

function formatFileSize(size) {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let current = size;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  return `${current.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

// ── Döngü ────────────────────────────────────────────────────────────────────
function toggleLoop() {
  state.loop = !state.loop;
  if (dom.loopToggle) {
    dom.loopToggle.textContent = state.loop ? "Dongü: Acik" : "Dongü";
    dom.loopToggle.style.borderColor = state.loop ? "rgba(131,227,196,0.4)" : "";
    dom.loopToggle.style.background = state.loop ? "rgba(131,227,196,0.12)" : "";
  }
}

// ── Snapshot ─────────────────────────────────────────────────────────────────
function takeSnapshot() {
  if (!requirePremium()) return;
  dom.canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(state.fileStem || "snapshot")}-${slugify(state.style)}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}

// ── Mikrofon ─────────────────────────────────────────────────────────────────
async function toggleMic() {
  if (!state.micActive && !requirePremium()) return;
  if (state.micActive) {
    deactivateMic();
  } else {
    await activateMic();
  }
}

async function activateMic() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("error", "Bu tarayici mikrofon erisimini desteklemiyor.");
    return;
  }

  try {
    await ensureAudioReady();
    state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    state.micSourceNode = state.audioContext.createMediaStreamSource(state.micStream);

    if (state.sourceNode) {
      state.sourceNode.disconnect(state.analyser);
    }

    state.micSourceNode.connect(state.analyser);
    state.micActive = true;

    if (dom.micToggle) {
      dom.micToggle.textContent = "Mikrofonu Kapat";
      dom.micToggle.style.borderColor = "rgba(131,227,196,0.4)";
      dom.micToggle.style.background = "rgba(131,227,196,0.12)";
    }

    dom.emptyState.hidden = true;
    setStatus("playing", "Mikrofon aktif. Cevrenizdeki ses analiz ediliyor.");
  } catch {
    setStatus("error", "Mikrofon erisimi reddedildi veya kullanilabilir degil.");
  }
}

function deactivateMic() {
  if (state.micSourceNode) {
    state.micSourceNode.disconnect();
    state.micSourceNode = null;
  }

  if (state.micStream) {
    state.micStream.getTracks().forEach((t) => t.stop());
    state.micStream = null;
  }

  if (state.sourceNode) {
    try {
      state.sourceNode.connect(state.analyser);
    } catch {}
  }

  state.micActive = false;

  if (dom.micToggle) {
    dom.micToggle.textContent = "Mikrofon Baslat";
    dom.micToggle.style.borderColor = "";
    dom.micToggle.style.background = "";
  }

  setStatus("ready", "Mikrofon kapatildi.");
}

// ── BPM Tespiti ──────────────────────────────────────────────────────────────
function updateBpm(bassEnergy, now) {
  const threshold = 0.35;
  const isHigh = bassEnergy > threshold;

  if (isHigh && !bpmTracker.lastHigh) {
    bpmTracker.times.push(now);
    bpmTracker.lastBeat = now;

    if (bpmTracker.times.length > 8) {
      bpmTracker.times.shift();
    }

    if (bpmTracker.times.length >= 2) {
      let total = 0;
      for (let i = 1; i < bpmTracker.times.length; i++) {
        total += bpmTracker.times[i] - bpmTracker.times[i - 1];
      }
      const avg = total / (bpmTracker.times.length - 1);
      bpmTracker.value = Math.round(60000 / avg);
    }
  }

  bpmTracker.lastHigh = isHigh;

  if (bpmTracker.lastBeat > 0 && now - bpmTracker.lastBeat > 3000) {
    bpmTracker.value = 0;
    bpmTracker.times = [];
    bpmTracker.lastBeat = 0;
  }
}

// ── Özel Palet ───────────────────────────────────────────────────────────────
function buildCustomPalette() {
  if (!_customPaletteCache) {
    _customPaletteCache = withRgb({
      label: "Ozel Palet",
      bg1: "#07111a",
      bg2: "#143549",
      primary: state.customPalette.primary,
      secondary: state.customPalette.secondary,
      accent: state.customPalette.accent
    });
  }
  return _customPaletteCache;
}

function syncCustomPaletteVisibility() {
  if (dom.customPaletteRow) {
    dom.customPaletteRow.hidden = state.palette !== "custom";
  }
}

// ── Presetler ────────────────────────────────────────────────────────────────
// Preset'ler artik sunucuda, kullaniciya ozel saklanir. presetCache bellekteki kopyadir;
// oturum acilinca /api/presets'ten yuklenir, misafirde bostur.
let presetCache = {};

async function reloadPresetsFromServer() {
  if (!window.MosAuth || !window.MosAuth.isAuthed()) {
    presetCache = {};
    renderPresetList();
    return;
  }
  try {
    const res = await fetch("/api/presets", { credentials: "same-origin" });
    const data = await res.json();
    presetCache = data.presets || {};
  } catch {
    presetCache = {};
  }
  renderPresetList();
}

function capturePresetData() {
  return {
    style: state.style,
    palette: state.palette,
    backdrop: state.backdrop,
    barCount: state.barCount,
    sensitivity: state.sensitivity,
    smoothing: state.smoothing,
    glow: state.glow,
    visualScale: state.visualScale,
    visualOffsetX: state.visualOffsetX,
    visualOffsetY: state.visualOffsetY,
    exportBackground: state.exportBackground,
    exportResolution: state.exportResolution,
    exportFps: state.exportFps,
    overlayClean: state.overlayClean,
    showCanvasLabel: state.showCanvasLabel,
    customPalette: { ...state.customPalette }
  };
}

async function savePreset(name) {
  if (!requirePremium()) return;
  const trimmed = name.trim();
  if (!trimmed) return;

  const data = capturePresetData();
  presetCache[trimmed] = data; // iyimser guncelleme
  renderPresetList();
  try {
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ name: trimmed, data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus("error", err.error || "Preset kaydedilemedi.");
    } else {
      setStatus("idle", `"${trimmed}" preset'i kaydedildi.`);
    }
  } catch {
    setStatus("error", "Preset kaydedilemedi — baglantiyi kontrol et.");
  }
  reloadPresetsFromServer();
}

async function deletePreset(name) {
  if (!requirePremium()) return;
  delete presetCache[name];
  renderPresetList();
  try {
    await fetch(`/api/presets/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
  } catch {}
  reloadPresetsFromServer();
}

function applyPreset(data) {
  setRangeValue(dom.barCount, data.barCount);
  setRangeValue(dom.sensitivity, data.sensitivity);
  setRangeValue(dom.smoothing, data.smoothing);
  setRangeValue(dom.glow, data.glow);
  setRangeValue(dom.visualScale, data.visualScale);
  setRangeValue(dom.visualOffsetX, data.visualOffsetX);
  setRangeValue(dom.visualOffsetY, data.visualOffsetY);

  dom.styleSelect.value = data.style;
  state.style = data.style;

  dom.paletteSelect.value = data.palette;
  state.palette = data.palette;

  dom.backdropSelect.value = data.backdrop;
  state.backdrop = data.backdrop;

  dom.exportBgSelect.value = data.exportBackground;
  state.exportBackground = data.exportBackground;

  dom.exportResolutionSelect.value = data.exportResolution;
  state.exportResolution = data.exportResolution;

  const presetFps = Number(data.exportFps) || 30;
  dom.exportFpsSelect.value = String(presetFps);
  state.exportFps = presetFps;

  dom.overlayCleanToggle.checked = data.overlayClean;
  state.overlayClean = data.overlayClean;

  dom.canvasLabelToggle.checked = data.showCanvasLabel;
  state.showCanvasLabel = data.showCanvasLabel;

  if (data.customPalette) {
    state.customPalette = { ...data.customPalette };
    if (dom.customPrimary) dom.customPrimary.value = data.customPalette.primary;
    if (dom.customSecondary) dom.customSecondary.value = data.customPalette.secondary;
    if (dom.customAccent) dom.customAccent.value = data.customPalette.accent;
    _customPaletteCache = null;
  }

  syncSelectionBadges();
  syncOutputMode();
  syncBackdropUploadVisibility();
  syncCustomPaletteVisibility();
  resizeCanvasToDisplaySize();
}

function renderPresetList() {
  if (!dom.presetList) {
    return;
  }

  const names = Object.keys(presetCache);

  if (names.length === 0) {
    dom.presetList.innerHTML = '<p class="text-xs text-muted text-center py-2">Henuz preset yok.</p>';
    return;
  }

  dom.presetList.innerHTML = names
    .map(
      (name) => `
    <div class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span class="flex-1 truncate text-sm">${escapeHtml(name)}</span>
      <button type="button" class="shrink-0 text-xs text-mint underline hover:no-underline" data-preset-load="${escapeHtml(name)}">Yukle</button>
      <button type="button" class="shrink-0 text-xs text-[#ffd8d1] underline hover:no-underline" data-preset-delete="${escapeHtml(name)}">Sil</button>
    </div>`
    )
    .join("");

  dom.presetList.querySelectorAll("[data-preset-load]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetData = presetCache[btn.dataset.presetLoad];
      if (presetData) {
        applyPreset(presetData);
      }
    });
  });

  dom.presetList.querySelectorAll("[data-preset-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      deletePreset(btn.dataset.presetDelete);
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "visualizer";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

// ── Oscilloscope (X-Y Lissajous) ─────────────────────────────────────────────
function drawOscilloscope(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const scale = Math.min(width, height) * 0.4;

  const hasLive = state.stereoAnalyserL && state.stereoDataL && metrics.isLive;

  if (hasLive) {
    state.stereoAnalyserL.getFloatTimeDomainData(state.stereoDataL);
    state.stereoAnalyserR.getFloatTimeDomainData(state.stereoDataR);
  }

  context.save();
  context.shadowBlur = profile.shadowBlur * 0.6;
  context.shadowColor = rgba(palette.primaryRgb, 0.55 * profile.glowAlpha);
  context.lineWidth = 1.6;
  context.lineJoin = "round";

  context.beginPath();
  const len = hasLive ? Math.min(state.stereoDataL.length, state.stereoDataR.length) : 256;
  for (let i = 0; i < len; i += 2) {
    const lSample = hasLive ? state.stereoDataL[i] : Math.sin(now * 0.003 + i * 0.12) * 0.2;
    const rSample = hasLive ? state.stereoDataR[i] : Math.sin(now * 0.002 + i * 0.18 + 0.8) * 0.2;
    const x = centerX + lSample * scale;
    const y = centerY - rSample * scale;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  const grad = context.createLinearGradient(centerX - scale, centerY, centerX + scale, centerY);
  grad.addColorStop(0, rgba(palette.primaryRgb, 0.85));
  grad.addColorStop(0.5, rgba(palette.accentRgb, 0.9));
  grad.addColorStop(1, rgba(palette.secondaryRgb, 0.85));
  context.strokeStyle = grad;
  context.stroke();

  context.shadowBlur = 0;
  context.strokeStyle = rgba(palette.secondaryRgb, 0.12);
  context.lineWidth = 1;
  context.setLineDash([3, 5]);
  context.beginPath();
  context.moveTo(centerX - scale * 0.88, centerY);
  context.lineTo(centerX + scale * 0.88, centerY);
  context.moveTo(centerX, centerY - scale * 0.88);
  context.lineTo(centerX, centerY + scale * 0.88);
  context.stroke();
  context.setLineDash([]);

  if (profile.allowSoftFill) {
    context.fillStyle = rgba(palette.accentRgb, 0.82 * profile.fillAlpha);
    context.beginPath();
    context.arc(centerX, centerY, 4 + metrics.energy * 8, 0, TAU);
    context.fill();
  }

  context.fillStyle = rgba(palette.secondaryRgb, 0.45);
  context.font = "bold 10px Bahnschrift, Trebuchet MS, sans-serif";
  context.fillText("L →", centerX + scale * 0.72, centerY - 10);
  context.fillText("R ↑", centerX + 8, centerY - scale * 0.72);

  context.restore();
}

// ── Stereo Field (dual waveform) ──────────────────────────────────────────────
function drawStereoField(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.5;
  const amplitude = height * 0.22;

  const hasLive = state.stereoAnalyserL && state.stereoDataL && metrics.isLive;

  if (hasLive) {
    state.stereoAnalyserL.getFloatTimeDomainData(state.stereoDataL);
    state.stereoAnalyserR.getFloatTimeDomainData(state.stereoDataR);
  }

  const drawChannel = (data, yBase, yDir, colorRgb) => {
    context.beginPath();
    const len = data ? data.length : 256;
    const step = Math.max(1, Math.floor(len / Math.max(160, width / 3)));
    for (let i = 0; i < len; i += step) {
      const sample = hasLive ? data[i] : Math.sin(now * 0.003 + i * 0.11) * 0.08;
      const x = (i / (len - 1)) * width;
      const y = yBase + sample * yDir * amplitude;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = rgba(colorRgb, 0.9);
    context.lineWidth = 2.5;
    context.stroke();

    if (profile.allowSoftFill) {
      context.beginPath();
      for (let i = 0; i < len; i += step) {
        const sample = hasLive ? data[i] : Math.sin(now * 0.003 + i * 0.11) * 0.08;
        const x = (i / (len - 1)) * width;
        const y = yBase + sample * yDir * amplitude;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.lineTo(width, yBase);
      context.lineTo(0, yBase);
      context.closePath();
      context.fillStyle = rgba(colorRgb, 0.07 * profile.fillAlpha);
      context.fill();
    }
  };

  context.save();
  context.lineJoin = "round";
  context.lineCap = "round";
  context.shadowBlur = profile.shadowBlur;
  context.shadowColor = rgba(palette.primaryRgb, 0.55 * profile.glowAlpha);

  drawChannel(state.stereoDataL, centerY - height * 0.02, -1, palette.primaryRgb);
  context.shadowColor = rgba(palette.secondaryRgb, 0.55 * profile.glowAlpha);
  drawChannel(state.stereoDataR, centerY + height * 0.02, 1, palette.secondaryRgb);

  context.shadowBlur = 0;
  context.strokeStyle = rgba(palette.accentRgb, 0.18);
  context.lineWidth = 1;
  context.setLineDash([4, 6]);
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.stroke();
  context.setLineDash([]);

  context.font = "bold 11px Bahnschrift, Trebuchet MS, sans-serif";
  context.fillStyle = rgba(palette.primaryRgb, 0.55);
  context.fillText("L", 14, centerY - 16);
  context.fillStyle = rgba(palette.secondaryRgb, 0.55);
  context.fillText("R", 14, centerY + 26);

  context.restore();
}

// ── Canvas Yazisi Overlay ─────────────────────────────────────────────────────
function drawTrackOverlay(metrics, now) {
  if (!state.overlayTextEnabled) return;
  const title = state.overlayTitle.trim();
  const artist = state.overlayArtist.trim();
  if (!title && !artist) return;

  const width = state.width;
  const height = state.height;
  const pad = 32;
  const pos = state.overlayPosition;
  const size = state.overlayTextSize;
  const color = state.overlayTextColor;
  const colorRgb = hexToRgb(color);
  const anim = state.overlayAnimation;
  const animT = (now - state.overlayAnimStartTime) / 1000;

  const titleSize = size;
  const artistSize = Math.max(12, Math.round(size * 0.58));
  const lineGap = Math.round(size * 0.28);

  let blockH = 0;
  if (title) blockH += titleSize;
  if (title && artist) blockH += lineGap;
  if (artist) blockH += artistSize;

  let textAlign;
  let baseX;
  if (pos === "top-left" || pos === "bottom-left") {
    baseX = pad;
    textAlign = "left";
  } else if (pos === "top-right" || pos === "bottom-right") {
    baseX = width - pad;
    textAlign = "right";
  } else {
    baseX = width / 2;
    textAlign = "center";
  }

  const anchorY = pos.startsWith("top") ? pad : height - pad - blockH;

  // ── Animasyon ────────────────────────────────────────────────────────────
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  let alphaScale = 1;
  let yOff = 0;
  let xOff = 0;
  let glowBoost = 0;
  let titleText = title;
  let artistText = artist;

  switch (anim) {
    case "fade":
      alphaScale = easeOut(animT / 1.2);
      break;

    case "slide-up":
      alphaScale = easeOut(animT / 0.7);
      yOff = lerp(Math.min(height * 0.07, 52), 0, easeOut(animT / 0.9));
      break;

    case "slide-left": {
      const slideDir = textAlign === "right" ? 1 : -1;
      alphaScale = easeOut(animT / 0.7);
      xOff = lerp(Math.min(width * 0.1, 72) * slideDir, 0, easeOut(animT / 0.9));
      break;
    }

    case "typewriter": {
      const charsPerSec = Math.max(18, Math.round(size * 1.1));
      const revealCount = Math.floor(animT * charsPerSec);
      titleText = title.slice(0, Math.min(revealCount, title.length));
      artistText = artist.slice(0, Math.max(0, revealCount - title.length));
      break;
    }

    case "pulse":
      alphaScale = 0.4 + (Math.sin(animT * Math.PI * 0.9) * 0.5 + 0.5) * 0.6;
      break;

    case "glow-beat": {
      const bass = metrics ? metrics.bass : 0;
      glowBoost = bass * 64;
      alphaScale = 0.7 + bass * 0.3;
      break;
    }

    case "float":
      yOff = Math.sin(animT * 0.72) * Math.max(5, size * 0.18);
      break;
  }

  if (alphaScale <= 0.01) return;

  // ── Cizim ────────────────────────────────────────────────────────────────
  context.save();
  context.textAlign = textAlign;
  context.textBaseline = "top";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;

  const drawX = baseX + xOff;
  let curY = anchorY + yOff;

  if (titleText || anim !== "typewriter") {
    context.font = `bold ${titleSize}px Constantia, Georgia, serif`;
    context.shadowColor = `rgba(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]},0.52)`;
    context.shadowBlur = Math.round(titleSize * 0.55) + glowBoost;
    context.globalAlpha = alphaScale;
    context.fillStyle = color;
    context.fillText(titleText, drawX, curY);
    curY += titleSize + lineGap;
  }

  if (artistText || anim !== "typewriter") {
    context.font = `${artistSize}px Bahnschrift, "Trebuchet MS", sans-serif`;
    context.shadowColor = `rgba(${colorRgb[0]},${colorRgb[1]},${colorRgb[2]},0.36)`;
    context.shadowBlur = Math.round(artistSize * 0.5) + glowBoost * 0.65;
    context.globalAlpha = alphaScale * 0.72;
    context.fillStyle = color;
    context.fillText(artistText, drawX, curY);
  }

  context.restore();
}

// ── Neon String ───────────────────────────────────────────────────────────────
// Frekans verisiyle sekillenen neon yildiz outline — gg.PNG tarzi
function drawNeonString(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  const count = 120;
  const samples = resample(metrics.samples, count);
  const radius = Math.min(width, height) * 0.12;
  const extension = Math.min(width, height) * 0.33;

  context.save();
  context.translate(centerX, centerY);
  context.rotate(state.rotation * 0.45);
  context.lineJoin = "round";

  // 3 echo ring: disaridan iceriye azalan opaklık
  for (let echo = 2; echo >= 0; echo--) {
    const echoScale = 1 - echo * 0.09;
    const alpha = (1 - echo * 0.30) * profile.glowAlpha;
    context.shadowBlur = profile.shadowBlur * (1.5 - echo * 0.35);
    context.shadowColor = rgba(palette.primaryRgb, 0.72 * alpha);
    context.strokeStyle = rgba(palette.primaryRgb, alpha * 0.9);
    context.lineWidth = 2.2 - echo * 0.5;

    context.beginPath();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU - Math.PI * 0.5;
      const r = (radius + samples[i] * extension) * echoScale;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
  }

  context.restore();
}

// ── Dot Line ──────────────────────────────────────────────────────────────────
// Nokta çizgisinden yukarı/aşağı büyüyen barlar — gf.PNG tarzi
function drawDotLine(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.5;

  const count = clamp(Math.round(state.barCount * 0.72), 24, 88);
  const samples = resample(metrics.samples, count);
  const sidePad = width * 0.04;
  const totalW = width - sidePad * 2;
  const spacing = totalW / count;
  const barW = Math.max(2, spacing * 0.52);
  const maxReach = height * 0.38;

  context.save();
  context.shadowBlur = profile.shadowBlur * 0.9;
  context.shadowColor = rgba(palette.primaryRgb, 0.7 * profile.glowAlpha);

  // Barlar: merkez çizgisinden yukarı ve aşağı
  for (let i = 0; i < count; i++) {
    const reach = clamp(samples[i], 0.03, 1.2) * maxReach;
    const x = sidePad + i * spacing + spacing * 0.5;

    const grad = context.createLinearGradient(0, centerY - reach, 0, centerY + reach);
    grad.addColorStop(0,    rgba(palette.secondaryRgb, 0.25 * profile.glowAlpha));
    grad.addColorStop(0.4,  palette.primary);
    grad.addColorStop(0.5,  palette.accent);
    grad.addColorStop(0.6,  palette.primary);
    grad.addColorStop(1,    rgba(palette.secondaryRgb, 0.25 * profile.glowAlpha));
    context.fillStyle = grad;
    fillRoundedRect(context, x - barW * 0.5, centerY - reach, barW, reach * 2, barW * 0.45);
  }

  // Nokta çizgisi
  context.shadowBlur = 0;
  context.fillStyle = rgba(palette.primaryRgb, 0.55);
  const dotR = Math.max(1.2, width * 0.0017);
  const dotStep = Math.max(6, width * 0.0085);
  for (let x = sidePad; x < width - sidePad; x += dotStep) {
    context.beginPath();
    context.arc(x, centerY, dotR, 0, TAU);
    context.fill();
  }

  context.restore();
}

// ── Mirror 3D ─────────────────────────────────────────────────────────────────
// Perspektif + sine zarf ile 3D derinlik etkisi — dss.PNG tarzi
function drawMirror3D(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerY = height * 0.5;

  const count = clamp(Math.round(state.barCount * 0.62), 20, 72);
  const samples = resample(metrics.samples, count);
  const sidePad = width * 0.03;
  const totalW = width - sidePad * 2;
  const spacing = totalW / count;
  const maxReach = height * 0.41;

  context.save();
  context.shadowBlur = profile.shadowBlur * 1.7;
  context.shadowColor = rgba(palette.primaryRgb, 0.88 * profile.glowAlpha);

  for (let i = 0; i < count; i++) {
    // Sine zarf: ortada uzun, kenarlarda kısa
    const sineEnv = Math.sin((i / (count - 1)) * Math.PI);
    // Perspektif: merkeze yakın barlar "daha yakın" görünür
    const distFromCenter = Math.abs(i / (count - 1) - 0.5) * 2; // 0=merkez 1=kenar
    const perspScale = 0.38 + (1 - distFromCenter) * 0.62;

    const reach = clamp(samples[i], 0.02, 1.2) * maxReach * sineEnv;
    const x = sidePad + i * spacing + spacing * 0.5;
    const barW = Math.max(2, spacing * 0.62 * perspScale);
    const alpha = 0.3 + perspScale * 0.7;

    const grad = context.createLinearGradient(0, centerY - reach, 0, centerY + reach);
    grad.addColorStop(0,    rgba(palette.secondaryRgb, alpha * 0.3));
    grad.addColorStop(0.35, rgba(palette.accentRgb,    alpha * 0.85));
    grad.addColorStop(0.5,  rgba(palette.primaryRgb,   alpha));
    grad.addColorStop(0.65, rgba(palette.accentRgb,    alpha * 0.85));
    grad.addColorStop(1,    rgba(palette.secondaryRgb, alpha * 0.3));
    context.fillStyle = grad;

    const h = Math.max(4, reach * 2);
    fillRoundedRect(context, x - barW * 0.5, centerY - reach, barW, h, barW * 0.42);
  }

  // Kesik merkez çizgisi
  context.shadowBlur = 0;
  context.strokeStyle = rgba(palette.accentRgb, 0.28);
  context.lineWidth = 1;
  context.setLineDash([4, 7]);
  context.beginPath();
  context.moveTo(sidePad, centerY);
  context.lineTo(width - sidePad, centerY);
  context.stroke();
  context.setLineDash([]);
  context.restore();
}

// ── Petal Burst ───────────────────────────────────────────────────────────────
// Elips yapraklar — bb.PNG tarzi
function drawPetalBurst(metrics, now) {
  const palette = getActivePalette();
  const profile = getRenderProfile();
  const width = state.width;
  const height = state.height;
  const centerX = width * 0.5;
  const centerY = height * 0.5;

  const petalCount = 16;
  const minDim = Math.min(width, height);
  const petalLen  = minDim * (0.18 + metrics.bass * 0.14 + metrics.energy * 0.07);
  const petalW    = minDim * 0.036;
  const innerGap  = minDim * 0.055;

  const samples = resample(metrics.samples, petalCount);

  context.save();
  context.translate(centerX, centerY);
  context.rotate(state.rotation * 0.28 + now * 0.000028);
  context.shadowBlur = profile.shadowBlur * 0.85;
  context.lineWidth = 2;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * TAU;
    const s = samples[i];
    const length = innerGap + s * petalLen;
    const pw = Math.max(petalW * 0.25, petalW * (0.28 + s * 0.72));

    context.save();
    context.rotate(angle);
    context.shadowColor = rgba(palette.primaryRgb, (0.38 + s * 0.45) * profile.glowAlpha);
    context.strokeStyle = rgba(palette.primaryRgb, 0.52 + s * 0.38);
    context.beginPath();
    context.ellipse(innerGap + length * 0.5, 0, length * 0.5, pw, 0, 0, TAU);
    context.stroke();
    context.restore();
  }

  // Merkez nokta
  context.shadowBlur = profile.shadowBlur * 0.6;
  context.shadowColor = rgba(palette.accentRgb, 0.8 * profile.glowAlpha);
  context.fillStyle = rgba(palette.accentRgb, 0.9);
  context.beginPath();
  context.arc(0, 0, minDim * (0.018 + metrics.energy * 0.014), 0, TAU);
  context.fill();

  context.restore();
}

// ── Spectrogram ───────────────────────────────────────────────────────────────
// Her frame'de 1 piksel kaydirarak isi haritasi olusturur
function drawSpectrogram(metrics, now) {
  const width  = state.width;
  const height = state.height;
  const scrollPx = 2;

  if (!state._spectrogramCanvas ||
      state._spectrogramCanvas.width !== width ||
      state._spectrogramCanvas.height !== height) {
    state._spectrogramCanvas = document.createElement("canvas");
    state._spectrogramCanvas.width  = width;
    state._spectrogramCanvas.height = height;
    state._spectrogramCtx = state._spectrogramCanvas.getContext("2d");
  }

  const sCtx = state._spectrogramCtx;
  const sCvs = state._spectrogramCanvas;

  // Mevcut icerigi asagi kaydır
  sCtx.drawImage(sCvs, 0, scrollPx);

  // Yeni frekans satırı — en üste ciz
  const capBin = Math.floor(state._smoothActiveCap || state.frequencyData.length * 0.73);
  for (let x = 0; x < width; x++) {
    const binIdx = Math.floor((x / width) * capBin);
    const val    = state.frequencyData[binIdx] / 255;
    // Mor→mavi→cyan→yesil→sari→beyaz renk haritasi
    const hue   = 270 - val * 240;
    const light = 8 + val * 75;
    const sat   = val < 0.05 ? 0 : 85;
    sCtx.fillStyle = `hsl(${hue},${sat}%,${light}%)`;
    sCtx.fillRect(x, 0, 1, scrollPx);
  }

  // Ana canvas'a aktar
  context.drawImage(sCvs, 0, 0);

  // Hz etiketleri
  const palette = getActivePalette();
  const nyquist = 22050;
  const capFreq = Math.round((capBin / state.frequencyData.length) * nyquist / 1000);
  context.fillStyle = rgba(palette.primaryRgb, 0.45);
  context.font = "11px monospace";
  context.textAlign = "right";
  context.fillText(`${capFreq} kHz`, width - 8, height - 8);
  context.textAlign = "left";
  context.fillText("0 Hz", 8, height - 8);
  context.textAlign = "left";
}

// ── Ripple Beat ───────────────────────────────────────────────────────────────
// Bass vurusunda merkezden dısa yayılan daireler
function drawRippleBeat(metrics, now) {
  const palette = getActivePalette();
  const profile  = getRenderProfile();
  const width  = state.width;
  const height = state.height;
  const cx = width  * 0.5;
  const cy = height * 0.5;
  const maxR = Math.min(width, height) * 0.47;

  // Yeni dalgalanma tetikle
  if (!state.ripples) state.ripples = [];
  if (metrics.bass > 0.54 && now - (state._lastRippleTime || 0) > 160) {
    state.ripples.push({ t: now, strength: metrics.bass });
    state._lastRippleTime = now;
  }
  state.ripples = state.ripples.filter(r => now - r.t < 2200);

  context.save();

  // Dalgalanma halkalaeri
  for (const ripple of state.ripples) {
    const age   = (now - ripple.t) / 2200;
    const r     = Math.pow(age, 0.62) * maxR;
    const alpha = (1 - age) * 0.70 * ripple.strength;
    const lw    = Math.max(0.4, (1 - age) * 3.5 * ripple.strength);

    context.shadowBlur  = profile.shadowBlur * (1 - age * 0.65);
    context.shadowColor = rgba(palette.primaryRgb, alpha * profile.glowAlpha);
    context.strokeStyle = rgba(palette.primaryRgb, alpha);
    context.lineWidth   = lw;
    context.beginPath();
    context.arc(cx, cy, r, 0, TAU);
    context.stroke();

    if (r > 30) {
      context.strokeStyle = rgba(palette.secondaryRgb, alpha * 0.38);
      context.lineWidth   = lw * 0.5;
      context.beginPath();
      context.arc(cx, cy, r * 0.68, 0, TAU);
      context.stroke();
    }
  }

  // Merkez radyal barlar
  const samples  = resample(metrics.samples, 72);
  const innerR   = maxR * 0.09;
  const barMaxLen = maxR * 0.26;

  context.translate(cx, cy);
  context.rotate(state.rotation * 0.5);
  context.shadowBlur  = profile.shadowBlur * 0.75;
  context.shadowColor = rgba(palette.accentRgb, 0.65 * profile.glowAlpha);

  for (let i = 0; i < samples.length; i++) {
    const angle = (i / samples.length) * TAU;
    const len   = samples[i] * barMaxLen;
    const cos   = Math.cos(angle);
    const sin   = Math.sin(angle);

    context.strokeStyle = rgba(palette.primaryRgb, 0.60 + samples[i] * 0.35);
    context.lineWidth   = 1.4 + samples[i] * 2.8;
    context.beginPath();
    context.moveTo(cos * innerR,        sin * innerR);
    context.lineTo(cos * (innerR + len), sin * (innerR + len));
    context.stroke();
  }

  context.restore();
}

// ── DNA Helix ─────────────────────────────────────────────────────────────────
// Iki sarmal dalga + enerjiyle genişleyen merdivenler
function drawDNAHelix(metrics, now) {
  const palette = getActivePalette();
  const profile  = getRenderProfile();
  const width  = state.width;
  const height = state.height;
  const cy     = height * 0.5;

  const speed    = 55;
  const offset   = (now * 0.001 * speed) % width;
  const amplitude = height * 0.30 * (0.38 + metrics.energy * 0.62);
  const period   = width * 0.30;
  const rungStep = period * 0.5;

  context.save();
  context.lineJoin = "round";
  context.lineCap  = "round";

  // Sarmal 1 (sin)
  context.shadowBlur  = profile.shadowBlur * 0.85;
  context.shadowColor = rgba(palette.primaryRgb, 0.60 * profile.glowAlpha);
  context.strokeStyle = rgba(palette.primaryRgb, 0.88);
  context.lineWidth   = 2.5;
  context.beginPath();
  for (let x = -2; x <= width + 2; x += 2) {
    const y = cy + Math.sin(((x + offset) / period) * TAU) * amplitude;
    x <= 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  }
  context.stroke();

  // Sarmal 2 (sin + π)
  context.shadowColor = rgba(palette.secondaryRgb, 0.60 * profile.glowAlpha);
  context.strokeStyle = rgba(palette.secondaryRgb, 0.88);
  context.beginPath();
  for (let x = -2; x <= width + 2; x += 2) {
    const y = cy + Math.sin(((x + offset) / period) * TAU + Math.PI) * amplitude;
    x <= 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  }
  context.stroke();

  // Merdivenler — frekans verisine gore kalınlık/renk
  const samples = metrics.samples;
  const n       = samples.length;
  const phOff   = offset % rungStep;

  for (let x = -phOff; x < width + rungStep; x += rungStep) {
    const y1 = cy + Math.sin(((x + offset) / period) * TAU)            * amplitude;
    const y2 = cy + Math.sin(((x + offset) / period) * TAU + Math.PI)  * amplitude;
    const si  = Math.floor(((x % width + width) % width) / width * n);
    const s   = samples[clamp(si, 0, n - 1)];

    const grad = context.createLinearGradient(x, y1, x, y2);
    grad.addColorStop(0,   rgba(palette.primaryRgb,   0.28 + s * 0.52));
    grad.addColorStop(0.5, rgba(palette.accentRgb,    0.55 + s * 0.40));
    grad.addColorStop(1,   rgba(palette.secondaryRgb, 0.28 + s * 0.52));

    context.shadowBlur  = profile.shadowBlur * 0.55 * s;
    context.shadowColor = rgba(palette.accentRgb, s * profile.glowAlpha);
    context.strokeStyle = grad;
    context.lineWidth   = 1.5 + s * 3;
    context.beginPath();
    context.moveTo(x, y1);
    context.lineTo(x, y2);
    context.stroke();
  }

  context.restore();
}

// ── Albüm Kapağı ─────────────────────────────────────────────────────────────
function drawAlbumArt(metrics) {
  if (!state.albumArt) return;
  const width  = state.width;
  const height = state.height;
  // Varsayılan merkez = aktif görsel modunun anchor noktası (0 offset = tam hizalı)
  const anchorY = MODE_ANCHOR_Y[state.style] || 0.5;
  const cx = width  * 0.5  + state.albumArtOffsetX * width;
  const cy = height * anchorY + state.albumArtOffsetY * height;

  context.save();

  if (state.albumArtMode === "backdrop") {
    context.filter = "blur(14px)";
    context.globalAlpha = 0.32;
    const scale = Math.max(width / state.albumArt.width, height / state.albumArt.height);
    const sw = state.albumArt.width  * scale;
    const sh = state.albumArt.height * scale;
    context.drawImage(state.albumArt, cx - sw * 0.5, cy - sh * 0.5, sw, sh);
    context.filter = "none";
    context.globalAlpha = 1;
  } else {
    // Merkez daire: kullanici boyutu + enerjiyle hafifce buyuyen radius
    const r = Math.min(width, height) * (0.10 * state.albumArtScale + metrics.energy * 0.012);
    context.beginPath();
    context.arc(cx, cy, r, 0, TAU);
    context.clip();
    context.drawImage(state.albumArt, cx - r, cy - r, r * 2, r * 2);
    context.restore();

    // Halkası
    context.save();
    const palette = getActivePalette();
    context.shadowBlur  = 14;
    context.shadowColor = rgba(palette.primaryRgb, 0.55);
    context.strokeStyle = rgba(palette.primaryRgb, 0.60 + metrics.energy * 0.30);
    context.lineWidth   = 2.5;
    context.beginPath();
    context.arc(cx, cy, r + 2, 0, TAU);
    context.stroke();
  }

  context.restore();
}

// ── Quick Clip (5 saniyelik video) ───────────────────────────────────────────
async function exportQuickClip() {
  if (!requirePremium()) return;
  if (state.recording || state.isFinalizingRecording) {
    setStatus("error", "Kayit devam ediyor, once onu bitir.");
    return;
  }

  const DURATION_MS = 5000;

  if (dom.quickclipBtn) {
    dom.quickclipBtn.disabled = true;
    dom.quickclipBtn.textContent = "Kaydediyor…";
  }

  try {
    await startRecording();

    await new Promise(resolve => setTimeout(resolve, DURATION_MS));

    stopRecording();

    // İndirme linki otomatik tetiklenir stopRecording() içinde
  } catch (err) {
    setStatus("error", "Klip kaydedilemedi.");
    if (dom.quickclipBtn) {
      dom.quickclipBtn.disabled = false;
      dom.quickclipBtn.textContent = "Klip";
    }
    return;
  }

  // Buton startRecording bittikten sonra resetlenecek (stopRecording zaten resetler)
  // Ama quickclipBtn'i de sifirla:
  const resetBtn = () => {
    if (dom.quickclipBtn) {
      dom.quickclipBtn.disabled = false;
      dom.quickclipBtn.textContent = "Klip";
    }
  };
  setTimeout(resetBtn, DURATION_MS + 2000);
}

// ── Waveform progress bar ─────────────────────────────────────────────────────
function decodeWaveformPeaks(audioBuffer, targetCount) {
  const channelData = audioBuffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / targetCount);
  const peaks = new Float32Array(targetCount);
  for (let i = 0; i < targetCount; i++) {
    let max = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      const abs = Math.abs(channelData[start + j] || 0);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }
  return peaks;
}

function drawWaveformTrack() {
  const canvas = dom.waveformTrack;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const duration = dom.audioPlayer.duration;
  const currentTime = dom.audioPlayer.currentTime;
  const progress = (Number.isFinite(duration) && duration > 0) ? clamp(currentTime / duration, 0, 1) : 0;
  const playheadX = progress * w;
  const peaks = state.waveformPeaks;
  const cy = h / 2;

  if (!peaks || peaks.length === 0) {
    ctx.fillStyle = "rgba(230,18,43,0.35)";
    ctx.fillRect(0, 0, playheadX, h);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(playheadX, 0, w - playheadX, h);
  } else {
    const barW = w / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const bh = Math.max(1.5, peaks[i] * h * 0.9);
      // calinan kisim kirmizi, calinmamis kisim beyaz
      ctx.fillStyle = x <= playheadX ? "rgba(230,18,43,0.92)" : "rgba(255,255,255,0.34)";
      ctx.fillRect(x, cy - bh / 2, Math.max(0.8, barW - 0.5), bh);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(Math.round(playheadX) - 1, 0, 2, h);
}
