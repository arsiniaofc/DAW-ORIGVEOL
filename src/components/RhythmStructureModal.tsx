import React, { useState } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, HelpCircle, Check } from 'lucide-react';
import { RhythmStructure } from '../types/daw';
import { PRESET_RHYTHMS, createRhythmStructure } from '../core/rhythm';

interface RhythmStructureModalProps {
  currentRhythm: RhythmStructure;
  isOpen: boolean;
  onClose: () => void;
  onApplyRhythm: (newRhythm: RhythmStructure) => void;
}

export const RhythmStructureModal: React.FC<RhythmStructureModalProps> = ({
  currentRhythm,
  isOpen,
  onClose,
  onApplyRhythm,
}) => {
  const [groups, setGroups] = useState<number[]>([...currentRhythm.groups]);

  if (!isOpen) return null;

  const totalBeats = groups.reduce((acc, g) => acc + g, 0);

  const handleAddGroup = () => {
    if (groups.length < 12) {
      setGroups([...groups, 4]);
    }
  };

  const handleRemoveGroup = (index: number) => {
    if (groups.length > 1) {
      setGroups(groups.filter((_, i) => i !== index));
    }
  };

  const handleChangeGroup = (index: number, delta: number) => {
    const updated = [...groups];
    const newVal = Math.max(1, Math.min(16, updated[index] + delta));
    updated[index] = newVal;
    setGroups(updated);
  };

  const handleSelectPreset = (presetGroups: number[]) => {
    setGroups([...presetGroups]);
  };

  const handleApply = () => {
    const newRhythm = createRhythmStructure(groups);
    onApplyRhythm(newRhythm);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#16181e] border border-[#2b303d] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="h-12 bg-[#1b1e26] border-b border-[#292e3b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Global Rhythm Structure & Compound Meters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282d3b] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Concept Explanation */}
          <div className="bg-[#12141a] border border-[#232836] p-3 rounded text-xs text-zinc-300 leading-relaxed flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white">Global Temporal Metric: </span>
              In this DAW, meter is not restricted to traditional 4/4 or 3/4. You can define compound additive groups like{' '}
              <code className="text-cyan-300 font-mono">[4, 4, 3, 3]</code> or{' '}
              <code className="text-cyan-300 font-mono">[3, 2, 2, 3]</code>. The piano roll and timeline grids, snap points, and playhead accents will synchronize dynamically to these subdivisions.
            </div>
          </div>

          {/* Interactive Groups Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300">
                Active Group Sequence:
              </label>
              <span className="text-xs font-mono text-cyan-300">
                Total Cycle: <span className="font-bold text-white">{totalBeats}</span> beats
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-[#121419] p-3.5 rounded border border-[#242936]">
              {groups.map((groupSize, index) => (
                <div
                  key={index}
                  className="flex items-center bg-[#1c202a] border border-[#2e3444] rounded px-2 py-1.5 gap-2 shadow-xs group"
                >
                  <span className="text-[10px] font-mono text-zinc-500">#{index + 1}</span>
                  <span className="w-7 text-center font-mono font-bold text-lg text-cyan-300">
                    {groupSize}
                  </span>

                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleChangeGroup(index, 1)}
                      className="p-0.5 rounded hover:bg-[#2c3344] text-zinc-400 hover:text-white"
                      title="Increase group beats"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => handleChangeGroup(index, -1)}
                      className="p-0.5 rounded hover:bg-[#2c3344] text-zinc-400 hover:text-white"
                      title="Decrease group beats"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>

                  {groups.length > 1 && (
                    <button
                      onClick={() => handleRemoveGroup(index)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 ml-1 transition-colors"
                      title="Remove group"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

              {groups.length < 12 && (
                <button
                  onClick={handleAddGroup}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#1f2430] hover:bg-[#2a3040] border border-dashed border-[#343b4e] text-xs font-medium text-cyan-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Group</span>
                </button>
              )}
            </div>
          </div>

          {/* Visual Grid Representation Preview */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Visual Grid Preview (One Measure Cycle):
            </label>
            <div className="bg-[#0e1014] p-3 rounded border border-[#232733] font-mono text-xs overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {groups.map((size, gIdx) => (
                  <div
                    key={gIdx}
                    className="flex items-center border-l-2 border-r-2 border-cyan-500/80 bg-cyan-950/20 px-2 py-2 rounded-xs"
                  >
                    <div className="flex gap-2">
                      {Array.from({ length: size }).map((_, beatIdx) => (
                        <div
                          key={beatIdx}
                          className={`w-7 h-7 flex flex-col items-center justify-center rounded text-[11px] font-bold ${
                            beatIdx === 0
                              ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50'
                              : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/30'
                          }`}
                        >
                          <span>{beatIdx + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-zinc-500 mt-2">
                Cyan blocks highlight downbeat accents at the start of each compound group.
              </div>
            </div>
          </div>

          {/* Popular Presets */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Experimental & Traditional Compound Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_RHYTHMS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset.groups)}
                  className={`text-left p-2.5 rounded border text-xs transition-colors ${
                    JSON.stringify(groups) === JSON.stringify(preset.groups)
                      ? 'bg-cyan-950/40 border-cyan-500 text-white'
                      : 'bg-[#15171f] border-[#252a36] text-zinc-300 hover:bg-[#1d212c]'
                  }`}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-14 bg-[#14161c] border-t border-[#252934] px-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-zinc-300 hover:bg-[#222632]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-5 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply to Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
