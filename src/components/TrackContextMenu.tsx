import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Track, Project, Pattern, Note } from '../types/daw';
import { BUILT_IN_INSTRUMENTS } from './AddTrackModal';

interface TrackContextMenuProps {
  x: number;
  y: number;
  track: Track;
  project: Project;
  activePattern: Pattern;
  onClose: () => void;
  onOpenPianoRoll: (trackId: string) => void;
  onUpdateTrack: (track: Track) => void;
  onCloneTrack: (trackId: string) => void;
  onDeleteTrack: (trackId: string) => void;
  onReplaceInstrument: (trackId: string, instrumentId: string, name: string) => void;
  onInsertTrack: (beforeTrackId: string) => void;
  onUpdatePatternNotes: (notes: Note[]) => void;
  onRecordHistory: (description: string) => void;
}

// In-memory clipboard for steps
let stepClipboard: Note[] = [];

const VIBRANT_COLORS = [
  '#38bdf8', '#34d399', '#f59e0b', '#f43f5e', '#a855f7',
  '#ec4899', '#06b6d4', '#84cc16', '#fb923c', '#6366f1',
];

export const TrackContextMenu: React.FC<TrackContextMenuProps> = ({
  x,
  y,
  track,
  project,
  activePattern,
  onClose,
  onOpenPianoRoll,
  onUpdateTrack,
  onCloneTrack,
  onDeleteTrack,
  onReplaceInstrument,
  onInsertTrack,
  onUpdatePatternNotes,
  onRecordHistory,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showReplaceSubmenu, setShowReplaceSubmenu] = useState(false);
  const [showInsertSubmenu, setShowInsertSubmenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameText, setRenameText] = useState(track.name);
  const [cutItself, setCutItself] = useState(true);
  const [midiThrough, setMidiThrough] = useState(true);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within screen boundaries
  const adjustedX = Math.min(x, window.innerWidth - 440);
  const adjustedY = Math.min(y, window.innerHeight - 440);

  const ticksPerBeat = project.rhythm.ticksPerBeat;
  const ticksPerStep = ticksPerBeat / 4; // 120 ticks
  const totalSteps = 16;

  // Track notes in active pattern
  const isDefaultTrack = project.tracks[0]?.id === track.id;
  const isThisTrackNote = (n: Note) => n.trackId === track.id || (!n.trackId && isDefaultTrack);

  // Fill steps helper
  const handleFillSteps = (interval: number) => {
    onRecordHistory(`Fill each ${interval} steps (${track.name})`);
    // Preserve other tracks' notes
    const otherNotes = activePattern.notes.filter((n) => !isThisTrackNote(n));

    const newNotes: Note[] = [];
    for (let step = 0; step < totalSteps; step += interval) {
      newNotes.push({
        id: `step-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}-${step}`,
        trackId: track.id,
        pitch: track.type === 'drum' ? 0 : project.tuning.referenceNoteStep,
        startTick: step * ticksPerStep,
        durationTicks: ticksPerStep,
        velocity: 100,
      });
    }

    onUpdatePatternNotes([...otherNotes, ...newNotes]);
    onClose();
  };

  // Rotate steps left / right
  const handleRotateSteps = (direction: 'left' | 'right') => {
    onRecordHistory(`Rotate steps ${direction} (${track.name})`);
    const otherNotes = activePattern.notes.filter((n) => !isThisTrackNote(n));
    const thisTrackNotes = activePattern.notes.filter(isThisTrackNote);

    const rotated = thisTrackNotes.map((n) => {
      let stepIdx = Math.round(n.startTick / ticksPerStep);
      if (direction === 'left') {
        stepIdx = (stepIdx - 1 + totalSteps) % totalSteps;
      } else {
        stepIdx = (stepIdx + 1) % totalSteps;
      }
      return {
        ...n,
        trackId: track.id,
        startTick: stepIdx * ticksPerStep,
      };
    });
    onUpdatePatternNotes([...otherNotes, ...rotated]);
    onClose();
  };

  // Cut / Copy / Paste steps
  const handleCopySteps = () => {
    stepClipboard = activePattern.notes.filter(isThisTrackNote);
    onClose();
  };

  const handleCutSteps = () => {
    stepClipboard = activePattern.notes.filter(isThisTrackNote);
    onRecordHistory(`Cut steps (${track.name})`);
    const otherNotes = activePattern.notes.filter((n) => !isThisTrackNote(n));
    onUpdatePatternNotes(otherNotes);
    onClose();
  };

  const handlePasteSteps = () => {
    if (stepClipboard.length > 0) {
      onRecordHistory(`Paste steps (${track.name})`);
      const otherNotes = activePattern.notes.filter((n) => !isThisTrackNote(n));
      const cloned = stepClipboard.map((n) => ({
        ...n,
        id: `step-pasted-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        trackId: track.id,
      }));
      onUpdatePatternNotes([...otherNotes, ...cloned]);
    }
    onClose();
  };

  // Color actions
  const handleRandomColor = () => {
    const nextColor = VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];
    onUpdateTrack({ ...track, color: nextColor });
    onClose();
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameText.trim()) {
      onUpdateTrack({ ...track, name: renameText.trim() });
    }
    setIsRenaming(false);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-[100] flex bg-[#fbfbfb] text-[#1c1c1c] text-xs font-sans rounded shadow-[0_12px_40px_rgba(0,0,0,0.45)] border border-[#c4c7cc] select-none py-1 ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-75"
    >
      {/* LEFT COLUMN */}
      <div className="w-[195px] flex flex-col border-r border-[#e0e2e6] py-0.5">
        {/* Piano Roll */}
        <button
          onClick={() => {
            onOpenPianoRoll(track.id);
            onClose();
          }}
          className="w-full text-left px-2.5 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between group transition-colors"
        >
          <div className="flex items-center gap-2">
            <Check className="w-3 h-3 text-[#1c1c1c] group-hover:text-white" />
            <span className="font-medium">Piano roll</span>
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-blue-100 font-mono italic">F7</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Graph editor</span>
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* Rename & Color */}
        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="px-2 py-1">
            <input
              type="text"
              autoFocus
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onBlur={handleRenameSubmit}
              className="w-full px-1.5 py-0.5 border border-blue-500 rounded bg-white text-black text-xs font-medium focus:outline-none"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsRenaming(true)}
            className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
          >
            <span><span className="underline">R</span>ename, color and icon...</span>
          </button>
        )}

        <button
          onClick={handleRandomColor}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Change color...</span>
        </button>

        <button
          onClick={handleRandomColor}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors font-medium text-emerald-700 hover:text-white"
        >
          <span>Random color</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Change icon...</span>
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* Load Sample / Cut Itself */}
        <button
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'audio/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                onUpdateTrack({ ...track, name: file.name.replace(/\.[^/.]+$/, ''), type: 'sampler' });
                onRecordHistory(`Loaded sample ${file.name}`);
              }
            };
            input.click();
            onClose();
          }}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span><span className="underline">L</span>oad sample...</span>
        </button>

        <button
          onClick={() => setCutItself(!cutItself)}
          className="w-full text-left px-2.5 py-1 hover:bg-[#2563eb] hover:text-white flex items-center gap-2 group transition-colors"
        >
          {cutItself ? (
            <Check className="w-3 h-3 text-[#1c1c1c] group-hover:text-white" />
          ) : (
            <div className="w-3" />
          )}
          <span><span className="underline">C</span>ut itself</span>
        </button>

        <div className="px-7 py-1 text-zinc-400 cursor-not-allowed">
          <span>Show waveform preview</span>
        </div>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* Insert Submenu */}
        <div
          onMouseEnter={() => setShowInsertSubmenu(true)}
          onMouseLeave={() => setShowInsertSubmenu(false)}
          className="relative"
        >
          <button className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between transition-colors">
            <span><span className="underline">I</span>nsert</span>
            <ChevronRight className="w-3 h-3 text-zinc-400" />
          </button>

          {showInsertSubmenu && (
            <div className="absolute left-full top-0 w-44 bg-[#fbfbfb] text-[#1c1c1c] rounded shadow-xl border border-[#c4c7cc] py-1 z-50">
              {BUILT_IN_INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    onInsertTrack(track.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center gap-2 truncate"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                  <span className="truncate">{inst.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Replace Submenu */}
        <div
          onMouseEnter={() => setShowReplaceSubmenu(true)}
          onMouseLeave={() => setShowReplaceSubmenu(false)}
          className="relative"
        >
          <button className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between transition-colors">
            <span><span className="underline">R</span>eplace</span>
            <ChevronRight className="w-3 h-3 text-zinc-400" />
          </button>

          {showReplaceSubmenu && (
            <div className="absolute left-full top-0 w-52 bg-[#fbfbfb] text-[#1c1c1c] rounded shadow-xl border border-[#c4c7cc] py-1 z-50 max-h-72 overflow-y-auto">
              <div className="px-3 py-0.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Aether Native</div>
              {BUILT_IN_INSTRUMENTS.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    onReplaceInstrument(track.id, inst.id, inst.name);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center gap-2 truncate"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inst.color }} />
                  <span className="truncate">{inst.name}</span>
                </button>
              ))}
              <div className="my-1 border-t border-[#e2e4e8]" />
              <div className="px-3 py-0.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Installed VSTs</div>
              {[
                { id: 'vst-serum', name: 'Serum Wavetable (VST3)' },
                { id: 'vst-vital', name: 'Vital Spectral (VST3)' },
                { id: 'vst-diva', name: 'Diva Analog (VST3)' },
              ].map((vst) => (
                <button
                  key={vst.id}
                  onClick={() => {
                    onReplaceInstrument(track.id, vst.id, vst.name);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center gap-2 truncate text-cyan-800 hover:text-white font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span className="truncate">{vst.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-7 py-1 text-zinc-400 cursor-not-allowed">
          <span>Patcherize</span>
        </div>

        {/* Clone */}
        <button
          onClick={() => {
            onCloneTrack(track.id);
            onClose();
          }}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span><span className="underline">C</span>lone</span>
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            onDeleteTrack(track.id);
            onClose();
          }}
          className="w-full text-left px-7 py-1 hover:bg-rose-600 hover:text-white text-rose-700 transition-colors"
        >
          <span><span className="underline">D</span>elete...</span>
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        <button
          onClick={onClose}
          className="w-full text-left px-7 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Assign to new instrument track</span>
        </button>
      </div>

      {/* RIGHT COLUMN (FL Studio Step & Edit Commands) */}
      <div className="w-[185px] flex flex-col py-0.5">
        <button
          onClick={handleCutSteps}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>C<span className="underline">u</span>t</span>
        </button>

        <button
          onClick={handleCopySteps}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>C<span className="underline">o</span>py</span>
        </button>

        <button
          onClick={handlePasteSteps}
          className={`w-full text-left px-3 py-1 transition-colors ${
            stepClipboard.length > 0 ? 'hover:bg-[#2563eb] hover:text-white' : 'text-zinc-400 cursor-not-allowed'
          }`}
        >
          <span>Paste</span>
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* Step Fill Operations */}
        <button
          onClick={() => handleFillSteps(2)}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Fill each <span className="underline font-bold">2</span> steps</span>
        </button>

        <button
          onClick={() => handleFillSteps(4)}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors font-semibold"
        >
          <span>Fill each <span className="underline font-bold">4</span> steps</span>
        </button>

        <button
          onClick={() => handleFillSteps(8)}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Fill each <span className="underline font-bold">8</span> steps</span>
        </button>

        <button
          onClick={() => handleFillSteps(4)}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white transition-colors"
        >
          <span>Advanced fill...</span>
        </button>

        <div className="px-3 py-1 text-zinc-400 cursor-not-allowed">
          <span>Auto fill</span>
        </div>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* Rotate Steps */}
        <button
          onClick={() => handleRotateSteps('left')}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between group transition-colors"
        >
          <span>Rotate left</span>
          <span className="text-[9px] text-zinc-400 group-hover:text-blue-100 font-mono italic">Shift+Ctrl+Left</span>
        </button>

        <button
          onClick={() => handleRotateSteps('right')}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between group transition-colors"
        >
          <span>Rotate right</span>
          <span className="text-[9px] text-zinc-400 group-hover:text-blue-100 font-mono italic">Shift+Ctrl+Right</span>
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        {/* MIDI options */}
        <button
          onClick={() => setMidiThrough(!midiThrough)}
          className="w-full text-left px-2 py-1 hover:bg-[#2563eb] hover:text-white flex items-center gap-1.5 group transition-colors"
        >
          {midiThrough ? (
            <Check className="w-3 h-3 text-[#1c1c1c] group-hover:text-white" />
          ) : (
            <div className="w-3" />
          )}
          <span>MIDI channel through</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-left px-6 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between transition-colors"
        >
          <span>Receive <span className="underline">n</span>otes from</span>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        </button>

        <div className="my-1 border-t border-[#e2e4e8]" />

        <div className="px-3 py-1 text-zinc-400 cursor-not-allowed">
          <span>Create DirectWave instrument...</span>
        </div>

        <button
          onClick={onClose}
          className="w-full text-left px-3 py-1 hover:bg-[#2563eb] hover:text-white flex items-center justify-between transition-colors"
        >
          <span>Burn MIDI to</span>
          <ChevronRight className="w-3 h-3 text-zinc-400" />
        </button>
      </div>
    </div>
  );
};
