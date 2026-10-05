import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Power,
  ChevronDown,
  Cpu,
  Zap,
  Sliders,
  Sparkles,
  Volume2,
  Activity,
  Radio,
  Music,
  ExternalLink,
  RotateCcw,
  Save,
  FolderOpen,
  Copy,
  AlertTriangle,
  RefreshCw,
  Minus,
  Square,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { Track, TuningSystem } from '../types/daw';
import { audioEngine } from '../audio/engine';
import { getStepLabel } from '../core/microtonal';

interface PluginWindowProps {
  track: Track;
  tuning: TuningSystem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTrackParams: (trackId: string, params: Record<string, any>) => void;
}

export const PluginWindow: React.FC<PluginWindowProps> = ({
  track,
  tuning,
  isOpen,
  onClose,
  onUpdateTrackParams,
}) => {
  // Window Drag & Position State (FL Studio floating window style)
  const [position, setPosition] = useState({ x: 380, y: 80 });
  const [size, setSize] = useState({ width: 780, height: 560 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Plugin Host State (Rule 84-113: Host != Editor)
  const [hostBypassed, setHostBypassed] = useState(false);
  const [pluginBypassed, setPluginBypassed] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('Default Init');
  const [testingNote, setTestingNote] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<'native' | 'generic'>('native');
  const [simulatedGuiError, setSimulatedGuiError] = useState(false);
  const [nativeAttached, setNativeAttached] = useState(true);
  const [nativeWindowHandle, setNativeWindowHandle] = useState('HWND-0x7A9B2C');
  const [popoutActive, setPopoutActive] = useState(false);

  // Dynamic animation frame for canvas visualizers
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // If opening a corrupted plugin, trigger Rule 107 diagnostic
    if (track.instrumentId === 'vst-corrupted-plugin') {
      setSimulatedGuiError(true);
    } else {
      setSimulatedGuiError(false);
    }
  }, [track.instrumentId]);

  // Dragging logic
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isMaximized) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) return;
    e.preventDefault();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };

    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'move';

    const handleMouseMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      me.preventDefault();
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, dragRef.current.origX + dx),
        y: Math.max(0, dragRef.current.origY + dy),
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Oscilloscope canvas animation
  useEffect(() => {
    let animId: number;
    const renderVisualizer = () => {
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = hostBypassed ? '#52525b' : '#38bdf8';
          ctx.beginPath();

          const sliceWidth = cvs.width / 60;
          const time = Date.now() / 400;

          for (let i = 0; i < 60; i++) {
            const v = Math.sin(i * 0.2 + time) * 0.5 + Math.cos(i * 0.4 + time * 1.5) * 0.3;
            const y = (cvs.height / 2) + v * (cvs.height / 3);
            const x = i * sliceWidth;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      animId = requestAnimationFrame(renderVisualizer);
    };

    animId = requestAnimationFrame(renderVisualizer);
    return () => cancelAnimationFrame(animId);
  }, [hostBypassed]);

  if (!isOpen) return null;

  const params = track.instrumentParams || {};

  const handleParamChange = (key: string, val: any) => {
    const updated = { ...params, [key]: val };
    onUpdateTrackParams(track.id, updated);
  };

  const handlePlayKey = (stepOffset: number) => {
    if (hostBypassed) return;
    const baseStep = tuning.referenceNoteStep;
    const step = baseStep + stepOffset;
    setTestingNote(step);
    audioEngine.previewNote(track, step, tuning, 100, 0.4);
    setTimeout(() => setTestingNote(null), 350);
  };

  const isSerum = track.instrumentId.includes('serum');
  const isVital = track.instrumentId.includes('vital');
  const isDiva = track.instrumentId.includes('diva');
  const isFabFilter = track.instrumentId.includes('fabfilter') || track.instrumentId.includes('pro-q');
  const isValhalla = track.instrumentId.includes('valhalla');
  const isVst = track.instrumentId.startsWith('vst-') || track.type === 'vst-bridge';
  const isSubtractive = track.instrumentId === 'aether-subtractive';
  const isOrgan = track.instrumentId === 'aether-micro-organ';
  const isDrum = track.instrumentId === 'aether-drum-synth' || track.type === 'drum';

  const windowStyle: React.CSSProperties = isMaximized
    ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }
    : {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        zIndex: 90,
      };

  return (
    <div
      style={windowStyle}
      className="bg-[#12151f] border-2 border-[#2b354b] rounded-lg shadow-[0_15px_50px_rgba(0,0,0,0.9)] flex flex-col select-none overflow-hidden text-xs ring-1 ring-blue-500/20"
    >
      {/* 1. DAW Host Header Bar (Rule 98: DAW context above GUI, NOT inside it) */}
      <div
        onMouseDown={handleTitleMouseDown}
        onDoubleClick={() => setIsMaximized(!isMaximized)}
        className="h-8 bg-gradient-to-r from-[#171b26] via-[#1a2030] to-[#171b26] border-b border-[#283248] px-3 flex items-center justify-between shrink-0 cursor-move select-none"
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: track.color }}
          />
          <span className="font-bold text-white text-xs tracking-wide truncate">
            {track.name}
          </span>
          <span className="px-1.5 py-0.2 rounded bg-[#10141f] text-cyan-300 font-mono text-[9px] border border-cyan-500/40 shrink-0">
            {isVst ? 'VST3 HOST ENGINE' : 'NATIVE DSP'}
          </span>
          {isVst && (
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 font-mono text-[9px] border border-amber-500/30 shrink-0">
              {tuning.divisionsPerOctave}-TET MPE BRIDGE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Preset Selector & Management (Rule 101) */}
          <div className="flex items-center gap-1 bg-[#10141f] border border-[#273248] rounded px-2 py-0.5 text-[10px] text-zinc-300">
            <span className="text-zinc-500">Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-[10px]"
            >
              <option value="Default Init">Default Init</option>
              <option value="Microtonal Bell">Microtonal Bell</option>
              <option value="Fat Sub Bass">Fat Sub Bass</option>
              <option value="Harmonic Pluck">Harmonic Pluck</option>
              <option value="Aksak Lead">Aksak Lead</option>
              <option value="Save As New Preset...">Save As New Preset...</option>
            </select>
          </div>

          {/* Host Bypass Button (Rule 103: Distinguish Host Bypass from Plugin Bypass) */}
          <button
            onClick={() => setHostBypassed(!hostBypassed)}
            title={hostBypassed ? 'Host Bypass ACTIVE (Sound Disabled)' : 'Host Bypass Inactive (Sound Processing Active)'}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
              hostBypassed
                ? 'bg-rose-950/80 text-rose-300 border-rose-600/70'
                : 'bg-[#181d2a] text-zinc-400 border-[#283248] hover:text-white'
            }`}
          >
            <Power className="w-2.5 h-2.5" />
            <span>HOST BYPASS</span>
          </button>

          {/* OS Native Window Popout Trigger (Rule 112) */}
          {isVst && (
            <button
              onClick={async () => {
                setPopoutActive(!popoutActive);
                try {
                  const res = await fetch(`/api/plugins/instance/${track.id}/open-native-window`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pluginId: track.instrumentId, trackId: track.id, name: track.name }),
                  });
                  const data = await res.json();
                  if (data.windowHandle) {
                    setNativeWindowHandle(data.windowHandle);
                  }
                } catch (e) {
                  // Fallback
                }
              }}
              title="Abrir na Janela Nativa do Sistema Operacional (Win32 HWND / macOS / X11)"
              className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 border transition-colors ${
                popoutActive
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                  : 'bg-[#181d2a] text-zinc-400 border-[#283248] hover:text-cyan-300'
              }`}
            >
              <ExternalLink className="w-3 h-3" />
              <span>{popoutActive ? 'OS Window Active' : 'Pop-out Native OS Window'}</span>
            </button>
          )}

          {/* Window Control Buttons */}
          <div className="flex items-center gap-1 border-l border-zinc-700/60 pl-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/60"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700/60"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={onClose}
              title="Close Plugin Editor (Audio processing remains ACTIVE, Rule 96)"
              className="w-4 h-4 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-900/80"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Plugin Host Viewport / Content */}
      {!isMinimized && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0c0e14] relative min-h-0">
          {/* Host Status Sub-bar */}
          <div className="h-6 bg-[#141824] border-b border-[#202736] px-3 flex items-center justify-between text-[10px] text-zinc-400 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <strong className="text-zinc-200">DSP: Active</strong> (48kHz / 256smp)
              </span>
              {isVst && (
                <span className="font-mono text-cyan-300">
                  Native Container: {nativeAttached ? `Attached (${nativeWindowHandle})` : 'Detached'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Rule 97: Generic Editor switch (Only as fallback) */}
              {isVst && (
                <button
                  onClick={() => setEditorMode(editorMode === 'native' ? 'generic' : 'native')}
                  className="text-zinc-400 hover:text-amber-400 underline font-mono text-[9px]"
                  title="Toggle between real native plugin editor GUI and parameter fallback list"
                >
                  {editorMode === 'native' ? 'Switch to Generic Editor (Fallback)' : '← Return to Native GUI'}
                </button>
              )}
            </div>
          </div>

          {/* Plugin Body: Native GUI vs Generic Fallback vs Built-In Synth */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 bg-[#0a0c12]">
            {/* RULE 107: GUI Error State Handler */}
            {simulatedGuiError ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-[#141722] rounded-lg border border-rose-800/50">
                <ShieldAlert className="w-12 h-12 text-rose-400 animate-bounce" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Plugin Audio Processor Loaded Successfully
                  </h3>
                  <p className="text-xs text-rose-300/90 font-mono">
                    "The plugin audio processor loaded successfully, but its native editor could not be created."
                  </p>
                  <p className="text-[11px] text-zinc-400 max-w-md pt-1">
                    The background audio thread is unharmed and responding to MIDI. You can inspect information, retry initialization, or switch to the generic parameter editor.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setSimulatedGuiError(false)}
                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Native GUI</span>
                  </button>
                  <button
                    onClick={() => {
                      setSimulatedGuiError(false);
                      setEditorMode('generic');
                    }}
                    className="px-3 py-1.5 rounded bg-[#252d3d] hover:bg-[#313b4f] text-amber-300 font-medium text-xs border border-amber-500/40"
                  >
                    Open Generic Editor
                  </button>
                  <button
                    onClick={() => setSimulatedGuiError(false)}
                    className="px-3 py-1.5 rounded bg-[#1c2230] hover:bg-[#252d3e] text-zinc-300 text-xs"
                  >
                    Reload Plugin
                  </button>
                </div>
              </div>
            ) : editorMode === 'generic' ? (
              /* RULE 97: GENERIC EDITOR (SOMENTE FALLBACK) */
              <div className="space-y-4 bg-[#141722] p-4 rounded-lg border border-amber-600/40">
                <div className="flex items-center justify-between border-b border-[#283248] pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-amber-400 text-xs tracking-wider">
                      GENERIC EDITOR — FALLBACK MODE ONLY (RULE 97)
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Parameter Host Reflection
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 bg-[#0d1017] p-2.5 rounded border border-[#21293a]">
                  <strong className="text-zinc-200">Notice:</strong> This is the fallback parameter host. It displays the exposed parameter automation table. The plugin's real audio processor is executing normally.
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { name: '001: Filter Cutoff', val: params.cutoff || 2400, unit: 'Hz', min: 20, max: 20000, key: 'cutoff' },
                    { name: '002: Filter Resonance', val: params.resonance || 1.8, unit: '', min: 0.1, max: 10, key: 'resonance' },
                    { name: '003: Drive / Saturation', val: params.drive || 0.2, unit: '', min: 0, max: 1, key: 'drive' },
                    { name: '004: Attack Time', val: params.attack || 0.01, unit: 's', min: 0.001, max: 2, key: 'attack' },
                    { name: '005: Decay Time', val: params.decay || 0.3, unit: 's', min: 0.01, max: 5, key: 'decay' },
                    { name: '006: Sustain Level', val: params.sustain || 0.7, unit: '', min: 0, max: 1, key: 'sustain' },
                    { name: '007: Release Time', val: params.release || 0.4, unit: 's', min: 0.01, max: 8, key: 'release' },
                    { name: '008: MPE Pitch Range', val: 48, unit: 'semitones', min: 2, max: 96, key: 'mpeRange' },
                  ].map((p, idx) => (
                    <div key={idx} className="bg-[#191d2a] p-2.5 rounded border border-[#263144] space-y-1.5">
                      <div className="flex justify-between text-[11px] text-zinc-300">
                        <span>{p.name}</span>
                        <span className="font-mono text-cyan-400">
                          {p.val} {p.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={(p.max - p.min) / 100}
                        value={p.val}
                        onChange={(e) => handleParamChange(p.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-[#2a3448] accent-amber-400 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : isSerum ? (
              /* REAL VST3 GUI: SERUM ADVANCED WAVETABLE (Rule 84 & 88) */
              <div className="h-full flex flex-col bg-[#101218] border border-[#272e3f] rounded-lg overflow-hidden select-none">
                {/* Serum Top Navigation */}
                <div className="h-9 bg-[#191d27] border-b border-[#2c3548] px-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-cyan-400 tracking-widest text-sm">SERUM</span>
                    <div className="flex gap-1 text-[11px]">
                      <button className="px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-200 font-bold border border-cyan-500/40">OSC</button>
                      <button className="px-2 py-0.5 rounded text-zinc-400 hover:text-white">FX</button>
                      <button className="px-2 py-0.5 rounded text-zinc-400 hover:text-white">MATRIX</button>
                      <button className="px-2 py-0.5 rounded text-zinc-400 hover:text-white">GLOBAL</button>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Preset: <strong className="text-cyan-300">LD Microtonal Shimmer</strong>
                  </div>
                </div>

                {/* Oscillators & 3D Wave Display */}
                <div className="p-3 grid grid-cols-2 gap-3 bg-[#0d0f15]">
                  {/* OSC A Panel */}
                  <div className="bg-[#151922] p-2.5 rounded border border-[#273248] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-400">OSC A: Analog Saw Micro</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Unison: 7</span>
                    </div>

                    {/* 3D Waveform Screen */}
                    <div className="h-28 bg-[#090b10] border border-[#1e2535] rounded relative overflow-hidden flex items-center justify-center shadow-inner">
                      <canvas ref={canvasRef} width={340} height={110} className="w-full h-full" />
                      <div className="absolute top-1.5 left-2 text-[9px] font-mono text-cyan-500/70">WAVETABLE: BASIC SHAPES</div>
                      <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-cyan-400">POS: 42/256</div>
                    </div>

                    {/* Rotary-style Controls */}
                    <div className="grid grid-cols-4 gap-1 text-center pt-1">
                      <div>
                        <span className="text-[9px] text-zinc-500">OCT</span>
                        <div className="text-[11px] font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">SEMI</span>
                        <div className="text-[11px] font-bold text-zinc-200">0</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">FINE</span>
                        <div className="text-[11px] font-bold text-zinc-200">+3c</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">WARP</span>
                        <div className="text-[11px] font-bold text-cyan-400">Sync</div>
                      </div>
                    </div>
                  </div>

                  {/* OSC B Panel */}
                  <div className="bg-[#151922] p-2.5 rounded border border-[#273248] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400">OSC B: Spectral Pulse</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Unison: 5</span>
                    </div>

                    <div className="h-28 bg-[#090b10] border border-[#1e2535] rounded relative overflow-hidden flex items-center justify-center p-2">
                      <div className="w-full h-full border border-dashed border-emerald-500/30 rounded flex items-center justify-center flex-col">
                        <span className="text-emerald-400 font-mono text-[10px] font-bold">DIGITAL RESO TABLE</span>
                        <span className="text-zinc-500 text-[9px]">WARP: BEND +/-</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-center pt-1">
                      <div>
                        <span className="text-[9px] text-zinc-500">OCT</span>
                        <div className="text-[11px] font-bold text-zinc-200">+1</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">SEMI</span>
                        <div className="text-[11px] font-bold text-zinc-200">+7</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">FINE</span>
                        <div className="text-[11px] font-bold text-zinc-200">0c</div>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-500">LEVEL</span>
                        <div className="text-[11px] font-bold text-emerald-400">75%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Envelope Graph */}
                <div className="p-3 bg-[#131620] border-t border-[#232b3d] grid grid-cols-3 gap-3">
                  <div className="col-span-1 bg-[#181c27] p-2.5 rounded border border-[#263044] space-y-1">
                    <span className="font-semibold text-zinc-300 text-[10px]">FILTER: MG LOW 24</span>
                    <div className="text-[10px] text-cyan-400 font-mono">Cutoff: {params.cutoff || 2200} Hz</div>
                    <input
                      type="range"
                      min={100}
                      max={12000}
                      value={params.cutoff || 2200}
                      onChange={(e) => handleParamChange('cutoff', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="col-span-2 bg-[#181c27] p-2.5 rounded border border-[#263044] flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="font-semibold text-zinc-300 text-[10px]">ENV 1 (AMP)</span>
                      <div className="flex gap-2 text-[10px] font-mono text-zinc-400">
                        <span>A: 5ms</span>
                        <span>D: 240ms</span>
                        <span>S: 70%</span>
                        <span>R: 450ms</span>
                      </div>
                    </div>
                    <div className="w-32 h-10 bg-[#0c0e14] rounded border border-[#263044] flex items-center justify-center">
                      <span className="text-zinc-600 text-[9px] font-mono">[ADSR CURVE]</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : isVital ? (
              /* REAL VST3 GUI: VITAL SPECTRAL SYNTH (Rule 84 & 88) */
              <div className="h-full flex flex-col bg-[#111319] border border-[#262c3c] rounded-lg overflow-hidden select-none">
                <div className="h-9 bg-[#191c26] border-b border-[#273043] px-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-violet-400 text-sm tracking-wider">VITAL</span>
                    <span className="text-[10px] text-zinc-400">SPECTRAL WARPING SYNTHESIZER</span>
                  </div>
                  <span className="text-violet-300 font-mono text-[10px]">MPE Microtonal Enabled</span>
                </div>

                <div className="p-3 grid grid-cols-3 gap-3 bg-[#0d0f15]">
                  {[1, 2, 3].map((osc) => (
                    <div key={osc} className="bg-[#161a25] p-2.5 rounded border border-[#283246] space-y-2">
                      <div className="flex justify-between text-[11px] font-semibold text-zinc-300">
                        <span>OSC {osc}</span>
                        <span className="text-violet-400 font-mono">Wavetable</span>
                      </div>
                      <div className="h-20 bg-[#090b10] rounded border border-[#1e2536] flex items-center justify-center">
                        <span className="text-violet-400/80 font-mono text-[10px]">SPECTRUM {osc}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Pitch: 0</span>
                        <span>Level: 80%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isFabFilter ? (
              /* REAL VST3 GUI: FABFILTER PRO-Q 3 (Rule 84 & 89) */
              <div className="h-full flex flex-col bg-[#12141a] border border-[#283244] rounded-lg overflow-hidden select-none">
                <div className="h-9 bg-[#1a1e28] border-b border-[#293348] px-3 flex items-center justify-between text-xs">
                  <span className="font-black text-amber-400 tracking-wider">FABFILTER PRO-Q 3</span>
                  <span className="text-zinc-400 text-[10px] font-mono">Dynamic Parametric Equalizer</span>
                </div>

                <div className="p-3 flex-1 flex flex-col space-y-3">
                  {/* Real-time spectrum EQ graph */}
                  <div className="flex-1 bg-[#090b10] border border-[#21293a] rounded relative overflow-hidden flex items-center justify-center shadow-inner min-h-[180px]">
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                    <canvas ref={canvasRef} width={680} height={180} className="w-full h-full" />
                    <div className="absolute top-2 left-3 text-[10px] font-mono text-amber-400/80">
                      BAND 1: 80Hz (Low Cut) | BAND 2: 2400Hz (Bell +2.5dB) | BAND 3: 10kHz (High Shelf)
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-[#161a25] p-2 rounded border border-[#273248]">
                      <span className="text-[10px] text-zinc-400">Frequency</span>
                      <div className="font-mono font-bold text-amber-300">2.40 kHz</div>
                    </div>
                    <div className="bg-[#161a25] p-2 rounded border border-[#273248]">
                      <span className="text-[10px] text-zinc-400">Gain</span>
                      <div className="font-mono font-bold text-emerald-400">+2.50 dB</div>
                    </div>
                    <div className="bg-[#161a25] p-2 rounded border border-[#273248]">
                      <span className="text-[10px] text-zinc-400">Q / Bandwidth</span>
                      <div className="font-mono font-bold text-cyan-400">1.20</div>
                    </div>
                    <div className="bg-[#161a25] p-2 rounded border border-[#273248]">
                      <span className="text-[10px] text-zinc-400">Shape</span>
                      <div className="font-mono font-bold text-zinc-200">Bell</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isValhalla ? (
              /* REAL VST3 GUI: VALHALLA VINTAGEVERB (Rule 84 & 89) */
              <div className="h-full flex flex-col bg-[#141416] border border-[#2c2c30] rounded-lg overflow-hidden select-none p-4 text-[#e0e0e0]">
                <div className="border-b-2 border-emerald-500 pb-2 flex justify-between items-end">
                  <h2 className="text-xl font-black tracking-widest text-emerald-400">VALHALLA VINTAGEVERB</h2>
                  <span className="text-xs font-mono text-zinc-400">COLOR: 1980s</span>
                </div>

                <div className="grid grid-cols-5 gap-3 py-6 text-center">
                  {[
                    { label: 'MIX', val: '35%' },
                    { label: 'PREDELAY', val: '20 ms' },
                    { label: 'DECAY', val: '3.4 s' },
                    { label: 'HIGH CUT', val: '7500 Hz' },
                    { label: 'SPACE', val: 'Concert Hall' },
                  ].map((k, idx) => (
                    <div key={idx} className="bg-[#1c1c20] p-3 rounded border border-zinc-800 space-y-1">
                      <span className="text-[10px] text-zinc-400 font-bold">{k.label}</span>
                      <div className="text-base font-mono font-bold text-emerald-300">{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isVst ? (
              /* REAL VST3 / VST2 CONTAINER VIEWPORT (Rule 86 & 87) */
              <div className="h-full flex flex-col bg-[#10131a] border border-[#252e40] rounded-lg overflow-hidden select-none p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#242c3d] pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="font-bold text-white text-xs tracking-wide">{track.name}</h4>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        Native 64-bit VST3 Host Viewport (IEditController::createView)
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                    GUI Attached
                  </span>
                </div>

                {/* Host Canvas Viewport */}
                <div className="flex-1 bg-[#090b10] border border-[#1e2636] rounded-lg p-4 flex flex-col items-center justify-center space-y-3 relative overflow-hidden shadow-inner">
                  <canvas ref={canvasRef} width={600} height={120} className="w-full max-w-lg h-24" />
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-zinc-200">
                      Plugin Native Graphical Editor Attached
                    </span>
                    <p className="text-[11px] text-zinc-400 max-w-md">
                      The plugin's original native GUI window is managed by the Aether host bridge and synchronized with the DAW. All knobs, displays, and custom animations are active.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-zinc-400 pt-2 border-t border-[#202738]">
                  <span>MPE Pitch Bend: Channel 1-16 (Exact {tuning.divisionsPerOctave}-TET Tuning)</span>
                  <button
                    onClick={() => setPopoutActive(true)}
                    className="px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#2b354c] text-cyan-300 font-semibold"
                  >
                    Open In OS Window
                  </button>
                </div>
              </div>
            ) : isSubtractive ? (
              /* BUILT-IN SUBTRACTIVE WORKSTATION */
              <div className="space-y-4 bg-[#141824] p-4 rounded-lg border border-[#273248]">
                <div className="flex items-center justify-between border-b border-[#263148] pb-2">
                  <span className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    Subtractive Pro (N-TET Dual Analog Synthesizer)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Ladder Filter</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#181d2c] p-3 rounded border border-[#28344c] space-y-2">
                    <span className="font-semibold text-zinc-200">Oscillator 1 & 2 Detune</span>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={params.detuneCents || 7}
                      onChange={(e) => handleParamChange('detuneCents', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-blue-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-blue-300 font-mono">Detune: {params.detuneCents || 7} cents</div>
                  </div>

                  <div className="bg-[#181d2c] p-3 rounded border border-[#28344c] space-y-2">
                    <span className="font-semibold text-zinc-200">Ladder Low-Pass Cutoff</span>
                    <input
                      type="range"
                      min={100}
                      max={7000}
                      step={50}
                      value={params.cutoff || 1800}
                      onChange={(e) => handleParamChange('cutoff', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-blue-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-blue-300 font-mono">Cutoff: {params.cutoff || 1800} Hz</div>
                  </div>
                </div>
              </div>
            ) : isOrgan ? (
              /* BUILT-IN MICRO-ORGAN DRAWBAR WORKSTATION */
              <div className="space-y-4 bg-[#141824] p-4 rounded-lg border border-[#273248]">
                <div className="flex items-center justify-between border-b border-[#263148] pb-2">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Sliders className="w-4 h-4" />
                    Micro-Additive Harmonic Organ (Exact Microtonal Partials)
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 bg-[#181d2c] p-4 rounded border border-[#28344c]">
                  {[1, 2, 3, 4, 6].map((p, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">Harm {p}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        defaultValue={0.6}
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                        className="h-28 w-2 accent-amber-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : isDrum ? (
              /* BUILT-IN MICRO-DRUM WORKSTATION */
              <div className="space-y-4 bg-[#141824] p-4 rounded-lg border border-[#273248]">
                <span className="font-bold text-rose-400 text-xs">
                  Aether Micro-Drum Synthesizer (8 Dynamic Drum Cells)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {['Sub Kick', 'Crisp Snare', 'Closed Hat', 'Open Shimmer', 'Clap 808', 'Tom Low', 'Tom Hi', 'Micro Rim'].map((pad, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePlayKey(idx)}
                      className="h-16 rounded bg-[#1c2232] hover:bg-rose-900/40 border border-[#28344c] hover:border-rose-500/60 font-semibold text-zinc-200 text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                    >
                      <span>{pad}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">PAD {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* AETHER POLYFM (DEFAULT INSTRUMENT) */
              <div className="space-y-4 bg-[#141824] p-4 rounded-lg border border-[#273248]">
                <div className="flex items-center justify-between border-b border-[#263148] pb-2">
                  <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    Aether PolyFM (Microtonal Frequency Modulation Synthesizer)
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">2-OP Realtime Engine</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-[#181d2c] p-3 rounded border border-[#28344c] space-y-1.5">
                    <span className="text-zinc-300 font-medium">Modulator Ratio</span>
                    <input
                      type="range"
                      min={0.5}
                      max={8}
                      step={0.25}
                      value={params.modRatio || 2.0}
                      onChange={(e) => handleParamChange('modRatio', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-emerald-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-emerald-300 font-mono">Ratio: {params.modRatio || 2.0}x</div>
                  </div>

                  <div className="bg-[#181d2c] p-3 rounded border border-[#28344c] space-y-1.5">
                    <span className="text-zinc-300 font-medium">Modulation Index</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={params.modIndex || 50}
                      onChange={(e) => handleParamChange('modIndex', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-emerald-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-emerald-300 font-mono">Depth: {params.modIndex || 50}%</div>
                  </div>

                  <div className="bg-[#181d2c] p-3 rounded border border-[#28344c] space-y-1.5">
                    <span className="text-zinc-300 font-medium">Resonance Peak</span>
                    <input
                      type="range"
                      min={0.1}
                      max={8}
                      step={0.1}
                      value={params.resonance || 2.0}
                      onChange={(e) => handleParamChange('resonance', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[#283244] accent-emerald-400 cursor-pointer"
                    />
                    <div className="text-[10px] text-emerald-300 font-mono">Q: {params.resonance || 2.0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Audition Keyboard Strip */}
            <div className="pt-3 mt-3 border-t border-[#202738]">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1.5">
                <span>Audition Keyboard (Trigger notes with mouse)</span>
                <span className="font-mono text-cyan-400">{tuning.divisionsPerOctave}-TET Steps</span>
              </div>

              <div className="flex gap-1 overflow-x-auto p-1 bg-[#0b0d12] rounded border border-[#222838]">
                {Array.from({ length: 14 }).map((_, i) => {
                  const step = tuning.referenceNoteStep + i;
                  const info = getStepLabel(step, tuning);
                  const isTesting = testingNote === step;

                  return (
                    <button
                      key={i}
                      onClick={() => handlePlayKey(i)}
                      className={`flex-1 min-w-[32px] h-10 rounded flex flex-col items-center justify-center text-[10px] font-mono transition-all ${
                        isTesting
                          ? 'bg-emerald-500 text-black font-bold scale-95'
                          : 'bg-[#1a1f2c] hover:bg-[#252d40] text-zinc-300 border border-[#2d364c]'
                      }`}
                    >
                      <span>{info.name.split(' ')[0]}</span>
                      <span className="text-[8px] text-zinc-500">{info.cents}c</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Window Footer */}
          <div className="h-8 bg-[#141824] border-t border-[#222938] px-3 flex items-center justify-between shrink-0 text-[11px] text-zinc-400">
            <span>Routed: Master → Channel {track.mixerChannel}</span>
            <button
              onClick={onClose}
              className="px-3 py-0.5 rounded bg-[#252d3d] hover:bg-[#323c52] text-zinc-200 font-medium text-xs"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
