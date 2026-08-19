/**
 * Music player controller.
 *
 * Owns the playback state machine, sequential/shuffle queues, cancellable
 * volume fades, audio/cover preloading, the read-only progress bar, and the
 * vinyl/tonearm animation for the shared <MusicPlayer> component.  The DOM and
 * track data stay in MusicPlayer.astro; this module only drives them.
 *
 * The component is persisted across Astro view transitions
 * (transition:persist="music-player"), so this module keeps a single active
 * controller and re-binds listeners only when the persisted root node is
 * actually replaced.
 */

import type { Track } from "../data/tracks";

type MusicContextKind = "artist" | "album" | "track";

interface MusicContextEntity {
  kind: MusicContextKind;
  id: string;
  name?: string;
  title?: string;
  subtitle?: string;
  image?: string | null;
  paragraphs: string[];
  meta: Array<{ label: string; value: string }>;
  sourceUrl: string;
}

interface MusicContextPayload {
  schemaVersion: number;
  verifiedAt: string;
  artists: MusicContextEntity[];
  albums: MusicContextEntity[];
  tracks: MusicContextEntity[];
}

type PlaybackMode = "sequential" | "shuffle";

type PlaybackPhase =
  | "idle" // page generated, first track not yet handed to <audio>
  | "ready" // a track is committed but not playing
  | "starting" // accelerating / waiting for canplay / needle about to drop
  | "playing" // audio is genuinely progressing
  | "pausing" // volume fading out
  | "paused" // audio paused, needle lifted, arm keeps its progress position
  | "switching" // old track fading out while the new resource prepares
  | "buffering" // perceptible waiting/stalled
  | "error"; // current audio failed, controller can still switch tracks

type DesiredPlayback = "playing" | "paused";
type CoverState = "neutral" | "loading" | "ready" | "fallback";
type CoverResult = { kind: "image"; src: string } | { kind: "fallback" } | { kind: "stale" };
type AudioProbeResult = { kind: "ok" } | { kind: "error" } | { kind: "stale" };
type HistoryPolicy = "append" | "move-cursor" | "reset";

interface PlayerState {
  phase: PlaybackPhase;
  desiredPlayback: DesiredPlayback;
  playbackMode: PlaybackMode;

  currentIndex: number;
  pendingIndex: number | null;
  hasCommittedTrack: boolean;

  operationId: number;
  coverRequestId: number;
  activeProbe: HTMLAudioElement | null;
  pendingDraw: number | null;

  targetVolume: number;
  fadeFrame: number;
  fadeResolve: ((ok: boolean) => void) | null;
  progressFrame: number;
  lastRenderedSecond: number;

  randomBag: number[];
  playHistory: number[];
  historyCursor: number;

  coverState: CoverState;
  bufferTimer: number;
  naturalEndTimer: number;
  slowLoadTimer: number;
  slowLoadHint: boolean;
  errorMessage: string;

  reducedMotion: boolean;
  catalogOpen: boolean;
  panelOpen: boolean;
  contextOpen: boolean;
  contextClosing: boolean;
  contextCloseTimer: number;
  contextOverview: boolean;
  contextRequestId: number;
}

const PLAYBACK_MODE_KEY = "rongyu-notes.music-play-mode.v1";

const PLAYBACK_TRANSITION_MS = 380;
const CONTEXT_EXIT_MS = 170;

const BUFFER_THRESHOLD_MS = 180;
const SLOW_LOAD_MS = 4000;
const STALL_TIMEOUT_MS = 45000;

const ARM_PARKED_DEG = -30;
const ARM_OUTER_DEG = -14;
const ARM_INNER_DEG = 6;

const finiteOrZero = (value: number): number => (Number.isFinite(value) ? value : 0);
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainder = wholeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

function fisherYates(source: number[]): number[] {
  const deck = [...source];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createRandomBag(excludeIndex: number): number[] {
  const bag = tracks.map((_, index) => index).filter((index) => index !== excludeIndex);
  return fisherYates(bag);
}

function chooseRandomTrackIndex(): number {
  return Math.floor(Math.random() * tracks.length);
}

// Runtime tracks come from the persisted component's data attribute; the type
// import above is erased at build time.
let tracks: Track[] = [];

function loadPlaybackMode(): PlaybackMode {
  try {
    return localStorage.getItem(PLAYBACK_MODE_KEY) === "shuffle" ? "shuffle" : "sequential";
  } catch {
    return "sequential";
  }
}

function canonicalAudioPath(path: string): string {
  try {
    return new URL(path, window.location.href).href;
  } catch {
    return path;
  }
}

interface MusicController {
  root: HTMLElement;
  closePanel(): void;
  destroy(): void;
}

let activeController: MusicController | null = null;

function initializeMusicPlayer(): void {
  const root = document.querySelector<HTMLElement>("[data-music-player]");
  if (!root) {
    activeController?.destroy();
    activeController = null;
    return;
  }
  if (activeController?.root === root) return; // transition:persist kept the same node
  activeController?.destroy();
  activeController = createMusicController(root);
}

function createMusicController(root: HTMLElement): MusicController {
  const signal = new AbortController();
  const abortSignal = signal.signal;

  const parsedTracks = JSON.parse(root.dataset.tracks ?? "[]");
  tracks = Array.isArray(parsedTracks) ? (parsedTracks as Track[]) : [];

  const audio = root.querySelector<HTMLAudioElement>("[data-player-audio]");
  const panel = root.querySelector<HTMLElement>("[data-music-panel]");
  const toggle = root.querySelector<HTMLButtonElement>("[data-player-toggle]");
  const catalogToggle = root.querySelector<HTMLButtonElement>("[data-player-catalog-toggle]");
  const nowPlaying = root.querySelector<HTMLElement>("[data-player-now-playing]");
  const catalog = root.querySelector<HTMLElement>("[data-player-catalog]");
  const context = root.querySelector<HTMLElement>("[data-player-context]");
  const contextClose = root.querySelector<HTMLButtonElement>("[data-player-context-close]");
  const contextBack = root.querySelector<HTMLButtonElement>("[data-player-context-back]");
  const contextStatus = root.querySelector<HTMLElement>("[data-player-context-status]");
  const contextOverview = root.querySelector<HTMLElement>("[data-player-context-overview]");
  const contextOverviewTitle = root.querySelector<HTMLElement>("[data-player-context-overview-title]");
  const contextOverviewCaption = root.querySelector<HTMLElement>("[data-player-context-overview-caption]");
  const contextArticle = root.querySelector<HTMLElement>("[data-player-context-article]");
  const contextImage = root.querySelector<HTMLImageElement>("[data-player-context-image]");
  const contextKind = root.querySelector<HTMLElement>("[data-player-context-kind]");
  const contextTitle = root.querySelector<HTMLElement>("[data-player-context-title]");
  const contextSubtitle = root.querySelector<HTMLElement>("[data-player-context-subtitle]");
  const contextMeta = root.querySelector<HTMLElement>("[data-player-context-meta]");
  const contextProse = root.querySelector<HTMLElement>("[data-player-context-prose]");
  const contextSource = root.querySelector<HTMLAnchorElement>("[data-player-context-source]");
  const contextTriggers = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-player-context-trigger]"));
  const contextChoices = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-player-context-choice]"));
  const contextChoiceArtist = root.querySelector<HTMLElement>("[data-player-context-choice-artist]");
  const contextChoiceAlbum = root.querySelector<HTMLElement>("[data-player-context-choice-album]");
  const contextChoiceTrack = root.querySelector<HTMLElement>("[data-player-context-choice-track]");
  const coverContext = root.querySelector<HTMLButtonElement>(".music-panel__cover-context");
  const message = root.querySelector<HTMLElement>("[data-player-message]");
  const trackButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-player-track]"));
  const catalogContextButtons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-player-track-context]"));
  const controls = root.querySelector<HTMLElement>(".music-panel__controls");
  const playButton = root.querySelector<HTMLButtonElement>("[data-player-play]");
  const previousButton = root.querySelector<HTMLButtonElement>("[data-player-previous]");
  const nextButton = root.querySelector<HTMLButtonElement>("[data-player-next]");
  const modeButton = root.querySelector<HTMLButtonElement>("[data-player-mode]");
  const playIcon = root.querySelector<HTMLElement>("[data-player-play-icon]");
  const pauseIcon = root.querySelector<HTMLElement>("[data-player-pause-icon]");
  const modeSequentialIcon = root.querySelector<HTMLElement>("[data-player-mode-sequential]");
  const modeShuffleIcon = root.querySelector<HTMLElement>("[data-player-mode-shuffle]");
  const coverCurrent = root.querySelector<HTMLImageElement>("[data-player-cover-current]");
  const coverIncoming = root.querySelector<HTMLImageElement>("[data-player-cover-incoming]");
  const title = root.querySelector<HTMLElement>("[data-player-title]");
  const artist = root.querySelector<HTMLElement>("[data-player-artist]");
  const album = root.querySelector<HTMLElement>("[data-player-album]");
  const position = root.querySelector<HTMLElement>("[data-player-position]");
  const currentTime = root.querySelector<HTMLElement>("[data-player-current-time]");
  const duration = root.querySelector<HTMLElement>("[data-player-duration]");
  const progress = root.querySelector<HTMLElement>("[data-player-progress]");
  const platter = root.querySelector<HTMLElement>("[data-player-platter]");
  const tonearm = root.querySelector<HTMLElement>("[data-player-tonearm]");
  const needle = root.querySelector<HTMLElement>("[data-player-needle]");

  const missing =
    !audio ||
    !panel ||
    !toggle ||
    !catalogToggle ||
    !nowPlaying ||
    !catalog ||
    !context ||
    !contextClose ||
    !contextBack ||
    !contextStatus ||
    !contextOverview ||
    !contextOverviewTitle ||
    !contextOverviewCaption ||
    !contextArticle ||
    !contextImage ||
    !contextKind ||
    !contextTitle ||
    !contextSubtitle ||
    !contextMeta ||
    !contextProse ||
    !contextSource ||
    !contextChoiceArtist ||
    !contextChoiceAlbum ||
    !contextChoiceTrack ||
    !coverContext ||
    !message ||
    !controls ||
    !playButton ||
    !previousButton ||
    !nextButton ||
    !modeButton ||
    !playIcon ||
    !pauseIcon ||
    !modeSequentialIcon ||
    !modeShuffleIcon ||
    !coverCurrent ||
    !coverIncoming ||
    !title ||
    !artist ||
    !album ||
    !position ||
    !currentTime ||
    !duration ||
    !progress ||
    !platter ||
    !tonearm ||
    !needle ||
    trackButtons.length !== tracks.length ||
    catalogContextButtons.length !== tracks.length ||
    tracks.length === 0;

  if (missing) {
    // The component markup changed; fail loudly so a stale page cannot run half-bound.
    console.warn("[music-player] component markup incomplete; player disabled");
    return {
      root,
      closePanel: () => undefined,
      destroy: () => undefined,
    };
  }

  const refs = {
    audio,
    panel,
    toggle,
    catalogToggle,
    nowPlaying,
    catalog,
    context,
    contextClose,
    contextBack,
    contextStatus,
    contextOverview,
    contextOverviewTitle,
    contextOverviewCaption,
    contextArticle,
    contextImage,
    contextKind,
    contextTitle,
    contextSubtitle,
    contextMeta,
    contextProse,
    contextSource,
    contextTriggers,
    contextChoices,
    contextChoiceArtist,
    contextChoiceAlbum,
    contextChoiceTrack,
    coverContext,
    message,
    trackButtons,
    catalogContextButtons,
    controls,
    playButton,
    previousButton,
    nextButton,
    modeButton,
    playIcon,
    pauseIcon,
    modeSequentialIcon,
    modeShuffleIcon,
    coverCurrent,
    coverIncoming,
    title,
    artist,
    album,
    position,
    currentTime,
    duration,
    progress,
    platter,
    tonearm,
    needle,
  };

  const state: PlayerState = {
    phase: "idle",
    desiredPlayback: "paused",
    playbackMode: loadPlaybackMode(),
    currentIndex: 0,
    pendingIndex: null,
    hasCommittedTrack: false,
    operationId: 0,
    coverRequestId: 0,
    activeProbe: null,
    pendingDraw: null,
    targetVolume: clamp(refs.audio.volume || 1, 0, 1),
    fadeFrame: 0,
    fadeResolve: null,
    progressFrame: 0,
    lastRenderedSecond: -1,
    randomBag: [],
    playHistory: [0],
    historyCursor: 0,
    coverState: "neutral",
    bufferTimer: 0,
    naturalEndTimer: 0,
    slowLoadTimer: 0,
    slowLoadHint: false,
    errorMessage: "",
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    catalogOpen: false,
    panelOpen: false,
    contextOpen: false,
    contextClosing: false,
    contextCloseTimer: 0,
    contextOverview: false,
    contextRequestId: 0,
  };

  // --- vinyl rotation -----------------------------------------------------

  const platterAnimation = refs.platter.animate(
    [{ transform: "rotate(0turn)" }, { transform: "rotate(1turn)" }],
    { duration: 12_000, iterations: Infinity, easing: "linear" },
  );
  platterAnimation.playbackRate = 0;
  if (state.reducedMotion) platterAnimation.pause();
  else platterAnimation.play();

  function ensurePlatterRunning(): void {
    if (state.reducedMotion) return;
    if (platterAnimation.playState !== "running") platterAnimation.play();
  }

  function rampPlatterRate(target: number, durationMs: number, operationId: number): Promise<void> {
    if (state.reducedMotion) {
      platterAnimation.playbackRate = target;
      return Promise.resolve();
    }
    const from = platterAnimation.playbackRate;
    if (from === target) return Promise.resolve();
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number): void => {
        if (!isCurrentOperation(operationId)) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - start) / durationMs);
        const eased = t * t * (3 - 2 * t);
        platterAnimation.playbackRate = from + (target - from) * eased;
        if (platterAnimation.playbackRate > 0 && platterAnimation.playState === "paused") {
          platterAnimation.play();
        }
        if (platterAnimation.playbackRate === 0 && platterAnimation.playState === "running") {
          platterAnimation.pause();
        }
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  // --- tonearm / needle ---------------------------------------------------

  function setArmAngle(degrees: number, smooth = false): void {
    if (smooth) refs.tonearm.classList.add("is-smooth");
    else refs.tonearm.classList.remove("is-smooth");
    refs.tonearm.style.transform = `rotate(${degrees}deg)`;
  }

  function setNeedle(mode: "up" | "hover" | "down"): void {
    refs.needle.dataset.needle = mode;
  }

  function progressToArmAngle(ratio: number): number {
    return ARM_OUTER_DEG + clamp(ratio, 0, 1) * (ARM_INNER_DEG - ARM_OUTER_DEG);
  }

  // --- operation tokens ---------------------------------------------------

  function isCurrentOperation(operationId: number): boolean {
    return operationId === state.operationId;
  }

  function cancelVolumeFade(): void {
    cancelAnimationFrame(state.fadeFrame);
    state.fadeFrame = 0;
    if (state.fadeResolve) {
      const resolveFade = state.fadeResolve;
      state.fadeResolve = null;
      resolveFade(false);
    }
  }

  function cancelBufferTimer(): void {
    clearTimeout(state.bufferTimer);
    state.bufferTimer = 0;
  }

  function cancelNaturalEndFade(): void {
    clearTimeout(state.naturalEndTimer);
    state.naturalEndTimer = 0;
  }

  function cancelSlowLoadHint(): void {
    clearTimeout(state.slowLoadTimer);
    state.slowLoadTimer = 0;
    state.slowLoadHint = false;
  }

  function cancelActiveProbe(): void {
    if (state.activeProbe) {
      const probe = state.activeProbe;
      state.activeProbe = null;
      try {
        probe.removeAttribute("src");
        probe.load();
      } catch {
        /* probe already released */
      }
    }
  }

  function beginOperation(desired: DesiredPlayback): number {
    state.operationId += 1;
    state.desiredPlayback = desired;
    cancelVolumeFade();
    cancelNaturalEndFade();
    cancelBufferTimer();
    cancelActiveProbe();
    return state.operationId;
  }

  // --- state rendering ----------------------------------------------------

  function updateMessage(): void {
    let text = "";
    if (state.phase === "error") {
      text = state.errorMessage || "这首音乐暂时无法播放，请选择其他曲目";
    } else if (state.phase === "buffering") {
      text = "网络较慢，仍在加载…";
    } else if ((state.phase === "starting" || state.phase === "switching") && state.slowLoadHint) {
      text = "网络较慢，仍在加载…";
    } else if (state.phase === "starting" || state.phase === "switching") {
      text = "正在准备…";
    }
    refs.message.textContent = text;
  }

  function renderState(reason: string): void {
    void reason; // descriptive for call sites; the data attributes carry the state
    const phase = state.phase;
    root.dataset.phase = phase;
    root.dataset.playbackMode = state.playbackMode;
    root.dataset.coverState = state.coverState;

    const isPlaying = phase === "playing";
    root.classList.toggle("is-playing", isPlaying);
    refs.playIcon.hidden = isPlaying;
    refs.pauseIcon.hidden = !isPlaying;
    refs.playButton.setAttribute("aria-label", isPlaying ? "暂停" : "播放");

    const isShuffle = state.playbackMode === "shuffle";
    refs.modeSequentialIcon.hidden = isShuffle;
    refs.modeShuffleIcon.hidden = !isShuffle;
    refs.modeButton.setAttribute("aria-pressed", String(isShuffle));
    const modeLabel = isShuffle ? "当前为随机播放，点击切换为顺序播放" : "当前为顺序播放，点击切换为随机播放";
    refs.modeButton.setAttribute("aria-label", modeLabel);
    refs.modeButton.setAttribute("title", modeLabel);

    refs.controls.setAttribute("aria-busy", String(phase === "buffering"));
    updateMessage();

    switch (phase) {
      case "idle":
      case "ready":
      case "error":
        setNeedle("up");
        setArmAngle(ARM_PARKED_DEG, true);
        break;
      case "pausing":
      case "paused":
      case "switching":
        setNeedle("up");
        break;
      case "starting":
      case "buffering":
        setNeedle("hover");
        break;
      case "playing":
        setNeedle("down");
        break;
    }
  }

  function setPhase(next: PlaybackPhase, reason: string): void {
    if (state.phase === next) return;
    state.phase = next;
    renderState(reason);
  }

  // --- catalog / context / panel ------------------------------------------

  let contextPayloadPromise: Promise<MusicContextPayload> | null = null;
  let activeCatalogContextButton: HTMLButtonElement | null = null;

  function renderPanelSurface(): void {
    const contextVisible = state.contextOpen || state.contextClosing;
    refs.context.hidden = !contextVisible;
    refs.catalog.hidden = contextVisible || !state.catalogOpen;
    refs.nowPlaying.hidden = contextVisible || state.catalogOpen;
    refs.catalogToggle.setAttribute("aria-expanded", String(state.catalogOpen && !contextVisible));
    root.classList.toggle("is-catalog-open", state.catalogOpen && !contextVisible);
    root.classList.toggle("is-context-open", contextVisible);
  }

  function cancelContextCloseTransition(): void {
    clearTimeout(state.contextCloseTimer);
    state.contextCloseTimer = 0;
    state.contextClosing = false;
    refs.context.classList.remove("is-closing");
  }

  function setCatalogOpen(isOpen: boolean): void {
    state.catalogOpen = isOpen;
    refs.catalogToggle.setAttribute("aria-label", isOpen ? "关闭音乐目录" : "打开音乐目录");
    renderPanelSurface();
  }

  function closeCatalog(): void {
    if (state.catalogOpen) setCatalogOpen(false);
  }

  function syncContextOverviewTargets(track: Track): void {
    refs.contextOverviewTitle.textContent = track.title;
    refs.contextOverviewCaption.textContent = `${track.artist} · ${track.album}`;
    refs.contextChoiceArtist.textContent = track.artist;
    refs.contextChoiceAlbum.textContent = track.album;
    refs.contextChoiceTrack.textContent = track.title;
    refs.contextChoices.forEach((choice) => {
      const kind = choice.dataset.contextKind as MusicContextKind | undefined;
      if (kind === "artist") choice.dataset.contextId = track.context.artistId;
      if (kind === "album") {
        choice.dataset.contextId = track.context.albumId;
        choice.dataset.contextImage = track.cover;
      }
      if (kind === "track") {
        choice.dataset.contextId = track.context.trackId;
        choice.dataset.contextImage = track.cover;
      }
    });
  }

  function syncContextTargets(track: Track): void {
    refs.title.dataset.contextId = track.context.trackId;
    refs.title.dataset.contextImage = track.cover;
    refs.title.setAttribute("aria-label", `查看《${track.title}》曲目背景`);
    refs.artist.dataset.contextId = track.context.artistId;
    refs.artist.removeAttribute("data-context-image");
    refs.artist.setAttribute("aria-label", `查看 ${track.artist} 人物介绍`);
    refs.album.dataset.contextId = track.context.albumId;
    refs.album.dataset.contextImage = track.cover;
    refs.album.setAttribute("aria-label", `查看《${track.album}》专辑背景`);
    refs.coverContext.dataset.contextId = track.context.albumId;
    refs.coverContext.dataset.contextImage = track.cover;
    refs.coverContext.setAttribute("aria-label", `查看《${track.album}》专辑背景`);
    syncContextOverviewTargets(track);
  }

  function focusContextOrigin(): void {
    if (state.catalogOpen && activeCatalogContextButton) activeCatalogContextButton.focus();
    else refs.title.focus();
  }

  function loadContextPayload(): Promise<MusicContextPayload> {
    if (contextPayloadPromise) return contextPayloadPromise;
    const apiUrl = root.dataset.contextApi;
    if (!apiUrl) return Promise.reject(new Error("Missing music context API URL"));
    contextPayloadPromise = fetch(apiUrl, { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Music context API returned ${response.status}`);
        const payload = await response.json() as MusicContextPayload;
        if (payload.schemaVersion !== 1) throw new Error("Unsupported music context schema");
        return payload;
      })
      .catch((error) => {
        contextPayloadPromise = null;
        throw error;
      });
    return contextPayloadPromise;
  }

  function showContextOverview(): void {
    cancelContextCloseTransition();
    state.contextOpen = true;
    state.contextOverview = true;
    state.contextRequestId += 1;
    refs.contextStatus.textContent = "";
    refs.contextOverview.hidden = false;
    refs.contextArticle.hidden = true;
    refs.contextBack.hidden = true;
    renderPanelSurface();
  }

  function closeContext(onClosed?: () => void, instant = false): void {
    if (!state.contextOpen && !state.contextClosing) return;
    clearTimeout(state.contextCloseTimer);
    state.contextOpen = false;
    state.contextClosing = !instant && !state.reducedMotion;
    state.contextOverview = false;
    state.contextRequestId += 1;
    refs.contextStatus.textContent = "";
    refs.context.classList.toggle("is-closing", state.contextClosing);
    renderPanelSurface();

    const finish = (): void => {
      if (state.contextOpen) return;
      refs.contextOverview.hidden = true;
      refs.contextArticle.hidden = true;
      refs.contextBack.hidden = true;
      state.contextClosing = false;
      state.contextCloseTimer = 0;
      refs.context.classList.remove("is-closing");
      renderPanelSurface();
      onClosed?.();
    };
    if (state.contextClosing) state.contextCloseTimer = window.setTimeout(finish, CONTEXT_EXIT_MS);
    else finish();
  }

  function findContextEntity(payload: MusicContextPayload, kind: MusicContextKind, id: string): MusicContextEntity | undefined {
    if (kind === "artist") return payload.artists.find((entry) => entry.id === id);
    if (kind === "album") return payload.albums.find((entry) => entry.id === id);
    return payload.tracks.find((entry) => entry.id === id);
  }

  function renderContextEntity(entity: MusicContextEntity, fallbackImage: string): void {
    const titleText = entity.name ?? entity.title ?? entity.id;
    const kindLabels: Record<MusicContextKind, string> = {
      artist: "Musician · 音乐家",
      album: "Album · 专辑",
      track: "Track · 曲目",
    };
    refs.contextKind.textContent = kindLabels[entity.kind];
    refs.contextTitle.textContent = titleText;
    refs.contextSubtitle.textContent = entity.subtitle ?? "";
    refs.contextSubtitle.hidden = !entity.subtitle;

    const imageSrc = entity.image || fallbackImage;
    if (imageSrc) {
      refs.contextImage.src = imageSrc;
      refs.contextImage.alt = entity.kind === "artist" ? `${titleText} 照片` : `${titleText} 背景插图`;
      refs.contextImage.hidden = false;
    } else {
      refs.contextImage.removeAttribute("src");
      refs.contextImage.alt = "";
      refs.contextImage.hidden = true;
    }

    refs.contextMeta.replaceChildren(...entity.meta.map(({ label, value }) => {
      const group = document.createElement("div");
      const term = document.createElement("dt");
      const description = document.createElement("dd");
      term.textContent = label;
      description.textContent = value;
      group.append(term, description);
      return group;
    }));
    refs.contextMeta.hidden = entity.meta.length === 0;

    refs.contextProse.replaceChildren(...entity.paragraphs.map((paragraph) => {
      const element = document.createElement("p");
      element.textContent = paragraph;
      return element;
    }));
    refs.contextSource.href = entity.sourceUrl;
  }

  async function showContextDetail(kind: MusicContextKind, id: string, fallbackImage = "", fromOverview = false): Promise<void> {
    cancelContextCloseTransition();
    state.contextOpen = true;
    state.contextOverview = false;
    const requestId = ++state.contextRequestId;
    refs.contextOverview.hidden = true;
    refs.contextArticle.hidden = true;
    refs.contextBack.hidden = !fromOverview;
    refs.contextStatus.textContent = "正在从音乐仓库读取背景资料…";
    renderPanelSurface();

    try {
      const payload = await loadContextPayload();
      if (requestId !== state.contextRequestId || !state.contextOpen) return;
      const entity = findContextEntity(payload, kind, id);
      if (!entity) throw new Error(`Unknown music context: ${kind}/${id}`);
      renderContextEntity(entity, fallbackImage);
      refs.contextStatus.textContent = "";
      refs.contextArticle.hidden = false;
    } catch (error) {
      if (requestId !== state.contextRequestId || !state.contextOpen) return;
      console.error("[music-player] failed to load background notes", error);
      refs.contextStatus.textContent = "背景资料暂时无法读取，请稍后重试。";
    }
  }

  function openPanel(): void {
    state.panelOpen = true;
    refs.panel.hidden = false;
    refs.toggle.setAttribute("aria-expanded", "true");
    refs.toggle.setAttribute("aria-label", "收起背景音乐");
    if (!state.hasCommittedTrack) void requestPlay();
  }

  function closePanel(): void {
    closeContext(undefined, true);
    closeCatalog();
    state.panelOpen = false;
    refs.panel.hidden = true;
    refs.toggle.setAttribute("aria-expanded", "false");
    refs.toggle.setAttribute("aria-label", "打开背景音乐");
  }

  // --- time & progress ----------------------------------------------------

  function updateTimeText(elapsed: number, total: number): void {
    refs.currentTime.textContent = formatTime(elapsed);
    refs.duration.textContent = total > 0 ? formatTime(total) : "--:--";
    state.lastRenderedSecond = Math.floor(elapsed);
  }

  function updateProgressDom(ratio: number, elapsed: number, total: number): void {
    const safeRatio = clamp(ratio, 0, 1);
    refs.progress.style.setProperty("--progress", `${safeRatio * 100}%`);
    setArmAngle(progressToArmAngle(safeRatio));
    if (Math.floor(elapsed) !== state.lastRenderedSecond) updateTimeText(elapsed, total);
  }

  function syncProgressFallback(): void {
    const elapsed = finiteOrZero(refs.audio.currentTime);
    const total = finiteOrZero(refs.audio.duration);
    const ratio = total > 0 ? elapsed / total : 0;
    updateProgressDom(ratio, elapsed, total);
  }

  function progressTick(): void {
    if (state.phase !== "playing") return;
    const elapsed = finiteOrZero(refs.audio.currentTime);
    const total = finiteOrZero(refs.audio.duration);
    const ratio = total > 0 ? elapsed / total : 0;
    updateProgressDom(ratio, elapsed, total);
    state.progressFrame = requestAnimationFrame(progressTick);
  }

  function startProgressLoop(): void {
    cancelAnimationFrame(state.progressFrame);
    state.progressFrame = requestAnimationFrame(progressTick);
  }

  function stopProgressLoop(): void {
    cancelAnimationFrame(state.progressFrame);
    state.progressFrame = 0;
  }

  function scheduleNaturalEndFade(): void {
    clearTimeout(state.naturalEndTimer);
    if (state.phase !== "playing" || state.desiredPlayback !== "playing") return;
    const remainingMs = (finiteOrZero(refs.audio.duration) - finiteOrZero(refs.audio.currentTime)) * 1000;
    const delay = remainingMs - PLAYBACK_TRANSITION_MS;
    if (Number.isFinite(delay) && delay > 0) {
      state.naturalEndTimer = window.setTimeout(() => {
        void startNaturalEndFade();
      }, delay);
    }
  }

  async function startNaturalEndFade(): Promise<void> {
    const operationId = state.operationId;
    if (state.phase !== "playing" || state.desiredPlayback !== "playing") return;
    await Promise.all([
      fadeVolume(0, PLAYBACK_TRANSITION_MS, operationId),
      rampPlatterRate(0, PLAYBACK_TRANSITION_MS, operationId),
    ]);
  }

  // --- volume fade --------------------------------------------------------

  function fadeVolume(to: number, durationMs: number, operationId: number): Promise<boolean> {
    return new Promise((resolve) => {
      cancelAnimationFrame(state.fadeFrame);
      const from = refs.audio.volume;
      const start = performance.now();
      state.fadeResolve = resolve;
      const tick = (now: number): void => {
        if (!isCurrentOperation(operationId)) {
          state.fadeFrame = 0;
          state.fadeResolve = null;
          resolve(false);
          return;
        }
        const t = Math.min(1, (now - start) / durationMs);
        const eased = t * t * (3 - 2 * t); // smoothstep
        refs.audio.volume = clamp(from + (to - from) * eased, 0, state.targetVolume);
        if (t < 1) {
          state.fadeFrame = requestAnimationFrame(tick);
        } else {
          state.fadeFrame = 0;
          state.fadeResolve = null;
          resolve(true);
        }
      };
      state.fadeFrame = requestAnimationFrame(tick);
    });
  }

  function ensureVolumeConsistent(): void {
    if (state.phase === "playing" && state.fadeFrame === 0) {
      if (Math.abs(refs.audio.volume - state.targetVolume) > 0.02) {
        void fadeVolume(state.targetVolume, 160, state.operationId);
      }
    }
  }

  // --- cover preload & swap -----------------------------------------------

  async function prepareCover(track: Track, operationId: number): Promise<CoverResult> {
    const requestId = ++state.coverRequestId;
    const image = new Image();
    image.decoding = "async";
    image.src = track.cover;
    try {
      await image.decode();
      if (!isCurrentOperation(operationId) || requestId !== state.coverRequestId) return { kind: "stale" };
      return { kind: "image", src: track.cover };
    } catch {
      // Some Safari builds reject decode() even for usable images.
      if (image.complete && image.naturalWidth > 0) {
        if (!isCurrentOperation(operationId) || requestId !== state.coverRequestId) return { kind: "stale" };
        return { kind: "image", src: track.cover };
      }
      if (!isCurrentOperation(operationId)) return { kind: "stale" };
      return { kind: "fallback" };
    }
  }

  function promoteIncomingCover(): void {
    refs.coverCurrent.src = refs.coverIncoming.src;
    refs.coverCurrent.classList.add("is-visible");
    refs.coverIncoming.classList.remove("is-visible");
    refs.coverIncoming.removeAttribute("src");
    refs.coverIncoming.hidden = true;
  }

  function swapCover(result: CoverResult): void {
    if (result.kind === "stale") return;
    if (result.kind === "image") {
      state.coverState = "ready";
      const incoming = refs.coverIncoming;
      incoming.src = result.src;
      incoming.hidden = false;
      const beginCrossfade = (): void => {
        refs.coverCurrent.classList.remove("is-visible");
        incoming.classList.add("is-visible");
        window.setTimeout(() => promoteIncomingCover(), 190);
      };
      if (incoming.complete && incoming.naturalWidth > 0) beginCrossfade();
      else incoming.addEventListener("load", beginCrossfade, { once: true });
    } else {
      state.coverState = "fallback";
      refs.coverCurrent.classList.remove("is-visible");
    }
    renderState("cover-swap");
  }

  // --- audio probe --------------------------------------------------------

  function prepareAudioProbe(track: Track, operationId: number): Promise<AudioProbeResult> {
    cancelActiveProbe();
    const probe = new Audio();
    probe.preload = "auto";
    probe.src = track.audio;
    state.activeProbe = probe;
    return new Promise((resolve) => {
      let settled = false;
      const settle = (kind: AudioProbeResult): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (state.activeProbe === probe) state.activeProbe = null;
        resolve(kind);
      };
      const valid = (): boolean => isCurrentOperation(operationId) && state.activeProbe === probe;
      probe.addEventListener("loadedmetadata", () => {
        if (valid()) settle({ kind: "ok" });
      });
      probe.addEventListener("canplay", () => {
        if (valid()) settle({ kind: "ok" });
      });
      probe.addEventListener("error", () => {
        if (valid()) settle({ kind: "error" });
      });
      const timeout = window.setTimeout(() => settle({ kind: "ok" }), STALL_TIMEOUT_MS);
      probe.load();
    });
  }

  // --- sequential / shuffle selection -------------------------------------

  function applyHistoryPolicy(policy: HistoryPolicy, index: number): void {
    if (policy === "reset") {
      state.playHistory = [index];
      state.historyCursor = 0;
      return;
    }
    if (policy === "move-cursor") {
      const position = state.playHistory.indexOf(index);
      if (position >= 0) state.historyCursor = position;
      return;
    }
    state.playHistory = state.playHistory.slice(0, state.historyCursor + 1);
    state.playHistory.push(index);
    state.historyCursor = state.playHistory.length - 1;
  }

  function resolveNextSelection(baseIndex: number): { index: number; policy: HistoryPolicy } {
    if (state.playbackMode === "shuffle") {
      if (state.historyCursor < state.playHistory.length - 1) {
        const nextHistoryIndex = state.historyCursor + 1;
        return { index: state.playHistory[nextHistoryIndex], policy: "move-cursor" };
      }
      if (state.randomBag.length === 0) state.randomBag = createRandomBag(baseIndex);
      const drawn = state.randomBag.shift();
      if (drawn === undefined) return { index: baseIndex, policy: "reset" };
      state.pendingDraw = drawn;
      return { index: drawn, policy: "append" };
    }
    return { index: (baseIndex + 1) % tracks.length, policy: "append" };
  }

  function resolvePreviousSelection(baseIndex: number): { index: number; policy: HistoryPolicy } {
    if (state.playbackMode === "shuffle") {
      if (state.historyCursor > 0) {
        const previousHistoryIndex = state.historyCursor - 1;
        return { index: state.playHistory[previousHistoryIndex], policy: "move-cursor" };
      }
      return { index: baseIndex, policy: "reset" };
    }
    return { index: (baseIndex - 1 + tracks.length) % tracks.length, policy: "append" };
  }

  function pressFeedback(button: HTMLButtonElement): void {
    button.classList.add("is-pressed");
    window.setTimeout(() => button.classList.remove("is-pressed"), 160);
  }

  // --- switch / pause / resume flows --------------------------------------

  function commitTrack(
    targetIndex: number,
    historyPolicy: HistoryPolicy,
    coverResult: CoverResult,
  ): void {
    state.currentIndex = targetIndex;
    state.pendingIndex = null;
    state.pendingDraw = null;
    state.hasCommittedTrack = true;
    state.errorMessage = "";
    cancelSlowLoadHint();

    const track = tracks[targetIndex];
    refs.audio.volume = 0; // mute before swapping sources
    refs.audio.src = track.audio;
    refs.audio.load();

    refs.title.textContent = track.title;
    refs.artist.textContent = track.artist;
    refs.album.textContent = track.album;
    syncContextTargets(track);
    refs.position.textContent = `${targetIndex + 1}/${tracks.length}`;
    refs.duration.textContent = "--:--";
    refs.currentTime.textContent = "0:00";
    state.lastRenderedSecond = -1;
    refs.progress.style.setProperty("--progress", "0%");
    refs.trackButtons.forEach((button, index) => {
      if (index === targetIndex) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });

    applyHistoryPolicy(historyPolicy, targetIndex);
    swapCover(coverResult);

    setPhase("starting", "commit-track");
    setNeedle("hover");
    setArmAngle(ARM_OUTER_DEG, true);
  }

  async function selectTrack(
    targetIndex: number,
    source: "previous" | "next" | "catalog" | "ended",
    historyPolicy: HistoryPolicy,
  ): Promise<void> {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= tracks.length) return;
    if (targetIndex === state.currentIndex) {
      if (source === "catalog") {
        closeCatalog();
        return;
      }
      // single-track wrap (previous/next/ended) restarts the current track
      restartCurrentTrack();
      return;
    }

    const operationId = beginOperation("playing");
    if (state.pendingDraw !== null) {
      // an uncommitted draw from a superseded next click returns to the bag
      state.randomBag.push(state.pendingDraw);
      state.pendingDraw = null;
    }
    state.errorMessage = "";
    state.pendingIndex = targetIndex;
    cancelSlowLoadHint();
    setPhase("switching", `switch-${source}`);
    setNeedle("up");
    setArmAngle(ARM_PARKED_DEG, true);

    if (source === "catalog" && state.playbackMode === "shuffle") {
      const bagPosition = state.randomBag.indexOf(targetIndex);
      if (bagPosition >= 0) state.randomBag.splice(bagPosition, 1);
    }

    const target = tracks[targetIndex];
    const fadePromise = fadeVolume(0, PLAYBACK_TRANSITION_MS, operationId);
    const platterPromise = rampPlatterRate(0, PLAYBACK_TRANSITION_MS, operationId);
    const coverPromise = prepareCover(target, operationId);
    const probePromise = prepareAudioProbe(target, operationId);

    state.slowLoadTimer = window.setTimeout(() => {
      if (isCurrentOperation(operationId) && (state.phase === "starting" || state.phase === "switching")) {
        state.slowLoadHint = true;
        updateMessage();
      }
    }, SLOW_LOAD_MS);

    await Promise.all([fadePromise, platterPromise]);
    if (!isCurrentOperation(operationId)) return;
    if (!refs.audio.paused && state.desiredPlayback === "playing") refs.audio.pause();

    const coverResult = await coverPromise;
    if (!isCurrentOperation(operationId)) return;

    const probeResult = await probePromise;
    if (!isCurrentOperation(operationId)) return;

    if (probeResult.kind === "error") {
      handleSwitchProbeError(operationId);
      return;
    }

    commitTrack(targetIndex, historyPolicy, coverResult);
    if (source === "catalog") closeCatalog();
  }

  function handleSwitchProbeError(operationId: number): void {
    state.pendingIndex = null;
    state.pendingDraw = null;
    state.desiredPlayback = "paused";
    state.errorMessage = "这首音乐暂时无法播放，请选择其他曲目";
    setPhase("error", "probe-error");
    setNeedle("up");
    setArmAngle(ARM_PARKED_DEG, true);
    void rampPlatterRate(0, 360, operationId);
    // The main audio still holds the old (paused) track; restoring volume is
    // safe and must not start sound.
    refs.audio.volume = state.targetVolume;
  }

  async function requestPause(): Promise<void> {
    if (state.phase === "idle" || state.phase === "ready" || state.phase === "error") return;
    const operationId = beginOperation("paused");
    setPhase("pausing", "user-pause");
    setNeedle("up");
    cancelNaturalEndFade();
    const [faded] = await Promise.all([
      fadeVolume(0, PLAYBACK_TRANSITION_MS, operationId),
      rampPlatterRate(0, PLAYBACK_TRANSITION_MS, operationId),
    ]);
    if (!faded) return;
    if (!refs.audio.paused) refs.audio.pause();
    stopProgressLoop();
    if (!isCurrentOperation(operationId)) return;
    setPhase("paused", "fade-complete");
  }

  async function resumePlaybackFlow(source: string, forcedOperationId?: number): Promise<void> {
    if (forcedOperationId === undefined) beginOperation("playing");
    setPhase("starting", `resume-${source}`);
    setNeedle("hover");
    cancelNaturalEndFade();
    cancelSlowLoadHint();
    refs.audio.volume = 0;
    void playCurrentNow();
  }

  async function playCurrentNow(): Promise<void> {
    const operationId = state.operationId;
    setNeedle("hover");
    try {
      await refs.audio.play();
    } catch (error) {
      if (!isCurrentOperation(operationId)) return;
      handlePlayRejection(error, operationId);
    }
  }

  function handlePlayRejection(error: unknown, operationId: number): void {
    const mediaError = error as { name?: string };
    if (mediaError?.name === "NotAllowedError" || mediaError?.name === "AbortError") {
      if (!isCurrentOperation(operationId)) return;
      state.desiredPlayback = "paused";
      setNeedle("up");
      void rampPlatterRate(0, 300, operationId);
      setPhase("ready", "play-rejected");
      return;
    }
    handleAudioError();
  }

  function restartCurrentTrack(): void {
    if (!state.hasCommittedTrack) {
      void requestPlay();
      return;
    }
    beginOperation("playing");
    state.errorMessage = "";
    state.pendingIndex = null;
    cancelNaturalEndFade();
    cancelSlowLoadHint();
    setPhase("starting", "restart");
    setNeedle("hover");
    setArmAngle(ARM_OUTER_DEG, true);
    refs.audio.volume = 0;
    refs.audio.currentTime = 0;
    syncProgressFallback();
    void playCurrentNow();
  }

  function requestPlay(): void {
    const operationId = beginOperation("playing");
    state.errorMessage = "";
    if (!state.hasCommittedTrack) {
      commitInitialTrack(operationId, chooseRandomTrackIndex());
      return;
    }
    if (state.phase === "error") {
      // one retry for the current track, then the controller stays recoverable
      refs.audio.load();
      setPhase("starting", "error-retry");
      setNeedle("hover");
      refs.audio.volume = 0;
      // canplay on the main audio gates the retry (handleCanPlay)
      return;
    }
    void resumePlaybackFlow("user", operationId);
  }

  function commitInitialTrack(operationId: number, targetIndex: number): void {
    state.hasCommittedTrack = true;
    state.currentIndex = targetIndex;
    state.pendingIndex = null;
    state.errorMessage = "";
    cancelSlowLoadHint();

    // The first play draws a random track, so drop any previously shown cover
    // (the first album's) and keep the neutral RY placeholder on the platter
    // while the randomly drawn track's artwork is still loading.
    state.coverState = "neutral";
    refs.coverCurrent.classList.remove("is-visible");
    refs.coverCurrent.removeAttribute("src");

    const track = tracks[targetIndex];
    refs.audio.volume = 0;
    refs.audio.src = track.audio;
    refs.audio.load();

    refs.title.textContent = track.title;
    refs.artist.textContent = track.artist;
    refs.album.textContent = track.album;
    syncContextTargets(track);
    refs.position.textContent = `${targetIndex + 1}/${tracks.length}`;
    refs.duration.textContent = "--:--";
    refs.currentTime.textContent = "0:00";
    state.lastRenderedSecond = -1;
    refs.progress.style.setProperty("--progress", "0%");
    refs.trackButtons.forEach((button, index) => {
      if (index === targetIndex) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    applyHistoryPolicy("reset", targetIndex);
    state.randomBag = state.playbackMode === "shuffle" ? createRandomBag(targetIndex) : [];

    void prepareCover(track, operationId).then((result) => {
      if (!isCurrentOperation(operationId)) return;
      swapCover(result);
    });

    setPhase("starting", "first-play");
    setNeedle("hover");
    setArmAngle(ARM_OUTER_DEG, true);
    // canplay on the main audio gates actual playback (handleCanPlay).
  }

  // --- audio events -------------------------------------------------------

  function handleLoadStart(): void {
    // keep the current phase while a new source is requested
    if (state.phase === "switching" || state.phase === "starting") renderState("load-start");
  }

  function handlePlay(): void {
    // 'play' alone does not mean stable playback; 'playing' does the real work.
    cancelBufferTimer();
  }

  function handlePlaying(): void {
    if (state.desiredPlayback !== "playing") {
      if (!refs.audio.paused) refs.audio.pause();
      return;
    }
    if (state.phase === "error" || state.phase === "idle" || state.phase === "ready") return;
    cancelBufferTimer();
    cancelNaturalEndFade();
    cancelSlowLoadHint();
    stopProgressLoop();
    setPhase("playing", "audio-playing");
    setNeedle("down");
    ensurePlatterRunning();
    const operationId = state.operationId;
    void Promise.all([
      fadeVolume(state.targetVolume, PLAYBACK_TRANSITION_MS, operationId),
      rampPlatterRate(1, PLAYBACK_TRANSITION_MS, operationId),
    ]).then(([faded]) => {
      if (faded) {
        scheduleNaturalEndFade();
        ensureVolumeConsistent();
      }
    });
    startProgressLoop();
  }

  function handlePause(): void {
    if (state.phase === "switching") return; // deliberate pause of the old track mid-switch
    if (state.phase === "error") return;
    if (state.desiredPlayback === "playing" && state.phase !== "pausing") {
      // paused unexpectedly (browser autopause, tab throttling): follow reality
      state.desiredPlayback = "paused";
    }
    stopProgressLoop();
    setPhase("paused", "audio-pause");
    setNeedle("up");
  }

  function scheduleBuffering(): void {
    if (state.desiredPlayback !== "playing") return;
    if (state.phase === "switching") return;
    cancelBufferTimer();
    state.bufferTimer = window.setTimeout(() => {
      if (state.desiredPlayback !== "playing") return;
      if (state.phase === "switching") return;
      enterBuffering();
    }, BUFFER_THRESHOLD_MS);
  }

  function enterBuffering(): void {
    setPhase("buffering", "buffer-start");
    stopProgressLoop();
    syncProgressFallback();
    setNeedle("hover");
    const operationId = state.operationId;
    void rampPlatterRate(0.28, 450, operationId);
    if (refs.audio.volume > state.targetVolume * 0.72) {
      void fadeVolume(state.targetVolume * 0.72, 200, operationId);
    }
    state.slowLoadTimer = window.setTimeout(() => {
      if (isCurrentOperation(operationId) && state.phase === "buffering") {
        state.slowLoadHint = true;
        updateMessage();
      }
    }, SLOW_LOAD_MS);
  }

  function handleCanPlay(): void {
    cancelBufferTimer();
    if (state.desiredPlayback !== "playing") return;
    if (state.phase === "starting" && state.hasCommittedTrack) {
      void playCurrentNow();
    }
  }

  function handleEnded(): void {
    if (state.phase === "error") return;
    const operationId = ++state.operationId;
    state.desiredPlayback = "paused";
    cancelVolumeFade();
    cancelNaturalEndFade();
    cancelBufferTimer();
    cancelSlowLoadHint();
    cancelActiveProbe();
    stopProgressLoop();
    setNeedle("up");
    setArmAngle(ARM_INNER_DEG, true); // near the inner groove before the lift
    window.setTimeout(() => {
      if (isCurrentOperation(operationId)) setArmAngle(ARM_PARKED_DEG, true);
    }, 260);
    void rampPlatterRate(0, PLAYBACK_TRANSITION_MS, operationId);

    const selection = resolveNextSelection(state.currentIndex);
    if (selection.index === state.currentIndex) {
      // single-track catalog: restart from the top after a short beat
      window.setTimeout(() => {
        if (isCurrentOperation(operationId)) void restartCurrentTrack();
      }, 520);
      return;
    }
    state.pendingIndex = selection.index;
    void selectTrack(selection.index, "ended", selection.policy);
  }

  function handleAudioError(): void {
    state.operationId += 1;
    state.desiredPlayback = "paused";
    state.pendingIndex = null;
    state.pendingDraw = null;
    cancelVolumeFade();
    cancelNaturalEndFade();
    cancelBufferTimer();
    cancelSlowLoadHint();
    cancelActiveProbe();
    stopProgressLoop();
    if (!refs.audio.paused) refs.audio.pause();
    setNeedle("up");
    setArmAngle(ARM_PARKED_DEG, true);
    void rampPlatterRate(0, 360, state.operationId);
    state.errorMessage = "这首音乐暂时无法播放，请选择其他曲目";
    setPhase("error", "audio-error");
    syncProgressFallback();
  }

  function syncDuration(): void {
    const total = finiteOrZero(refs.audio.duration);
    if (total > 0) refs.duration.textContent = formatTime(total);
    scheduleNaturalEndFade();
    if (state.phase !== "playing") syncProgressFallback();
  }

  // --- modes & system -----------------------------------------------------

  function togglePlaybackMode(): void {
    const nextMode = state.playbackMode === "sequential" ? "shuffle" : "sequential";
    state.playbackMode = nextMode;
    try {
      localStorage.setItem(PLAYBACK_MODE_KEY, nextMode);
    } catch {
      /* persistence is best-effort */
    }
    state.randomBag = nextMode === "shuffle" ? createRandomBag(state.currentIndex) : [];
    state.playHistory = [state.currentIndex];
    state.historyCursor = 0;
    state.pendingDraw = null;
    refs.modeButton.classList.add("is-flipping");
    window.setTimeout(() => refs.modeButton.classList.remove("is-flipping"), 160);
    renderState("mode");
  }

  function handleEscape(event: KeyboardEvent): void {
    if (event.key !== "Escape" || !state.panelOpen) return;
    if (state.contextOpen) {
      closeContext(focusContextOrigin);
      return;
    }
    if (state.catalogOpen) {
      setCatalogOpen(false);
      refs.catalogToggle.focus();
      return;
    }
    closePanel();
    refs.toggle.focus();
  }

  function handleReducedMotionChange(): void {
    if (state.reducedMotion) {
      platterAnimation.pause();
      renderState("reduced-motion");
    } else {
      ensurePlatterRunning();
      if (state.phase === "playing" || state.phase === "starting" || state.phase === "buffering") {
        void rampPlatterRate(1, 300, state.operationId);
      }
      renderState("reduced-motion");
    }
  }

  function syncAfterVisibility(): void {
    if (document.visibilityState !== "visible") {
      stopProgressLoop();
      return;
    }
    stopProgressLoop();
    cancelBufferTimer();
    cancelNaturalEndFade();
    const realPlaying = !refs.audio.paused && refs.audio.readyState >= 3;
    if (realPlaying) {
      state.desiredPlayback = "playing";
      setPhase("playing", "visibility-rebuild");
      setNeedle("down");
      ensurePlatterRunning();
      syncProgressFallback();
      startProgressLoop();
    } else if (state.desiredPlayback === "playing") {
      // audio got paused while the tab was hidden (e.g. browser autopause)
      state.desiredPlayback = "paused";
      setPhase("paused", "visibility-autopaused");
      setNeedle("up");
      void rampPlatterRate(0, 240, state.operationId);
      syncProgressFallback();
    } else {
      setPhase("paused", "visibility-rebuild");
      setNeedle("up");
      syncProgressFallback();
    }
  }

  // --- initial bind -------------------------------------------------------

  function restorePersistedState(): void {
    // A persisted <audio> may already be playing after a view transition.
    const hasSource = Boolean(refs.audio.currentSrc);
    const trackIndex = (() => {
      const current = refs.audio.currentSrc || refs.audio.src;
      if (!current) return 0;
      const index = tracks.findIndex((track) => canonicalAudioPath(track.audio) === canonicalAudioPath(current));
      return index >= 0 ? index : 0;
    })();
    state.currentIndex = trackIndex;
    state.panelOpen = !refs.panel.hidden;
    state.catalogOpen = !refs.catalog.hidden;
    // A cover counts as ready only once a track is actually committed; before
    // the first play the platter keeps the neutral RY placeholder.
    state.coverState = hasSource && refs.coverCurrent.src ? "ready" : "neutral";
    if (state.coverState === "ready") refs.coverCurrent.classList.add("is-visible");
    refs.position.textContent = `${trackIndex + 1}/${tracks.length}`;
    syncContextTargets(tracks[trackIndex]);
    refs.trackButtons.forEach((button, index) => {
      if (index === trackIndex) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    setCatalogOpen(state.catalogOpen);

    if (hasSource) {
      state.hasCommittedTrack = true;
      if (!refs.audio.paused) {
        state.desiredPlayback = "playing";
        setPhase("playing", "init-persisted");
        setNeedle("down");
        ensurePlatterRunning();
        syncProgressFallback();
        startProgressLoop();
      } else {
        state.desiredPlayback = "paused";
        setPhase("paused", "init-persisted");
        setNeedle("up");
        syncProgressFallback();
      }
    } else {
      setPhase("idle", "init");
    }
  }

  function bindEvents(): void {
    refs.toggle.addEventListener("click", () => {
      if (state.panelOpen) closePanel();
      else openPanel();
    });

    refs.catalogToggle.addEventListener("click", () => {
      if (state.contextOpen) closeContext();
      else setCatalogOpen(!state.catalogOpen);
    });

    refs.contextTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const kind = trigger.dataset.contextKind as MusicContextKind | undefined;
        const id = trigger.dataset.contextId;
        if (!kind || !id) return;
        activeCatalogContextButton = null;
        void showContextDetail(kind, id, trigger.dataset.contextImage ?? "");
      });
    });

    refs.catalogContextButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.trackIndex);
        const track = tracks[index];
        if (!Number.isInteger(index) || !track) return;
        activeCatalogContextButton = button;
        syncContextOverviewTargets(track);
        showContextOverview();
      });
    });

    refs.contextChoices.forEach((choice) => {
      choice.addEventListener("click", () => {
        const kind = choice.dataset.contextKind as MusicContextKind | undefined;
        const id = choice.dataset.contextId;
        if (!kind || !id) return;
        void showContextDetail(kind, id, choice.dataset.contextImage ?? "", true);
      });
    });

    refs.contextClose.addEventListener("click", () => {
      closeContext(focusContextOrigin);
    });

    refs.contextBack.addEventListener("click", () => {
      showContextOverview();
      refs.contextChoices[0]?.focus();
    });

    refs.trackButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.trackIndex);
        if (!Number.isInteger(index) || !tracks[index]) return;
        void selectTrack(index, "catalog", "append");
      });
    });

    refs.playButton.addEventListener("click", () => {
      if (state.desiredPlayback === "playing") void requestPause();
      else void requestPlay();
    });

    refs.previousButton.addEventListener("click", () => {
      if (state.playbackMode === "shuffle" && state.historyCursor === 0) {
        pressFeedback(refs.previousButton);
        return;
      }
      const base = state.pendingIndex ?? state.currentIndex;
      const selection = resolvePreviousSelection(base);
      void selectTrack(selection.index, "previous", selection.policy);
    });

    refs.nextButton.addEventListener("click", () => {
      const base = state.pendingIndex ?? state.currentIndex;
      const selection = resolveNextSelection(base);
      void selectTrack(selection.index, "next", selection.policy);
    });

    refs.modeButton.addEventListener("click", togglePlaybackMode);

    refs.audio.addEventListener("loadstart", handleLoadStart, { signal: abortSignal });
    refs.audio.addEventListener("loadedmetadata", syncDuration, { signal: abortSignal });
    refs.audio.addEventListener("durationchange", syncDuration, { signal: abortSignal });
    refs.audio.addEventListener("play", handlePlay, { signal: abortSignal });
    refs.audio.addEventListener("playing", handlePlaying, { signal: abortSignal });
    refs.audio.addEventListener("pause", handlePause, { signal: abortSignal });
    refs.audio.addEventListener("timeupdate", syncProgressFallback, { signal: abortSignal });
    refs.audio.addEventListener("waiting", scheduleBuffering, { signal: abortSignal });
    refs.audio.addEventListener("stalled", scheduleBuffering, { signal: abortSignal });
    refs.audio.addEventListener("canplay", handleCanPlay, { signal: abortSignal });
    refs.audio.addEventListener("ended", handleEnded, { signal: abortSignal });
    refs.audio.addEventListener("error", handleAudioError, { signal: abortSignal });

    window.addEventListener("keydown", handleEscape, { signal: abortSignal });
    document.addEventListener("visibilitychange", syncAfterVisibility, { signal: abortSignal });
    root.addEventListener("rongyu:music-close-panel", () => closePanel(), { signal: abortSignal });

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (typeof motionQuery.addEventListener === "function") {
      motionQuery.addEventListener("change", (event) => {
        state.reducedMotion = event.matches;
        handleReducedMotionChange();
      }, { signal: abortSignal });
    }
  }

  function destroy(): void {
    signal.abort();
    cancelAnimationFrame(state.fadeFrame);
    cancelAnimationFrame(state.progressFrame);
    clearTimeout(state.bufferTimer);
    clearTimeout(state.naturalEndTimer);
    clearTimeout(state.slowLoadTimer);
    clearTimeout(state.contextCloseTimer);
    cancelActiveProbe();
  }

  bindEvents();
  restorePersistedState();
  renderState("init");

  return {
    root,
    closePanel,
    destroy,
  };
}

initializeMusicPlayer();
document.addEventListener("astro:page-load", initializeMusicPlayer);
