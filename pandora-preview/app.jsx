/* global React, ReactDOM */
const { useState, useEffect, useRef, useCallback } = React;

// ============================================================
// Pandora — vocal coach stem splitter
// ============================================================

const THINKING_PHRASES = [
  'warming up model',
  'unpacking weights',
  'allocating tensors',
  'priming spectrograms',
  'analyzing waveform',
  'isolating frequencies',
  'untangling harmonics',
  'separating sources',
  'reconstructing stems',
];

// ---- snowflake icon ---------------------------------------------------------

function IsoCube({ size = 48, className = '' }) {
  const s = size;
  // isometric cube — top, left, right faces
  const cx = s * 0.5, top = s * 0.12, mid = s * 0.5, bot = s * 0.88;
  const lx = s * 0.1, rx = s * 0.9;
  return (
    <svg className={className} width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      {/* top face */}
      <polygon points={`${cx},${top} ${rx},${s*0.31} ${cx},${mid} ${lx},${s*0.31}`} />
      {/* left face */}
      <polygon points={`${lx},${s*0.31} ${cx},${mid} ${cx},${bot} ${lx},${s*0.69}`} />
      {/* right face */}
      <polygon points={`${rx},${s*0.31} ${cx},${mid} ${cx},${bot} ${rx},${s*0.69}`} />
    </svg>
  );
}

// ---- drop zone --------------------------------------------------------------

function DropZone({ onFile, file, status, batchMode, watchDir, onWatchDir, onOpenDir, progress, eta, splitMode, onClear, onReset, batchPos, hqLoading }) {
  const ref = useRef(null);
  const [proximity, setProximity] = useState(0);
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 });
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragCount = useRef(0);

  useEffect(() => {
    function calcProximity(clientX, clientY) {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      const reach = Math.max(r.width, r.height) * 0.9;
      const inside = clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
      const t = inside ? 1 : Math.max(0, 1 - dist / reach);
      setProximity(t * t);
      setHovered(inside);
      setPointer({ x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height });
    }
    function onMove(e) { calcProximity(e.clientX, e.clientY); }
    function onOverlayMove(e) { calcProximity(e.detail.x, e.detail.y); }
    function onOverlayLeave() { setProximity(0); setHovered(false); }
    let dragOffTimer = null;
    function onDzDragEnter() {
      if (dragOffTimer) { clearTimeout(dragOffTimer); dragOffTimer = null; }
      dragCount.current++;
      setDragging(true);
    }
    function onDzDragLeave() {
      dragCount.current = Math.max(0, dragCount.current - 1);
      if (dragCount.current === 0) {
        if (dragOffTimer) clearTimeout(dragOffTimer);
        dragOffTimer = setTimeout(() => { setDragging(false); dragOffTimer = null; }, 300);
      }
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('overlay-mouse', onOverlayMove);
    window.addEventListener('overlay-mouse-leave', onOverlayLeave);
    window.addEventListener('dz-drag-enter', onDzDragEnter);
    window.addEventListener('dz-drag-leave', onDzDragLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('overlay-mouse', onOverlayMove);
      window.removeEventListener('overlay-mouse-leave', onOverlayLeave);
      window.removeEventListener('dz-drag-enter', onDzDragEnter);
      window.removeEventListener('dz-drag-leave', onDzDragLeave);
    };
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dragCount.current = 0;
    setDragging(false);
    // In pywebview the tkinter overlay handles drops and emits native-drop with a real file path.
    // The HTML5 File object lacks path due to browser security, so ignore it here.
    if (window.pywebview) return;
    const f = e.dataTransfer?.files?.[0];
    if (f && isAudio(f.name)) onFile(f);
  }, [onFile]);

  const pickingRef = useRef(false);
  const handlePick = useCallback(async () => {
    if (status !== 'idle' || batchMode) return;
    if (pickingRef.current) return;
    pickingRef.current = true;
    try {
      if (window.pywebview?.api?.browse_file) {
        const f = await window.pywebview.api.browse_file();
        if (f) onFile(f);
        return;
      }
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.onchange = () => {
        if (inp.files?.[0]) onFile(inp.files[0]);
        document.body.removeChild(inp);
      };
      inp.click();
    } finally {
      setTimeout(() => { pickingRef.current = false; }, 500);
    }
  }, [onFile, status, batchMode]);

  const glow = dragging ? 1 : proximity;
  const busy = status !== 'idle';

  return (
    <div
      ref={ref}
      className={`drop-zone ${(hovered || (file && !busy)) && !dragging ? 'is-hovered' : ''} ${dragging ? 'is-drag' : ''} ${busy ? 'is-busy' : ''} ${batchMode ? 'is-batch' : ''} ${status === 'done' ? 'is-done' : ''}`}
      style={{
        '--glow': glow.toFixed(3),
        '--px': `${(pointer.x * 100).toFixed(1)}%`,
        '--py': `${(pointer.y * 100).toFixed(1)}%`,
      }}
      onDragEnter={(e) => { e.preventDefault(); dragCount.current++; setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={(e) => { e.preventDefault(); if (--dragCount.current <= 0) { dragCount.current = 0; setDragging(false); } }}
      onDrop={handleDrop}
      onClick={status === 'done' ? onReset : (batchMode ? undefined : handlePick)}
    >
      <div className="dz-spot" />
      <div className="dz-frame" />
      <div className="dz-inner">
        {hqLoading ? <HqLoadingBox /> : <>
          {status === 'idle' && !batchMode && !file && <DZIdle />}
          {status === 'idle' && batchMode && <DZBatch dir={watchDir} onChangeDir={onWatchDir} onOpenDir={onOpenDir} />}
          {status === 'idle' && !batchMode && file && <DZFile file={file} />}
          {status === 'booting' && <ThinkingPhrases batchPos={batchMode ? batchPos : null} />}
          {status === 'running' && <CircularProgress progress={progress} batchPos={batchMode ? batchPos : null} />}
          {status === 'done' && <DZDone />}
        </>}
      </div>

      {dragging && <div className="dz-rings"><span /><span /><span /></div>}

      <div className="dz-scan" />

      {status === 'idle' && file && !batchMode && (
        <button className="dz-clear-btn" onClick={(e) => { e.stopPropagation(); onClear(); }} title="Remove file">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      )}

    </div>
  );
}

function DZIdle() {
  return (
    <div className="dz-idle">
      <svg width="32" height="40" viewBox="0 0 28 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--fg-dim)', marginBottom: 4}}>
        <line x1="14" y1="2" x2="14" y2="28" />
        <polyline points="6,20 14,28 22,20" />
      </svg>
      <div className="dz-title">
        Drop audio file
        <div className="dz-title-sub">or click to browse</div>
      </div>
    </div>
  );
}

function DZBatch({ dir, onChangeDir, onOpenDir }) {
  const shortDir = dir.length > 34 ? '…' + dir.slice(-32) : dir;
  return (
    <div className="dz-batch">
      <svg width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--fg-dim)'}}>
        <path d="M2 9 A1.5 1.5 0 0 1 3.5 7.5 H11 L13 10 H28.5 A1.5 1.5 0 0 1 30 11.5 V24 A1.5 1.5 0 0 1 28.5 25.5 H3.5 A1.5 1.5 0 0 1 2 24 Z"/>
      </svg>
      <div className="dz-batch-label">Batch</div>
      <div className="dz-batch-dir">{shortDir}</div>
      <div className="dz-batch-btns">
        <button className="dz-batch-change" onClick={(e) => { e.stopPropagation(); onOpenDir(); }}>open</button>
        <button className="dz-batch-change" onClick={(e) => { e.stopPropagation(); onChangeDir(); }}>change</button>
      </div>
    </div>
  );
}

function DZFile({ file }) {
  return (
    <div className="dz-file">
      <div className="dz-icon"><IsoCube size={36} /></div>
      <div className="dz-file-name">{file.name}</div>
      <div className="dz-file-hint">click to replace</div>
    </div>
  );
}

function DZBusy({ file }) {
  return (
    <div className="dz-busy">
      <div className="dz-busy-name">{file?.name ?? '—'}</div>
      <div>processing</div>
    </div>
  );
}

function DZDone() {
  return (
    <div className="dz-done">
      <svg className="done-svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle className="done-ring" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="1.4"/>
        <path className="done-tick" d="M17 28 L24 35 L39 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="done-label">ready</div>
    </div>
  );
}

// ---- rocker switch (2 / 4 stems) -------------------------------------------

const AUDIO_EXTS = new Set(['.wav', '.mp3', '.flac', '.m4a', '.aiff', '.ogg', '.aac', '.opus', '.wma', '.mp4', '.mov', '.avi', '.mkv', '.webm']);
const isAudio = name => AUDIO_EXTS.has(name.slice(name.lastIndexOf('.')).toLowerCase());

const STEM_VALUES = [2, 4, 6];

function StemPicker({ value, onChange, disabled, skipVocals, onSkipVocals, showVoc, disabledModes }) {
  const isModeDisabled = (v) => disabled || (disabledModes && disabledModes.includes(v));
  return (
    <div className="stem-picker">
      {STEM_VALUES.map(v => {
        const dim = isModeDisabled(v);
        return (
          <button
            key={v}
            className={`stem-pick-btn${value === v ? ' active' : ''}${dim ? ' stem-cycle-disabled' : ''}`}
            onClick={() => { if (!dim) onChange(v); }}
            title={dim && disabledModes && disabledModes.includes(v) ? 'Switch to Fast quality to use 6 stems' : undefined}
          >{v}</button>
        );
      })}
      <button
        className={`stem-pick-btn${skipVocals ? ' active' : ''}${disabled ? ' stem-cycle-disabled' : ''}`}
        style={{marginLeft: 4, border: 'none', visibility: showVoc ? 'visible' : 'hidden', ...(skipVocals ? {textDecoration: 'line-through'} : {})}}
        onClick={() => { if (!disabled) onSkipVocals(v => !v); }}
        title={`skip vocals: ${skipVocals ? 'on' : 'off'}`}
      >voc</button>
    </div>
  );
}

const IDLE_PHRASES = [
  'standing by',
  'awaiting input',
  'ready when you are',
  'listening',
  'idle',
];

function PandoraBox() {
  return (
    <svg width="130" height="126" viewBox="0 0 130 126" fill="none" style={{overflow:'visible'}}>
      <defs>
        <radialGradient id="pb-inner" cx="50%" cy="60%" r="60%">
          <stop offset="0%"   stopColor="#f5c030" stopOpacity="0.95"/>
          <stop offset="60%"  stopColor="#d48010" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#c07010" stopOpacity="0"/>
        </radialGradient>
        <filter id="pb-amb" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
      </defs>
      <ellipse cx="52" cy="54" rx="36" ry="12" fill="#e8a020" opacity="0.28" filter="url(#pb-amb)"/>
      <ellipse cx="58" cy="120" rx="46" ry="4" fill="#000" opacity="0.14"/>
      <polygon points="90,56 112,40 112,90 90,106" fill="#090912"/>
      <polygon points="8,56 30,40 112,40 90,56" fill="url(#pb-inner)"/>
      <polygon points="8,56 90,56 8,106"   fill="#101020"/>
      <polygon points="90,56 90,106 8,106" fill="#0c0c1a"/>
      <line x1="8"   y1="56"  x2="8"   y2="106" stroke="#a07010" strokeWidth="0.9" opacity="0.5"/>
      <line x1="8"   y1="106" x2="90"  y2="106" stroke="#a07010" strokeWidth="0.9" opacity="0.45"/>
      <line x1="90"  y1="106" x2="90"  y2="56"  stroke="#a07010" strokeWidth="0.9" opacity="0.4"/>
      <line x1="90"  y1="56"  x2="112" y2="40"  stroke="#806008" strokeWidth="0.8" opacity="0.35"/>
      <line x1="112" y1="40"  x2="112" y2="90"  stroke="#806008" strokeWidth="0.7" opacity="0.28"/>
      <line x1="112" y1="90"  x2="90"  y2="106" stroke="#806008" strokeWidth="0.7" opacity="0.28"/>
      <polygon points="90,54 112,38 116,6 92,18" fill="#08080e"/>
      <polygon points="8,54 90,54 12,18"   fill="#13132a"/>
      <polygon points="90,54 92,18 12,18"  fill="#0f0f24"/>
      <polygon points="12,18 92,18 116,6 36,6" fill="#0a0a1c"/>
      <polyline points="8,54 12,18 92,18 90,54" fill="none" stroke="#a07010" strokeWidth="1.0" opacity="0.65"/>
      <line x1="12"  y1="18" x2="36"  y2="6"  stroke="#806008" strokeWidth="0.8" opacity="0.45"/>
      <line x1="92"  y1="18" x2="116" y2="6"  stroke="#806008" strokeWidth="0.8" opacity="0.45"/>
      <line x1="36"  y1="6"  x2="116" y2="6"  stroke="#806008" strokeWidth="0.8" opacity="0.4"/>
      <rect x="45" y="65" width="8" height="9" rx="1.5" fill="#a07010" opacity="0.7"/>
      <rect x="47" y="70" width="4" height="4" rx="0.8" fill="#060610"/>
      <circle cx="28" cy="46" r="1.4" fill="#f5d060" className="pb-s1"/>
      <circle cx="50" cy="40" r="1.0" fill="#fff8c0" className="pb-s2"/>
      <circle cx="68" cy="46" r="1.2" fill="#f5d060" className="pb-s3"/>
      <circle cx="40" cy="36" r="0.8" fill="#fff8c0" className="pb-s4"/>
    </svg>
  );
}

function IdlePhrases() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % IDLE_PHRASES.length), 2800);
    return () => clearInterval(t);
  }, []);
  return <div className="idle-text" key={idx}>{IDLE_PHRASES[idx]}</div>;
}

// ---- thinking phrases -------------------------------------------------------

function HqLoadingBox() {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setDotCount(d => (d % 3) + 1), 420);
    return () => clearInterval(t);
  }, []);
  const dots = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount);
  return (
    <div className="thinking">
      <div className="thinking-icon"><IsoCube size={28} /></div>
      <div className="thinking-text">
        <span>loading Hi-Res preview</span><span className="thinking-dots">{dots}</span>
      </div>
    </div>
  );
}

function ThinkingPhrases({ batchPos }) {
  const isMidBatch = batchPos && batchPos.current > 1;
  const [idx, setIdx] = useState(0);
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    const t1 = setInterval(() => setIdx((i) => (i + 1) % THINKING_PHRASES.length), 2400);
    const t2 = setInterval(() => setDotCount((d) => (d % 3) + 1), 420);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);
  const phrase = isMidBatch ? 'loading next track' : THINKING_PHRASES[idx];
  const dots = '.'.repeat(dotCount) + ' '.repeat(3 - dotCount);
  return (
    <div className="circ-stack">
      <div className="thinking">
        <div className="thinking-icon"><IsoCube size={28} /></div>
        <div className="thinking-text" key={isMidBatch ? 'mid' : idx}>
          <span>{phrase}</span><span className="thinking-dots">{dots}</span>
        </div>
      </div>
      {batchPos && <div className="circ-batch">{batchPos.current}/{batchPos.total}</div>}
    </div>
  );
}

// ---- circular progress ------------------------------------------------------

function CircularProgress({ progress, batchPos }) {
  const size = 132;
  const stroke = 9;
  const r = size / 2 - stroke - 2;
  const c = 2 * Math.PI * r;

  const [shown, setShown] = useState(progress);
  const shownRef = useRef(progress);
  const targetRef = useRef(progress);
  useEffect(() => {
    // Significant drop = new pass / restart → instant snap
    if (progress < shownRef.current - 0.08) {
      shownRef.current = progress;
      targetRef.current = progress;
      setShown(progress);
      return;
    }
    // Otherwise only advance target forward (ignore minor drops)
    if (progress > targetRef.current) targetRef.current = progress;
  }, [progress]);
  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = targetRef.current;
      const s = shownRef.current;
      if (t > s + 0.0005) {
        const dist = t - s;
        // Near the end (target ≥ 99%) accelerate so the bar reaches 100 % before
        // the "done" transition fires. Otherwise smooth catchup over ~1.5s.
        const speed = t >= 0.99
          ? Math.max(0.5, dist / 0.25)
          : Math.max(0.01, dist / 1.5);
        const step = Math.min(dist, speed * dt);
        const next = s + step;
        shownRef.current = next;
        setShown(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const dash = c * Math.min(shown, 1);
  const complete = shown >= 0.999;
  return (
    <div className="circ-stack">
      <div className="circ-wrap">
        <svg className="circ" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle className="track" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none" />
          <circle
            className={`bar${complete ? ' bar-complete' : ''}`}
            cx={size/2} cy={size/2} r={r}
            strokeWidth={stroke} fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeLinecap="butt"
          />
        </svg>
        <div className="circ-center">
          <div className="circ-pct">{Math.round(shown * 100)}%</div>
        </div>
      </div>
      {batchPos && <div className="circ-batch">{batchPos.current}/{batchPos.total}</div>}
    </div>
  );
}

// ---- status bar -------------------------------------------------------------

function StatusBar({ status }) {
  const map = {
    idle:    { dot: 'ok',   text: 'ready' },
    booting: { dot: 'warn', text: 'starting' },
    running: { dot: 'work', text: 'running' },
    done:    { dot: 'ok',   text: 'done' },
  };
  const cur = map[status] ?? map.idle;
  return (
    <div className={`status status-${cur.dot}`}>
      <span className="led" />
      <span>{cur.text}</span>
    </div>
  );
}

// ---- pitch row with seek controls ------------------------------------------

function PitchRow({ file, pitch, onPitch, batchMode, hqPreview, onHqLoading, fineTune }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => { onHqLoading?.(loading && hqPreview && pitch !== 0); }, [loading, hqPreview, pitch, onHqLoading]);
  const audioRef   = useRef(null);
  const sourceRef  = useRef(null);
  const shiftRef   = useRef(null);
  const fileUrlRef = useRef(null);
  const startTimeRef   = useRef(0);
  const startOffsetRef = useRef(0);
  const peakCacheRef   = useRef({});
  const pitchRef       = useRef(pitch);
  useEffect(() => { pitchRef.current = pitch; }, [pitch]);

  // Pre-analyze file peak as soon as it's loaded so playback starts without delay.
  useEffect(() => {
    if (!file?.path) return;
    if (peakCacheRef.current[file.path] !== undefined) return;
    let cancelled = false;
    (async () => {
      try {
        if (typeof Tone === 'undefined' || !window.pywebview?.api?.get_audio_url) return;
        const url = await window.pywebview.api.get_audio_url(file.path);
        const rawCtx = Tone.getContext().rawContext;
        const resp = await fetch(url);
        const arr  = await resp.arrayBuffer();
        const buf  = await rawCtx.decodeAudioData(arr.slice(0));
        let peak = 0;
        for (let ch = 0; ch < buf.numberOfChannels; ch++) {
          const data = buf.getChannelData(ch);
          for (let i = 0; i < data.length; i += 64) {
            const a = Math.abs(data[i]);
            if (a > peak) peak = a;
          }
        }
        if (!cancelled) peakCacheRef.current[file.path] = peak || 1;
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [file?.path]);

  useEffect(() => () => stopPreview(), []);
  // Stop playback when file is cleared (e.g. batch toggle, clear button)
  useEffect(() => { if (!file) stopPreview(); }, [file?.path]);

  const stopPreview = () => {
    try {
      if (audioRef.current) { audioRef.current.onended = null; audioRef.current.pause(); audioRef.current.src = ''; }
      sourceRef.current?.disconnect();
      shiftRef.current?.dispose();
    } catch(_) {}
    audioRef.current  = null;
    sourceRef.current = null;
    shiftRef.current  = null;
    setPlaying(false);
  };

  const seek = (delta) => {
    if (!audioRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const t = Math.max(0, startOffsetRef.current + elapsed + delta);
    audioRef.current.currentTime = t;
    startOffsetRef.current = t;
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (!playing) return;
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); seek(-10); }
      if (e.key === 'ArrowRight') { e.preventDefault(); seek(10); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [playing]);

  const togglePreview = async () => {
    if (playing) { stopPreview(); return; }
    if (!file || typeof Tone === 'undefined') return;

    // At pitch=0 there's nothing to shift — skip HQ path entirely
    const useHQ = hqPreview && pitch !== 0;
    const startPitch = pitch;
    setLoading(true);
    try {
      await Tone.start();
      const rawCtx = Tone.getContext().rawContext;
      try { await rawCtx.resume(); } catch(_) {}

      let url;
      if (useHQ && file.path && window.pywebview?.api?.prerender_pitch) {
        url = await window.pywebview.api.prerender_pitch(file.path, pitch);
      } else if (file.path && window.pywebview) {
        url = await window.pywebview.api.get_audio_url(file.path);
      } else if (file.path) {
        url = encodeURI('file:///' + file.path.replace(/\\/g, '/'));
      } else {
        url = URL.createObjectURL(file);
      }
      // If pitch changed during HQ pre-render, abort so we don't play a stale value
      if (useHQ && pitchRef.current !== startPitch) return;
      fileUrlRef.current = url;

      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      const source = rawCtx.createMediaElementSource(audio);

      // In HQ mode the file is already pitch-shifted — no Tone.PitchShift needed
      if (useHQ) {
        source.connect(rawCtx.destination);
      } else {
        // Use the peak measured at file-load. Fall back to a live measure if not ready yet.
        let peak = peakCacheRef.current[file?.path];
        if (peak === undefined) {
          try {
            const resp = await fetch(url);
            const arr  = await resp.arrayBuffer();
            const buf  = await rawCtx.decodeAudioData(arr.slice(0));
            peak = 0;
            for (let ch = 0; ch < buf.numberOfChannels; ch++) {
              const data = buf.getChannelData(ch);
              for (let i = 0; i < data.length; i += 64) {
                const a = Math.abs(data[i]);
                if (a > peak) peak = a;
              }
            }
            if (file?.path) peakCacheRef.current[file.path] = peak || 1;
          } catch (_) { peak = 1; }
        }
        const target = 0.7; // ≈ -3dB headroom for PitchShift transients
        const normGain = peak > 0 ? Math.min(1, target / peak) : 1;
        const gain    = rawCtx.createGain();
        gain.gain.value = normGain;
        const shift   = new Tone.PitchShift({ pitch, windowSize: 0.1 });
        // Safety limiter for raw/unmastered material that overshoots even after normalization
        const limiter = new Tone.Limiter(-2);
        shift.chain(limiter, Tone.Destination);
        shiftRef.current = shift;
        source.connect(gain);
        try { gain.connect(shift.input.input); }
        catch(_) { try { gain.connect(shift.input); } catch(__) { gain.connect(rawCtx.destination); } }
      }

      audio.onended = stopPreview;
      audioRef.current  = audio;
      sourceRef.current = source;

      try {
        await audio.play();
        startOffsetRef.current = 0;
        startTimeRef.current = Date.now();
        setPlaying(true);
      } catch(_) { stopPreview(); }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (v) => {
    onPitch(v);
    if (shiftRef.current) shiftRef.current.pitch = v;
    // In HQ mode pitch change needs a full re-render; just stop playback
    if (hqPreview && playing) stopPreview();
  };

  const step = fineTune ? 0.1 : 0.5;
  const snap = (v) => Math.round(v / step) * step;
  const formatPitch = (p) => {
    const eps = 1e-6;
    if (Math.abs(p) < eps) return '0 st';
    const sign = p < 0 ? '-' : '+';
    const abs = Math.abs(p);
    if (fineTune) {
      const st = Math.floor(abs + eps);
      const ct = Math.round((abs - st) * 100);
      if (st === 0) return `${sign}${ct} ct`;
      if (ct === 0) return `${sign}${st} st`;
      return `${sign}${st} st ${ct} ct`;
    }
    const formatted = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1);
    return `${sign}${formatted} st`;
  };
  const label = formatPitch(pitch);

  const clampPitch = v => Math.min(12, Math.max(-12, snap(v)));
  const wheelPitch = (e, cur) => { e.preventDefault(); handleChange(clampPitch(cur - Math.sign(e.deltaY) * step)); };

  const onValMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startPitch = pitch;
    const sens = fineTune ? 20 : 4;
    const onMove = ev => handleChange(clampPitch(startPitch + (startY - ev.clientY) / sens));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="pitch-row">
      <span className="ctrl-label">Pitch</span>
      <input type="range" className="pitch-slider"
        min={-12} max={12} step={step} value={pitch}
        onChange={e => handleChange(clampPitch(Number(e.target.value)))}
        onWheel={e => wheelPitch(e, pitch)}
        onDoubleClick={() => handleChange(0)} />
      <span className="pitch-val" style={{cursor:'ns-resize'}}
        onWheel={e => wheelPitch(e, pitch)}
        onMouseDown={onValMouseDown}
        onDoubleClick={() => handleChange(0)}>{label}</span>
      {!batchMode && <div className="preview-group">
        {playing && (
          <>
            <button className="seek-btn" onClick={() => seek(-10)} title="−10s">
              <svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6,1 1,5.5 6,10"/>
              </svg>
            </button>
            <button className="seek-btn" onClick={() => seek(10)} title="+10s">
              <svg width="7" height="11" viewBox="0 0 7 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1,1 6,5.5 1,10"/>
              </svg>
            </button>
          </>
        )}
        <button
          className={`preview-btn${playing ? ' playing' : ''}`}
          onClick={togglePreview}
          disabled={!file || loading}
        >
          {playing
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8"/></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><polygon points="1,1 9,5 1,9"/></svg>
          }
        </button>
      </div>}
    </div>
  );
}

// ---- overwrite modal -------------------------------------------------------

function OverwriteModal({ name, sub, kind, onOverwrite, onCancel, onOpenFolder }) {
  const actionLabel = kind === 'add' ? 'Add' : 'Overwrite';
  return (
    <div className="overwrite-modal" onClick={e => e.stopPropagation()}>
      <div className="overwrite-name">{name}</div>
      <div className="overwrite-sub">{sub || 'already separated · overwrite?'}</div>
      <div className="overwrite-actions">
        <button className="overwrite-link" onClick={e => { e.stopPropagation(); onOpenFolder(); }}>open folder →</button>
        <div className="overwrite-btns">
          <button className="overwrite-btn overwrite-btn--cancel" onClick={e => { e.stopPropagation(); onCancel(); }}>Cancel</button>
          <button className="overwrite-btn overwrite-btn--confirm" onClick={e => { e.stopPropagation(); onOverwrite(); }}>{actionLabel}</button>
        </div>
      </div>
    </div>
  );
}

function BatchScanModal({ scan, onConfirm, onCancel, onOpenFolder }) {
  const { total, done_count, todo, all } = scan;
  const remaining = todo.length;
  const sub = remaining === 0
    ? `all ${total} files already processed · overwrite all?`
    : `${done_count} of ${total} already processed · process ${remaining} remaining?`;
  return (
    <div className="overwrite-modal" onClick={e => e.stopPropagation()}>
      <div className="overwrite-name">batch folder</div>
      <div className="overwrite-sub">{sub}</div>
      <div className="overwrite-actions">
        <button className="overwrite-link" onClick={e => { e.stopPropagation(); onOpenFolder(); }}>open folder →</button>
        <div className="overwrite-btns">
          <button className="overwrite-btn overwrite-btn--cancel" onClick={e => { e.stopPropagation(); onCancel(); }}>Cancel</button>
          {done_count > 0 && <button className="overwrite-btn overwrite-btn--confirm" onClick={e => { e.stopPropagation(); onConfirm(all); }}>Overwrite All</button>}
          {remaining > 0 && <button className="overwrite-btn overwrite-btn--confirm" onClick={e => { e.stopPropagation(); onConfirm(todo); }}>Process {remaining}</button>}
        </div>
      </div>
    </div>
  );
}

// ---- settings panel --------------------------------------------------------

function SettingsPanel({ outputPath, watchDir, onOutputPath, onWatchDir, onClose, skipVocals, onSkipVocals, hqPreview, onHqPreview, hideVoc, onHideVoc, onCopyPath, quality, onQuality, fineTune, onFineTune }) {
  return (
    <div className="settings-panel">
      <header className="topbar">
        <span className="brand-name" style={{letterSpacing:'0.14em', fontSize:13}}>SETTINGS</span>
        <button className="theme-btn" onClick={onClose} title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
          </svg>
        </button>
      </header>

      <div className="settings-body">
        <div className="settings-field">
          <span className="ctrl-label">Input folder</span>
          <div className="settings-path-row">
            <span className="settings-path settings-path--copy" onClick={(e) => onCopyPath(watchDir, e)} title="Click to copy">{watchDir}</span>
            <button className="open-folder-btn" onClick={onWatchDir}>Browse</button>
          </div>
        </div>

        <div className="settings-field">
          <span className="ctrl-label">Output folder</span>
          <div className="settings-path-row">
            <span className="settings-path settings-path--copy" onClick={(e) => onCopyPath(outputPath, e)} title="Click to copy">{outputPath}</span>
            <button className="open-folder-btn" onClick={onOutputPath}>Browse</button>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section-title">Quality</div>

        <div className="settings-field">
          <div className="settings-row-main">
            <span className="ctrl-label">Model</span>
            <div className="quality-picker">
              <button
                className={`batch-btn${quality === 'fast' ? ' active' : ''}`}
                onClick={() => onQuality('fast')}
              >FAST</button>
              <button
                className={`batch-btn${quality === 'studio' ? ' active' : ''}`}
                onClick={() => onQuality('studio')}
              >STUDIO</button>
            </div>
          </div>
          <div className="settings-hint">Studio uses a higher-quality model — ~4× slower, supports 2/4 stems only</div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section-title">Batch settings</div>

        <div className="settings-field">
          <div className="settings-row-main">
            <span className="ctrl-label">Skip vocals</span>
            <button
              className={`batch-btn${skipVocals ? ' active' : ''}`}
              onClick={() => onSkipVocals(v => !v)}
            >
              {skipVocals ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-hint">removes the vocal stem from the output — only the instrumental tracks are saved</div>
        </div>

        <div className="settings-field">
          <div className="settings-row-main">
            <span className="ctrl-label">Hide voc button</span>
            <button
              className={`batch-btn${hideVoc ? ' active' : ''}`}
              onClick={() => onHideVoc(v => !v)}
            >
              {hideVoc ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-hint">permanently removes the voc skip toggle from the main interface — it lives only here</div>
        </div>

        <div className="settings-divider" />

        <div className="settings-hotkeys">
          <div className="settings-section-title">Hotkeys</div>
          <div className="settings-hotkey"><kbd>V</kbd><span>toggle voc skip</span></div>
          <div className="settings-hotkey"><kbd>B</kbd><span>toggle batch mode</span></div>
          <div className="settings-hotkey"><kbd>2</kbd> <kbd>4</kbd> <kbd>6</kbd><span>switch stem count</span></div>
          <div className="settings-hotkey"><kbd>←</kbd> <kbd>→</kbd><span>seek ±10s during preview</span></div>
        </div>

        <div className="settings-divider" />

        <div className="settings-field">
          <div className="settings-row-main">
            <span className="ctrl-label">Fine tuning</span>
            <button
              className={`batch-btn${fineTune ? ' active' : ''}`}
              onClick={() => onFineTune(v => !v)}
            >
              {fineTune ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-hint">switch pitch precision to cents — slider moves in 10 ct steps, label shows "+1 st 20 ct"</div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section-title">Preview</div>

        <div className="settings-field">
          <div className="settings-row-main">
            <span className="ctrl-label">High quality preview</span>
            <button
              className={`batch-btn${hqPreview ? ' active' : ''}`}
              onClick={() => onHqPreview(v => !v)}
            >
              {hqPreview ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="settings-hint">renders pitched preview at higher quality — takes a few seconds before playback</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// App
// ============================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "splitMode": 2,
  "outputPath": ""
}/*EDITMODE-END*/;

function App() {
  const [tweakState, setTweakFn] = window.useTweaks(TWEAK_DEFAULTS);
  const [dark, setDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [skipVocals, setSkipVocals] = useState(false);
  const [hqPreview, setHqPreview] = useState(false);
  const [hideVoc, setHideVoc] = useState(false);
  const [fineTune, setFineTune] = useState(false);
  const [quality, setQuality] = useState('fast');
  const [hqLoading, setHqLoading] = useState(false);
  // Studio quality has no 6-stem variant — fall back to 4
  useEffect(() => {
    if (quality === 'studio' && Number(splitMode) === 6) setTweakFn('splitMode', 4);
  }, [quality, splitMode]);
  const [overwritePrompt, setOverwritePrompt] = useState(null);
  const [batchScanPrompt, setBatchScanPrompt] = useState(null);

  const [file, setFile] = useState(null);
  const [pitch, setPitch] = useState(0);
  const [status, setStatus] = useState('idle');
  const [batchMode, setBatchMode] = useState(false);
  const [batchFileCount, setBatchFileCount] = useState(0);
  const [batchPos, setBatchPos] = useState(null);
  const [pathCopied, setPathCopied] = useState(false);
  const copyPath = (text, e) => {
    try {
      navigator.clipboard.writeText(text);
      setPathCopied({ x: e.clientX, y: e.clientY });
      setTimeout(() => setPathCopied(false), 1100);
    } catch (_) {}
  };
  const [watchDir, setWatchDir] = useState('');
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState('—');

  const startTime = useRef(null);
  const tickRef = useRef(null);
  const bootRef = useRef(null);

  const splitMode = tweakState.splitMode;
  const outputPath = tweakState.outputPath;
  const outputDisplay = outputPath.replace(/^.*[\\/]([^\\/]+[\\/][^\\/]+)$/, '…/$1');

  const canStart = batchMode || file !== null;

  // ── seamless boot-splash dismissal ───────────────────────────────────────
  // Splash lives outside #root (index.html) so React can't blow it away
  // mid-mount. Dismiss once first paint has committed AND fonts are loaded.
  // We don't block on pywebview API readiness — it binds slower on some
  // machines and would hold the splash for up to a second after UI is usable.
  useEffect(() => {
    const splash = document.getElementById('bootSplash');
    if (!splash) return;
    let done = false;
    const dismiss = () => {
      if (done) return;
      done = true;
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 450);
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    const cap = new Promise(resolve => setTimeout(resolve, 1200));
    // Two RAFs ensure the App's first render has actually committed pixels
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Promise.race([fontsReady, cap]).then(dismiss);
    }));
  }, []);

  // ── pywebview event bridge ───────────────────────────────────────────────
  useEffect(() => {
    window.onEvent = (event, data) => {
      if (event === 'native-drop') {
        if (isAudio(data.name)) {
          setBatchMode(false);
          setFile({ name: data.name, size: data.size, path: data.path });
        }
        return;
      }
      if (event === 'thinking') { setStatus('booting'); return; }
      if (event === 'progress') {
        setStatus(s => s === 'booting' ? 'running' : s);
        setProgress((data.pct ?? 0) / 100);
        return;
      }
      if (event === 'confirm-overwrite') { setOverwritePrompt(data); return; }
      if (event === 'done') {
        setProgress(1);
        setTimeout(() => setStatus('done'), 700);
        return;
      }
      if (event === 'batch-item') { setBatchPos({ current: data.current, total: data.total }); return; }
      if (event === 'batch-done') { setProgress(1); setTimeout(() => { setStatus('done'); setBatchPos(null); }, 700); return; }
      if (event === 'error') { reset(); return; }
      if (event === 'overlay-mouse') {
        const el = document.elementFromPoint(data.x, data.y);
        // Settings panel covers the drop zone — don't leak hover events through it
        const overSettings = el && el.closest('.settings-panel');
        if (!overSettings) {
          window.dispatchEvent(new CustomEvent('overlay-mouse', { detail: data }));
        }
        const target = el ? (el.closest('button, a, [role="button"]') || el) : null;
        const prev = window.__overlayHover;
        if (target !== prev) {
          if (prev && prev.classList) prev.classList.remove('overlay-hover');
          if (target && target.classList) target.classList.add('overlay-hover');
          window.__overlayHover = target;
        }
        return;
      }
      if (event === 'overlay-mouse-leave') {
        window.dispatchEvent(new CustomEvent('overlay-mouse-leave'));
        const prev = window.__overlayHover;
        if (prev && prev.classList) prev.classList.remove('overlay-hover');
        window.__overlayHover = null;
        return;
      }
      if (event === 'drag-enter') { window.dispatchEvent(new CustomEvent('dz-drag-enter')); return; }
      if (event === 'drag-leave') { window.dispatchEvent(new CustomEvent('dz-drag-leave')); return; }
      if (event === 'overlay-wheel') {
        const el = document.elementFromPoint(data.x, data.y);
        let target = el;
        while (target && target !== document.body) {
          const oy = getComputedStyle(target).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && target.scrollHeight > target.clientHeight) break;
          target = target.parentElement;
        }
        if (target && target !== document.body) {
          target.scrollTop -= data.delta;
        }
        return;
      }
      if (event === 'overlay-click') {
        const now = Date.now();
        if (now - (window.__lastOverlayClick || 0) < 80) return;
        window.__lastOverlayClick = now;
        const el = document.elementFromPoint(data.x, data.y);
        if (el) {
          const target = el.closest('button, a, [role="button"], [onclick], .settings-path--copy, .output-path') || el;
          target.dispatchEvent(new MouseEvent('click', {
            bubbles: true, cancelable: true, view: window,
            clientX: data.x, clientY: data.y,
          }));
        }
        return;
      }
    };
    return () => { delete window.onEvent; };
  }, []);

  // ── report drop zone bounds to overlay ──────────────────────────────────
  useEffect(() => {
    const report = () => {
      const el = document.querySelector('.drop-zone');
      if (!el || !window.pywebview?.api?.set_dropzone_bounds) return;
      const r = el.getBoundingClientRect();
      window.pywebview.api.set_dropzone_bounds({
        x: Math.round(r.left),
        y: Math.round(r.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    };
    const id = setTimeout(report, 100);
    const observer = new ResizeObserver(report);
    const el = document.querySelector('.drop-zone');
    if (el) observer.observe(el);
    window.addEventListener('resize', report);
    return () => { clearTimeout(id); observer.disconnect(); window.removeEventListener('resize', report); };
  }, []);

  // ── load settings from backend on mount ─────────────────────────────────
  // settingsLoaded gates the save-useEffect below — without it, the
  // mount-time defaults would be written to disk before the real values
  // arrive, clobbering the user's saved paths with hardcoded JSX defaults.
  // pywebview API binds slightly after first render via pywebviewready, so
  // wait for it instead of bailing out on the optional-chain miss.
  const settingsLoaded = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (cancelled) return;
      const api = window.pywebview?.api;
      if (!api?.get_settings) return;
      api.get_settings().then(s => {
        if (cancelled) return;
        if (s?.output_dir) setTweakFn('outputPath', s.output_dir);
        if (s?.watch_dir)  setWatchDir(s.watch_dir);
        if (s?.stem_mode)  setTweakFn('splitMode', Number(s.stem_mode));
        if (s?.skip_vocals !== undefined) setSkipVocals(s.skip_vocals);
        if (s?.hq_preview !== undefined) setHqPreview(s.hq_preview);
        if (s?.hide_voc !== undefined) setHideVoc(s.hide_voc);
        if (s?.theme !== undefined) setDark(s.theme !== 'light');
        if (s?.quality !== undefined) setQuality(s.quality === 'studio' ? 'studio' : 'fast');
        if (s?.fine_tune !== undefined) setFineTune(!!s.fine_tune);
      }).finally(() => { settingsLoaded.current = true; });
    };
    if (window.pywebview?.api?.get_settings) {
      load();
    } else {
      window.addEventListener('pywebviewready', load, { once: true });
      // Hard cap so the save-useEffect isn't blocked forever in dev/browser mode
      setTimeout(() => { if (!settingsLoaded.current) { settingsLoaded.current = true; } }, 3000);
    }
    return () => { cancelled = true; };
  }, []);

  // ── sync settings to backend when changed ───────────────────────────────
  useEffect(() => {
    if (!settingsLoaded.current) return;  // don't clobber persisted values with mount defaults
    window.pywebview?.api?.save_settings?.({ output_dir: outputPath, watch_dir: watchDir, skip_vocals: skipVocals, stem_mode: String(splitMode), hq_preview: hqPreview, hide_voc: hideVoc, theme: dark ? 'dark' : 'light', quality, fine_tune: fineTune });
  }, [outputPath, watchDir, skipVocals, splitMode, hqPreview, hideVoc, dark, quality, fineTune]);

  // ── poll batch folder file count when batch mode is on & idle ────────────
  useEffect(() => {
    if (!batchMode || status !== 'idle') return;
    let alive = true;
    const tick = async () => {
      if (!alive || !window.pywebview?.api?.scan_batch_folder) return;
      try {
        const scan = await window.pywebview.api.scan_batch_folder(0);
        if (alive) setBatchFileCount(scan?.total ?? 0);
      } catch (_) {}
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [batchMode, status, watchDir]);

  // ── keyboard shortcuts ───────────────────────────────────────────────────
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);
  const qualityRef = useRef(quality);
  useEffect(() => { qualityRef.current = quality; }, [quality]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (statusRef.current !== 'idle') return;
      if (e.key === '2') setTweakFn('splitMode', 2);
      if (e.key === '4') setTweakFn('splitMode', 4);
      if (e.key === '6' && qualityRef.current !== 'studio') setTweakFn('splitMode', 6);
      const k = e.key.toLowerCase();
      if (k === 'v') setSkipVocals(v => !v);
      if (k === 'b') { setBatchMode(b => !b); setFile(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startBatch = () => {
    if (!window.pywebview?.api?.scan_batch_folder) {
      setStatus('booting'); setProgress(0); return;
    }
    window.pywebview.api.scan_batch_folder(pitch).then(scan => {
      if (!scan || scan.total === 0) return;
      if (scan.done_count > 0) {
        setBatchScanPrompt(scan);
        return;
      }
      setStatus('booting'); setProgress(0);
      window.pywebview.api.process_batch_queue(scan.todo, pitch);
    });
  };

  const startProcessing = () => {
    if (!canStart || status !== 'idle') return;

    if (batchMode) { startBatch(); return; }

    setStatus('booting');
    setProgress(0);

    if (window.pywebview?.api?.process_file && file?.path) {
      // Push current settings synchronously THEN start — avoids race where
      // user clicks 4-stem then Separate before save_settings has propagated.
      const sync = window.pywebview.api.save_settings?.({
        output_dir: outputPath, watch_dir: watchDir, skip_vocals: skipVocals,
        stem_mode: String(splitMode), hq_preview: hqPreview, hide_voc: hideVoc,
        theme: dark ? 'dark' : 'light', quality, fine_tune: fineTune,
      });
      Promise.resolve(sync).finally(() => {
        window.pywebview.api.process_file(file.path, pitch, skipVocals, false);
      });
      return;
    }

    // dev fallback — simulated progress
    bootRef.current = setTimeout(() => {
      setStatus('running');
      startTime.current = performance.now();
      const total = 15000;
      tickRef.current = setInterval(() => {
        const elapsed = performance.now() - startTime.current;
        const p = Math.min(1, elapsed / total);
        setProgress(p);
        setEta(formatTime(Math.max(0, total - elapsed)));
        if (p >= 1) {
          clearInterval(tickRef.current);
          setEta('00:00');
          setTimeout(() => setStatus('done'), 700);
        }
      }, 80);
    }, 5000);
  };

  const reset = () => {
    clearTimeout(bootRef.current);
    clearInterval(tickRef.current);
    setStatus('idle');
    setProgress(0);
    setEta('—');
    setFile(null);
    setPitch(0);
    setBatchPos(null);
  };

  const pickFolder = () => {
    if (window.pywebview?.api?.browse_directory) {
      window.pywebview.api.browse_directory().then(p => p && setTweakFn('outputPath', p));
    } else {
      const next = prompt('Output folder', outputPath);
      if (next) setTweakFn('outputPath', next);
    }
  };

  const pickWatchDir = () => {
    if (window.pywebview?.api?.browse_directory) {
      window.pywebview.api.browse_directory().then(p => p && setWatchDir(p));
    } else {
      const next = prompt('Watch folder', watchDir);
      if (next) setWatchDir(next);
    }
  };

  const busy = status === 'booting' || status === 'running';
  const showPitch = status === 'idle' && (file !== null || batchMode);

  return (
    <div className={`app ${dark ? '' : 'light'}`}>
      <div className="card">
        {batchScanPrompt && (
          <BatchScanModal
            scan={batchScanPrompt}
            onConfirm={(todo) => {
              setBatchScanPrompt(null);
              setStatus('booting'); setProgress(0);
              window.pywebview?.api?.process_batch_queue?.(todo, pitch);
            }}
            onCancel={() => setBatchScanPrompt(null)}
            onOpenFolder={() => { window.pywebview?.api?.open_target_dir?.(true); }}
          />
        )}
        {overwritePrompt && (
          <OverwriteModal
            name={overwritePrompt.name}
            sub={overwritePrompt.sub}
            kind={overwritePrompt.kind}
            onOverwrite={() => {
              const { path, pitch } = overwritePrompt;
              setOverwritePrompt(null);
              setStatus('booting');
              setProgress(0);
              window.pywebview?.api?.confirm_overwrite(path, pitch);
            }}
            onCancel={() => { setOverwritePrompt(null); setStatus('idle'); setProgress(0); }}
            onOpenFolder={() => { if (window.pywebview) window.pywebview.api.open_pending_folder(); }}
          />
        )}

        {settingsOpen && (
          <SettingsPanel
            outputPath={outputPath}
            watchDir={watchDir}
            onOutputPath={pickFolder}
            onWatchDir={pickWatchDir}
            onClose={() => setSettingsOpen(false)}
            skipVocals={skipVocals}
            onSkipVocals={setSkipVocals}
            hqPreview={hqPreview}
            onHqPreview={setHqPreview}
            hideVoc={hideVoc}
            onHideVoc={setHideVoc}
            onCopyPath={copyPath}
            quality={quality}
            onQuality={setQuality}
            fineTune={fineTune}
            onFineTune={setFineTune}
          />
        )}

        <header className="topbar">
          <span className="brand-name">PANDORA</span>
          <div style={{display:'flex', alignItems:'center', gap:14}}>
            <StatusBar status={status} />
            <button className="theme-btn" onClick={() => setDark(d => !d)} title="Toggle theme">
              {dark
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              }
            </button>
            <button className="theme-btn" onClick={() => setSettingsOpen(true)} title="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </header>

        <DropZone
          onFile={setFile}
          onClear={() => setFile(null)}
          onReset={reset}
          file={file}
          status={status}
          batchMode={batchMode}
          watchDir={watchDir}
          onWatchDir={pickWatchDir}
          onOpenDir={() => { if (window.pywebview) window.pywebview.api.open_watch_dir(); }}
          progress={progress}
          eta={eta}
          splitMode={splitMode}
          batchPos={batchPos}
          hqLoading={hqLoading}
        />

        {showPitch && (
          <PitchRow file={file} pitch={pitch} onPitch={setPitch} batchMode={batchMode} hqPreview={hqPreview} onHqLoading={setHqLoading} fineTune={fineTune} />
        )}

        <div className="controls-block">
          <div className="mode-row">
            <div className="mode-group">
              <span className="ctrl-label">Mode</span>
              <StemPicker value={splitMode} onChange={(v) => setTweakFn('splitMode', v)} disabled={status !== 'idle'} skipVocals={skipVocals} onSkipVocals={setSkipVocals} showVoc={!hideVoc && !!(file || batchMode)} disabledModes={quality === 'studio' ? [6] : []} />
            </div>
            <div className="mode-group">
              <span className="ctrl-label">Batch</span>
              <button
                className={`batch-btn${batchMode ? ' active' : ''}${status !== 'idle' ? ' btn-disabled' : ''}`}
                onClick={() => { if (status !== 'idle') return; setBatchMode(b => !b); if (file) setFile(null); }}
              >
                {batchMode ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {status === 'idle' && (
            <button className="separate-btn" onClick={startProcessing} disabled={!canStart || (batchMode && batchFileCount === 0)}>
              {batchMode
                ? (batchFileCount === 0 ? 'Batch folder empty..' : 'Start Batch')
                : 'Separate'}
            </button>
          )}
          {busy && (
            <button className="separate-btn separate-btn--cancel" onClick={reset}>
              Cancel
            </button>
          )}
          {status === 'done' && (
            <button className="separate-btn separate-btn--new" onClick={reset}>
              New Track
            </button>
          )}
        </div>

        <div className="divider-line" />

        <div className="output-section">
          <span
            className="output-path"
            onClick={(e) => copyPath(outputPath, e)}
            title="Click to copy"
          >{outputDisplay}</span>
          {pathCopied && (
            <div className="copy-toast" style={{left: pathCopied.x, top: pathCopied.y}}>copied</div>
          )}
          <button className={`open-folder-btn${status === 'done' ? ' open-folder-btn--ready' : ''}`} onClick={() => {
            if (status === 'done' && batchMode) {
              window.pywebview?.api?.open_target_dir?.(true);
            } else if (status === 'done') {
              window.pywebview?.api?.open_output?.();
            } else {
              window.pywebview?.api?.open_target_dir?.(batchMode);
            }
          }}>
            Open Folder
          </button>
        </div>

      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function formatBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b/1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b/1024/1024).toFixed(1)} MB`;
  return `${(b/1024/1024/1024).toFixed(2)} GB`;
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
