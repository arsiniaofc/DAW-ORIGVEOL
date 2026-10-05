import React, { useState } from 'react';
import { X, Check, Sparkles, RefreshCw, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { Scale, TuningSystem } from '../types/daw';
import { generateProceduralScale, ScaleGenParams, isStepInScale } from '../core/scaleGenerator';
import { getStepLabel, getFrequency } from '../core/microtonal';
import { audioEngine } from '../audio/engine';

interface ScaleGeneratorModalProps {
  currentScale: Scale;
  tuning: TuningSystem;
  isOpen: boolean;
  onClose: () => void;
  onApplyScale: (scale: Scale, enableSnap: boolean) => void;
}

export const ScaleGeneratorModal: React.FC<ScaleGeneratorModalProps> = ({
  currentScale,
  tuning,
  isOpen,
  onClose,
  onApplyScale,
}) => {
  const N = tuning.divisionsPerOctave;

  const [root, setRoot] = useState<number>(currentScale.root);
  const [noteCount, setNoteCount] = useState<number>(Math.min(N, currentScale.steps.length || 7));
  const [density, setDensity] = useState<number>(currentScale.density || 0.4);
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [consonanceTarget, setConsonanceTarget] = useState<number>(currentScale.consonance || 70);
  const [tensionTarget, setTensionTarget] = useState<number>(currentScale.tension || 35);
  const [minInterval, setMinInterval] = useState<number>(1);
  const [maxInterval, setMaxInterval] = useState<number>(Math.max(2, Math.floor(N / 3)));
  const [algorithm, setAlgorithm] = useState<ScaleGenParams['algorithm']>(
    (currentScale.algorithm as any) || 'euclidean'
  );

  const [generatedScale, setGeneratedScale] = useState<Scale>(currentScale);
  const [enableSnap, setEnableSnap] = useState<boolean>(true);
  const [isPlayingArp, setIsPlayingArp] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerate = () => {
    const params: ScaleGenParams = {
      root,
      noteCount,
      density,
      symmetry,
      consonanceTarget,
      tensionTarget,
      minInterval,
      maxInterval,
      algorithm,
    };
    const newScale = generateProceduralScale(params, tuning);
    setGeneratedScale(newScale);
  };

  const handlePlayScaleArp = async () => {
    if (isPlayingArp) return;
    setIsPlayingArp(true);
    const ctx = await audioEngine.initAudio();

    const baseOctaveStep = N * 4;
    const stepsToPlay = generatedScale.steps.map((s) => baseOctaveStep + s + generatedScale.root);
    // Add octave completion
    stepsToPlay.push(baseOctaveStep + N + generatedScale.root);

    let delaySec = 0;
    stepsToPlay.forEach((step, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = getFrequency(step, tuning);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delaySec);

      const startTime = ctx.currentTime + delaySec;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);

      delaySec += 0.12;
    });

    setTimeout(() => setIsPlayingArp(false), (delaySec + 0.3) * 1000);
  };

  const handleApply = () => {
    onApplyScale(generatedScale, enableSnap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#16181e] border border-[#2b303d] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1b1e26] border-b border-[#292e3b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Procedural Scale Generator ({N}-TET Tuning Context)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282d3b] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Algorithm & Basic Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121419] p-4 rounded border border-[#242936]">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Generation Algorithm:
              </label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as any)}
                className="w-full bg-[#1b1f28] border border-[#303646] rounded px-2.5 py-1.5 text-xs text-emerald-300 focus:outline-none"
              >
                <option value="euclidean">Euclidean (Maximally Even)</option>
                <option value="harmonic_entropy">Harmonic Entropy (Consonant)</option>
                <option value="golden_ratio">Golden Ratio (φ Distribution)</option>
                <option value="euler_lattice">Euler Prime Tonnetz</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Root Note:
              </label>
              <select
                value={root}
                onChange={(e) => setRoot(parseInt(e.target.value))}
                className="w-full bg-[#1b1f28] border border-[#303646] rounded px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none"
              >
                {Array.from({ length: Math.min(N, 24) }).map((_, i) => {
                  const label = getStepLabel(N * 4 + i, tuning);
                  return (
                    <option key={i} value={i}>
                      Step {i}: {label.name} ({label.cents}c)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Note Count ({noteCount} of {N}):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={3}
                  max={Math.min(N, 32)}
                  value={noteCount}
                  onChange={(e) => setNoteCount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#2b303d] rounded accent-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-white w-6 text-right">
                  {noteCount}
                </span>
              </div>
            </div>
          </div>

          {/* Acoustic & Structural Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-[#121419] p-4 rounded border border-[#242936]">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Consonance Target:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={consonanceTarget}
                  onChange={(e) => setConsonanceTarget(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#2b303d] rounded accent-emerald-500"
                />
                <span className="text-xs font-mono text-zinc-300 w-8">{consonanceTarget}%</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Tension Target:</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={tensionTarget}
                  onChange={(e) => setTensionTarget(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#2b303d] rounded accent-amber-500"
                />
                <span className="text-xs font-mono text-zinc-300 w-8">{tensionTarget}%</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-400 block mb-1">Min/Max Interval Steps:</label>
              <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                <input
                  type="number"
                  min={1}
                  max={maxInterval}
                  value={minInterval}
                  onChange={(e) => setMinInterval(parseInt(e.target.value) || 1)}
                  className="w-10 bg-[#1b1f28] border border-[#303646] rounded p-1 text-center font-mono"
                />
                <span>to</span>
                <input
                  type="number"
                  min={minInterval}
                  max={Math.floor(N / 2)}
                  value={maxInterval}
                  onChange={(e) => setMaxInterval(parseInt(e.target.value) || 3)}
                  className="w-10 bg-[#1b1f28] border border-[#303646] rounded p-1 text-center font-mono"
                />
              </div>
            </div>

            <div className="flex items-center pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={symmetry}
                  onChange={(e) => setSymmetry(e.target.checked)}
                  className="rounded bg-[#1b1f28] border-[#303646] text-emerald-500 focus:ring-0"
                />
                <span>Enforce Symmetry</span>
              </label>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate / Regenerate Scale</span>
            </button>

            <button
              onClick={handlePlayScaleArp}
              disabled={isPlayingArp}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-colors ${
                isPlayingArp
                  ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                  : 'bg-[#1e222c] border-[#2c3342] text-zinc-200 hover:bg-[#282d3b]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPlayingArp ? 'Playing Scale...' : 'Audition Scale (Arpeggio)'}</span>
            </button>
          </div>

          {/* Generated Result Preview */}
          <div className="bg-[#0e1014] p-4 rounded border border-[#232733] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-emerald-400 tracking-wide">
                  {generatedScale.name}
                </h3>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Internal Step Intervals: [{generatedScale.steps.join(', ')}]
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-emerald-300 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Consonance: {generatedScale.consonance}%</span>
                </div>
                <div className="flex items-center gap-1 text-amber-300 font-mono">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tension: {generatedScale.tension}%</span>
                </div>
              </div>
            </div>

            {/* Octave Visual Keyboard Step Cells */}
            <div className="flex flex-wrap gap-1 pt-2 border-t border-[#1e232e]">
              {Array.from({ length: N }).map((_, stepIdx) => {
                const inScale = isStepInScale(stepIdx, generatedScale, N);
                const isRoot = stepIdx === generatedScale.root;
                const label = getStepLabel(N * 4 + stepIdx, tuning);

                return (
                  <div
                    key={stepIdx}
                    className={`flex flex-col items-center justify-center min-w-[32px] h-10 px-1 rounded border text-[10px] font-mono transition-all ${
                      isRoot
                        ? 'bg-emerald-500 text-black border-emerald-300 font-bold shadow-xs'
                        : inScale
                        ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/50 font-semibold'
                        : 'bg-[#15171d] text-zinc-600 border-[#222630]'
                    }`}
                  >
                    <span>{label.name.split(' ')[0]}</span>
                    <span className="text-[8px] opacity-70">§{stepIdx}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Snap to Scale Toggle Option */}
          <div className="flex items-center gap-2 bg-[#121419] p-3 rounded border border-[#242936]">
            <input
              type="checkbox"
              id="snap-to-scale-opt"
              checked={enableSnap}
              onChange={(e) => setEnableSnap(e.target.checked)}
              className="rounded bg-[#1b1f28] border-[#303646] text-emerald-500 focus:ring-0"
            />
            <label htmlFor="snap-to-scale-opt" className="text-xs text-zinc-200 cursor-pointer">
              <span className="font-semibold text-emerald-400">Enable Snap to Scale:</span>{' '}
              Automatically constrain drawn notes and moved pitches to lock to this scale in the Piano Roll.
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#14161c] border-t border-[#252934] px-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-zinc-300 hover:bg-[#222632]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Scale to Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
