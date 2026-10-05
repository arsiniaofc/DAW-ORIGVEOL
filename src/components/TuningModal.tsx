import React, { useState } from 'react';
import { X, Check, Sliders, Info, Volume2 } from 'lucide-react';
import { TuningSystem } from '../types/daw';
import { TUNING_PRESETS, getFrequency, getStepLabel } from '../core/microtonal';
import { audioEngine } from '../audio/engine';

interface TuningModalProps {
  currentTuning: TuningSystem;
  isOpen: boolean;
  onClose: () => void;
  onApplyTuning: (newTuning: TuningSystem) => void;
}

export const TuningModal: React.FC<TuningModalProps> = ({
  currentTuning,
  isOpen,
  onClose,
  onApplyTuning,
}) => {
  const [divisions, setDivisions] = useState<number>(currentTuning.divisionsPerOctave);
  const [refPitchHz, setRefPitchHz] = useState<number>(currentTuning.referencePitchHz);
  const [previewingStep, setPreviewingStep] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: TuningSystem) => {
    setDivisions(preset.divisionsPerOctave);
    setRefPitchHz(preset.referencePitchHz);
  };

  const handleApply = () => {
    const existing = TUNING_PRESETS.find((p) => p.divisionsPerOctave === divisions);
    const updatedTuning: TuningSystem = {
      name: existing ? existing.name : `${divisions}-TET Custom Microtonal`,
      divisionsPerOctave: Math.max(1, Math.min(240, divisions)),
      referencePitchHz: Math.max(200, Math.min(600, refPitchHz)),
      referenceNoteStep: existing ? existing.referenceNoteStep : Math.floor(divisions * 4.75),
      description: existing ? existing.description : `Custom equal division into ${divisions} steps per octave.`,
    };

    onApplyTuning(updatedTuning);
    onClose();
  };

  const handleTestStep = async (step: number) => {
    setPreviewingStep(step);
    const mockTuning: TuningSystem = {
      name: 'Temp',
      divisionsPerOctave: divisions,
      referencePitchHz: refPitchHz,
      referenceNoteStep: Math.floor(divisions * 4.75),
    };

    const ctx = await audioEngine.initAudio();
    const freq = getFrequency(step, mockTuning);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);

    setTimeout(() => setPreviewingStep(null), 400);
  };

  const centsPerStep = Math.round((1200 / divisions) * 100) / 100;
  const tempTuning: TuningSystem = {
    name: 'Preview',
    divisionsPerOctave: divisions,
    referencePitchHz: refPitchHz,
    referenceNoteStep: Math.floor(divisions * 4.75),
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#16181e] border border-[#2b303d] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1b1e26] border-b border-[#292e3b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Microtonality & N-TET Tuning System
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
          {/* Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121419] p-4 rounded border border-[#242936]">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Divisions Per Octave (N-TET):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={divisions}
                  onChange={(e) => setDivisions(Math.max(1, parseInt(e.target.value) || 12))}
                  className="w-24 bg-[#1b1f28] border border-[#303646] rounded px-3 py-1.5 text-indigo-300 font-mono font-bold text-base focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-zinc-400">
                  Step interval: <span className="font-mono text-white font-bold">{centsPerStep}</span> cents
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                Reference Frequency (A4):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={300}
                  max={550}
                  step={0.1}
                  value={refPitchHz}
                  onChange={(e) => setRefPitchHz(parseFloat(e.target.value) || 440)}
                  className="w-24 bg-[#1b1f28] border border-[#303646] rounded px-3 py-1.5 text-indigo-300 font-mono font-bold text-base focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-zinc-400">Hz (Concert standard: 440 Hz)</span>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Popular Microtonal & Historical Systems:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TUNING_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-2.5 rounded border text-xs transition-colors ${
                    divisions === preset.divisionsPerOctave
                      ? 'bg-indigo-950/40 border-indigo-500 text-white'
                      : 'bg-[#15171f] border-[#252a36] text-zinc-300 hover:bg-[#1d212c]'
                  }`}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Scale Step Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300">
                Octave 4 Step Table & Auditory Test:
              </label>
              <span className="text-[11px] text-zinc-400">Click a note to hear its frequency</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-48 overflow-y-auto p-2 bg-[#0e1014] rounded border border-[#232733]">
              {Array.from({ length: Math.min(divisions, 36) }).map((_, i) => {
                const step = divisions * 4 + i;
                const info = getStepLabel(step, tempTuning);
                const isTesting = previewingStep === step;

                return (
                  <button
                    key={i}
                    onClick={() => handleTestStep(step)}
                    className={`flex flex-col items-center justify-center p-1.5 rounded border text-[11px] font-mono transition-colors ${
                      isTesting
                        ? 'bg-indigo-600 text-white border-indigo-400 scale-95'
                        : 'bg-[#171a22] border-[#262c3b] hover:bg-[#202533] text-zinc-300'
                    }`}
                  >
                    <span className="font-bold text-indigo-300">{info.name}</span>
                    <span className="text-[9px] text-zinc-400">{info.hz} Hz</span>
                    <span className="text-[9px] text-zinc-500">{info.cents}c</span>
                  </button>
                );
              })}
            </div>
            {divisions > 36 && (
              <div className="text-[10px] text-zinc-500 mt-1 italic">
                Showing first 36 of {divisions} divisions in octave 4.
              </div>
            )}
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
            className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Tuning to Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
