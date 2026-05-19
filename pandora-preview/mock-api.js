/*
 * Browser-side mock of the Python pywebview bridge used by app.jsx.
 * Keeps every UI control interactive but does no real audio work: file
 * picker is short-circuited, settings persist in localStorage so the
 * theme / mode toggles feel sticky, and "Separate" runs a fake progress
 * loop ending in a done state that resets after a few seconds.
 */
(function () {
  const PERSIST_KEY = 'pandora-preview-settings';
  function loadPersisted() {
    try { return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}'); }
    catch { return {}; }
  }
  function savePersisted(s) {
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(s)); } catch {}
  }

  const persisted = loadPersisted();

  // Internal demo state — what the app would normally be told by Python.
  const state = {
    output_dir:  persisted.output_dir  || 'C:\\Users\\You\\Desktop\\pandora-output',
    watch_dir:   persisted.watch_dir   || 'C:\\Users\\You\\Desktop\\pandora-input',
    skip_vocals: !!persisted.skip_vocals,
    stem_mode:   persisted.stem_mode   || '4',
    hq_preview:  !!persisted.hq_preview,
    hide_voc:    !!persisted.hide_voc,
    theme:       persisted.theme       || 'dark',
    quality:     persisted.quality     || 'fast',
    fine_tune:   !!persisted.fine_tune,
    device:      'cpu',
    devices:     ['cpu  Demo CPU', 'cuda:0  Your GPU (demo)'],
    watching:    false,
    tier:        'pro',
    tier_stems:  ['2', '4', '6'],
    demo_remaining: null,
  };

  // ── progress simulator ────────────────────────────────────────────
  let progressTimer = null;
  function emit(evt, data) {
    if (typeof window.onEvent === 'function') window.onEvent(evt, data);
  }
  function startFakeProgress(stems) {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    emit('thinking');
    let pct = 0;
    progressTimer = setInterval(() => {
      pct += 4 + Math.random() * 6;
      if (pct >= 100) {
        pct = 100;
        emit('progress', { pct });
        clearInterval(progressTimer); progressTimer = null;
        setTimeout(() => emit('done', { stems: stems || 'vocals · drums · bass · other' }), 300);
        return;
      }
      emit('progress', { pct });
    }, 220);
  }

  // ── public API matching main.py:Api ───────────────────────────────
  const api = {
    browse_file: async () => null,  // picker disabled in demo

    get_audio_url: async () => null,
    prerender_pitch: async () => null,

    set_dropzone_bounds: () => {},

    get_settings: async () => ({ ...state }),
    save_settings: (s) => {
      Object.assign(state, s);
      savePersisted({
        output_dir: state.output_dir, watch_dir: state.watch_dir,
        skip_vocals: state.skip_vocals, stem_mode: state.stem_mode,
        hq_preview: state.hq_preview, hide_voc: state.hide_voc,
        theme: state.theme, quality: state.quality, fine_tune: state.fine_tune,
      });
    },

    set_stem_mode: (mode) => { if (['2','4','6'].includes(String(mode))) state.stem_mode = String(mode); },

    browse_directory: async () => null,  // folder picker disabled in demo

    scan_batch_folder: async () => ({ total: 0, done_count: 0, todo: [], all: [] }),
    process_batch_queue: () => {
      startFakeProgress('batch demo · vocals · drums · bass · other');
    },
    process_file: () => {
      const stemList = state.stem_mode === '2'
        ? 'vocals · instrumental'
        : state.stem_mode === '6'
          ? 'vocals · bass · drums · guitar · piano · other'
          : 'vocals · bass · drums · other';
      startFakeProgress(stemList);
    },
    confirm_overwrite: () => startFakeProgress('demo'),

    open_pending_folder: () => {},
    open_output:         () => {},
    open_target_dir:     () => {},
    open_watch_dir:      () => {},

    toggle_watch: () => { state.watching = !state.watching; return state.watching; },
  };

  window.pywebview = { api };

  // App.jsx waits for this event when api isn't ready yet on first render.
  function fireReady() {
    window.dispatchEvent(new Event('pywebviewready'));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fireReady);
  } else {
    // Defer to next microtask so app.jsx registers its handler first.
    setTimeout(fireReady, 0);
  }
})();
