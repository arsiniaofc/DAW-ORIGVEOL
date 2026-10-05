import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Pencil,
  Eraser,
  Scissors,
  Copy,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Sliders,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Trash2,
  Share2,
} from 'lucide-react';
import { Note, Pattern, Track, Project, PianoRollTool } from '../types/daw';
import { getStepLabel, getFrequency } from '../core/microtonal';
import { isStepInScale, snapPitchToScale } from '../core/scaleGenerator';
import { snapTick, getTickRhythmInfo } from '../core/rhythm';
import { editorCore } from '../core/editorCore';
import { audioEngine } from '../audio/engine';

interface PianoRollProps {
  project: Project;
  activeTrack: Track;
  activePattern: Pattern;
  playheadTick: number;
  onUpdatePatternNotes: (notes: Note[]) => void;
  onDuplicateNotesToTrack: (notes: Note[], targetTrackId: string) => void;
  onRecordHistory: (description: string) => void;
}

export const PianoRoll: React.FC<PianoRollProps> = ({
  project,
  activeTrack,
  activePattern,
  playheadTick,
  onUpdatePatternNotes,
  onDuplicateNotesToTrack,
  onRecordHistory,
}) => {
  const { tuning, rhythm, scale, snapToScale, snapGrid } = project;
  const N = tuning.divisionsPerOctave;

  // Selected tool
  const [tool, setTool] = useState<PianoRollTool>('draw');

  // Zoom & Scroll
  const [tickZoom, setTickZoom] = useState<number>(0.25); // px per tick
  const [rowHeight, setRowHeight] = useState<number>(20); // px per pitch step
  const [velocityHeight, setVelocityHeight] = useState<number>(85); // px

  // Step range (4 to 5 octaves)
  const minStep = Math.max(0, N * 2);
  const maxStep = N * 6;
  const totalRows = maxStep - minStep;

  // Marquee selection state
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{ x: number; y: number } | null>(null);

  // Dragging / Resizing note state
  const [isDraggingNote, setIsDraggingNote] = useState<boolean>(false);
  const [isResizingNote, setIsResizingNote] = useState<boolean>(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ tick: number; pitch: number } | null>(null);
  const [selectedTrackForCopy, setSelectedTrackForCopy] = useState<string>(activeTrack.id);

  // Cross-track paste modal / dropdown
  const [showCrossTrackMenu, setShowCrossTrackMenu] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const keysContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Sync vertical scroll between keys and grid
  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (keysContainerRef.current) {
      keysContainerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Scroll to center octave on initial load
  useEffect(() => {
    if (gridContainerRef.current) {
      const centerStep = tuning.referenceNoteStep || Math.floor((minStep + maxStep) / 2);
      const rowFromTop = maxStep - centerStep;
      gridContainerRef.current.scrollTop = Math.max(0, rowFromTop * rowHeight - 200);
    }
  }, [tuning.divisionsPerOctave]);

  // Selected notes
  const selectedNotes = activePattern.notes.filter((n) => n.selected);
  const selectedNoteIds = new Set(selectedNotes.map((n) => n.id));

  // Note pitch preview on key hover or click
  const previewStep = (step: number) => {
    audioEngine.previewNote(activeTrack, step, tuning, 100, 0.4);
  };

  // Grid dimensions
  const totalTicks = Math.max(
    rhythm.totalBeats * rhythm.ticksPerBeat * 4,
    ...activePattern.notes.map((n) => n.startTick + n.durationTicks + 960)
  );
  const gridWidth = totalTicks * tickZoom;
  const gridHeight = totalRows * rowHeight;

  // Converts pixel coords on grid to tick & pitch
  const getGridCoords = (e: React.MouseEvent<HTMLDivElement>): { tick: number; pitch: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridContainerRef.current?.scrollLeft || 0);
    const y = e.clientY - rect.top + (gridContainerRef.current?.scrollTop || 0);

    const rawTick = Math.max(0, Math.floor(x / tickZoom));
    const rowIndex = Math.floor(y / rowHeight);
    let pitch = maxStep - 1 - rowIndex;

    if (snapToScale) {
      pitch = snapPitchToScale(pitch, scale, N);
    }

    const snappedTick = snapTick(rawTick, snapGrid, rhythm);
    return { tick: snappedTick, pitch };
  };

  // Canvas Grid drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pitch row backgrounds
    for (let step = minStep; step < maxStep; step++) {
      const rowIndex = maxStep - 1 - step;
      const y = rowIndex * rowHeight;
      const stepInOctave = ((step % N) + N) % N;
      const inScale = isStepInScale(stepInOctave, scale, N);
      const isRoot = stepInOctave === scale.root;

      if (isRoot) {
        ctx.fillStyle = '#064e3b33'; // subtle emerald root tint
      } else if (inScale) {
        ctx.fillStyle = '#022c2222'; // scale degree background
      } else if (stepInOctave % 2 === 1) {
        ctx.fillStyle = '#14161c'; // alternating dark row
      } else {
        ctx.fillStyle = '#171920';
      }

      ctx.fillRect(0, y, gridWidth, rowHeight);

      // Horizontal separator line
      ctx.strokeStyle = '#222630';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight);
      ctx.lineTo(gridWidth, y + rowHeight);
      ctx.stroke();

      // Octave line emphasis
      if (stepInOctave === 0) {
        ctx.strokeStyle = '#383f52';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gridWidth, y);
        ctx.stroke();
      }
    }

    // Draw vertical rhythm grid lines
    const ticksPerMeasure = rhythm.totalBeats * rhythm.ticksPerBeat;
    const ticksPerBeat = rhythm.ticksPerBeat;
    const ticksPerStep = ticksPerBeat / 4; // 16th note

    for (let tick = 0; tick < totalTicks; tick += ticksPerStep) {
      const x = tick * tickZoom;
      const rhythmInfo = getTickRhythmInfo(tick, rhythm);
      const { isMeasureStart, isGroupStart } = rhythmInfo.beatInfo;
      const isBeatStart = tick % ticksPerBeat === 0;

      if (isMeasureStart) {
        ctx.strokeStyle = '#475569'; // Bold bar boundary
        ctx.lineWidth = 2;
      } else if (isGroupStart) {
        ctx.strokeStyle = '#0891b2'; // Cyan group boundary line (e.g. 4+4+3+3)
        ctx.lineWidth = 1.5;
      } else if (isBeatStart) {
        ctx.strokeStyle = '#262d3d'; // Regular beat line
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = '#1b1f29'; // 16th step subdivision
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridHeight);
      ctx.stroke();
    }
  }, [minStep, maxStep, rowHeight, tickZoom, gridWidth, gridHeight, N, rhythm, scale]);

  // Handle Grid Mouse Down
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      // Right click: Erase note under cursor
      const { tick, pitch } = getGridCoords(e);
      const clickedNote = activePattern.notes.find(
        (n) => n.pitch === pitch && tick >= n.startTick && tick < n.startTick + n.durationTicks
      );
      if (clickedNote) {
        onRecordHistory('Erase Note');
        onUpdatePatternNotes(activePattern.notes.filter((n) => n.id !== clickedNote.id));
      }
      return;
    }

    const { tick, pitch } = getGridCoords(e);

    // Check if clicked an existing note
    const clickedNote = activePattern.notes.find(
      (n) => n.pitch === pitch && tick >= n.startTick && tick < n.startTick + n.durationTicks
    );

    if (tool === 'erase' && clickedNote) {
      onRecordHistory('Erase Note');
      onUpdatePatternNotes(activePattern.notes.filter((n) => n.id !== clickedNote.id));
      return;
    }

    if (clickedNote) {
      // Select or toggle select
      if (e.shiftKey) {
        onUpdatePatternNotes(
          activePattern.notes.map((n) => (n.id === clickedNote.id ? { ...n, selected: !n.selected } : n))
        );
      } else if (!clickedNote.selected) {
        onUpdatePatternNotes(
          activePattern.notes.map((n) => ({ ...n, selected: n.id === clickedNote.id }))
        );
      }

      previewStep(clickedNote.pitch);

      // Check if clicked right edge for resize
      const notePixelEnd = (clickedNote.startTick + clickedNote.durationTicks) * tickZoom;
      const clickPixelX = tick * tickZoom;
      if (notePixelEnd - clickPixelX < 14) {
        setIsResizingNote(true);
      } else {
        setIsDraggingNote(true);
      }

      setDraggedNoteId(clickedNote.id);
      setDragStartPos({ tick, pitch });
      return;
    }

    if (tool === 'select') {
      // Start marquee box selection
      if (!e.shiftKey) {
        onUpdatePatternNotes(activePattern.notes.map((n) => ({ ...n, selected: false })));
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setIsMarqueeSelecting(true);
      setMarqueeStart({ x, y });
      setMarqueeCurrent({ x, y });
      return;
    }

    if (tool === 'draw') {
      // Draw new note
      const defaultDuration = rhythm.ticksPerBeat / 2; // eighth note
      const newNote: Note = {
        id: `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        pitch,
        startTick: tick,
        durationTicks: defaultDuration,
        velocity: 100,
        selected: true,
      };

      onRecordHistory('Add Note');
      // If not shift, deselect others and add
      const updated = e.shiftKey
        ? [...activePattern.notes, newNote]
        : [...activePattern.notes.map((n) => ({ ...n, selected: false })), newNote];

      onUpdatePatternNotes(updated);
      previewStep(pitch);

      setIsDraggingNote(true);
      setDraggedNoteId(newNote.id);
      setDragStartPos({ tick, pitch });
    }
  };

  // Handle Mouse Move on Grid
  const handleGridMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMarqueeSelecting && marqueeStart) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMarqueeCurrent({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      return;
    }

    if (!dragStartPos || !draggedNoteId) return;

    const { tick, pitch } = getGridCoords(e);
    const deltaTick = tick - dragStartPos.tick;
    const deltaPitch = pitch - dragStartPos.pitch;

    if (isResizingNote) {
      onUpdatePatternNotes(
        activePattern.notes.map((n) => {
          if (n.id === draggedNoteId) {
            const newDuration = Math.max(30, n.durationTicks + deltaTick);
            return { ...n, durationTicks: newDuration };
          }
          return n;
        })
      );
      setDragStartPos({ tick, pitch });
      return;
    }

    if (isDraggingNote) {
      if (deltaTick === 0 && deltaPitch === 0) return;

      onUpdatePatternNotes(
        activePattern.notes.map((n) => {
          if (n.selected || n.id === draggedNoteId) {
            let newPitch = Math.max(minStep, Math.min(maxStep - 1, n.pitch + deltaPitch));
            if (snapToScale) {
              newPitch = snapPitchToScale(newPitch, scale, N);
            }
            return {
              ...n,
              startTick: Math.max(0, n.startTick + deltaTick),
              pitch: newPitch,
            };
          }
          return n;
        })
      );

      setDragStartPos({ tick, pitch });
    }
  };

  // Handle Mouse Up
  const handleGridMouseUp = () => {
    if (isMarqueeSelecting && marqueeStart && marqueeCurrent) {
      const x1 = Math.min(marqueeStart.x, marqueeCurrent.x) + (gridContainerRef.current?.scrollLeft || 0);
      const x2 = Math.max(marqueeStart.x, marqueeCurrent.x) + (gridContainerRef.current?.scrollLeft || 0);
      const y1 = Math.min(marqueeStart.y, marqueeCurrent.y) + (gridContainerRef.current?.scrollTop || 0);
      const y2 = Math.max(marqueeStart.y, marqueeCurrent.y) + (gridContainerRef.current?.scrollTop || 0);

      const minTickMarquee = x1 / tickZoom;
      const maxTickMarquee = x2 / tickZoom;
      const maxPitchMarquee = maxStep - 1 - Math.floor(y1 / rowHeight);
      const minPitchMarquee = maxStep - 1 - Math.floor(y2 / rowHeight);

      onUpdatePatternNotes(
        activePattern.notes.map((n) => {
          const intersects =
            n.startTick < maxTickMarquee &&
            n.startTick + n.durationTicks > minTickMarquee &&
            n.pitch >= minPitchMarquee &&
            n.pitch <= maxPitchMarquee;
          return { ...n, selected: n.selected || intersects };
        })
      );
    }

    setIsMarqueeSelecting(false);
    setMarqueeStart(null);
    setMarqueeCurrent(null);
    setIsDraggingNote(false);
    setIsResizingNote(false);
    setDraggedNoteId(null);
    setDragStartPos(null);
  };

  // Note Contextual Operations (Section 9)
  const handleOctaveUp = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory(`Octave Up (+${N} steps)`);
    const transformed = editorCore.transposeOctave(selectedNotes, 1, tuning);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleOctaveDown = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory(`Octave Down (-${N} steps)`);
    const transformed = editorCore.transposeOctave(selectedNotes, -1, tuning);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleStepUp = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Step Up (+1)');
    const transformed = editorCore.transposeSteps(selectedNotes, 1);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleStepDown = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Step Down (-1)');
    const transformed = editorCore.transposeSteps(selectedNotes, -1);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleQuantize = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Quantize Notes');
    const transformed = editorCore.quantizeNotes(selectedNotes, snapGrid, rhythm);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleStretch = (factor: number) => {
    if (selectedNotes.length === 0) return;
    onRecordHistory(`Stretch Notes (${factor}x)`);
    const transformed = editorCore.stretchNotes(selectedNotes, factor);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleReverse = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Reverse Notes');
    const transformed = editorCore.reverseNotes(selectedNotes);
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleRandomize = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Randomize Notes');
    const transformed = editorCore.randomizeNotes(
      selectedNotes,
      { pitch: true, velocity: true, timing: true },
      tuning,
      scale
    );
    onUpdatePatternNotes(
      activePattern.notes.map((n) => {
        const found = transformed.find((t) => t.id === n.id);
        return found || n;
      })
    );
  };

  const handleDeleteSelected = () => {
    if (selectedNotes.length === 0) return;
    onRecordHistory('Delete Notes');
    onUpdatePatternNotes(activePattern.notes.filter((n) => !n.selected));
  };

  const handleSelectAll = () => {
    onUpdatePatternNotes(activePattern.notes.map((n) => ({ ...n, selected: true })));
  };

  const handleCopyNotes = () => {
    if (selectedNotes.length === 0) return;
    editorCore.copyNotes(selectedNotes, activeTrack.id);
  };

  const handlePasteNotes = (mode: 'original' | 'cursor' | 'relative') => {
    if (!editorCore.hasNotesInClipboard()) return;
    onRecordHistory(`Paste Notes (${mode})`);
    const pasted = editorCore.pasteNotes(mode, playheadTick, activeTrack.id);
    onUpdatePatternNotes([
      ...activePattern.notes.map((n) => ({ ...n, selected: false })),
      ...pasted,
    ]);
  };

  const handleDuplicateToTrack = (targetTrackId: string) => {
    if (selectedNotes.length === 0) return;
    onRecordHistory(`Duplicate Notes to Track`);
    onDuplicateNotesToTrack(selectedNotes, targetTrackId);
    setShowCrossTrackMenu(false);
  };

  // Keyboard Shortcuts for Piano Roll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopyNotes();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePasteNotes('cursor');
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        // Duplicate selected notes by 1 measure or offset
        if (selectedNotes.length > 0) {
          onRecordHistory('Duplicate Notes');
          const duplicated = editorCore.duplicateNotes(selectedNotes, rhythm.ticksPerBeat * 2);
          onUpdatePatternNotes([
            ...activePattern.notes.map((n) => ({ ...n, selected: false })),
            ...duplicated,
          ]);
        }
      } else if (e.key === 'ArrowUp' && (e.shiftKey || e.ctrlKey)) {
        e.preventDefault();
        handleOctaveUp();
      } else if (e.key === 'ArrowDown' && (e.shiftKey || e.ctrlKey)) {
        e.preventDefault();
        handleOctaveDown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleStepUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleStepDown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNotes, activePattern.notes, playheadTick]);

  return (
    <div className="flex-1 flex flex-col bg-[#111317] select-none overflow-hidden relative">
      {/* Piano Roll Toolbar */}
      <div className="h-10 bg-[#16181f] border-b border-[#252833] px-3 flex items-center justify-between shrink-0 text-xs">
        {/* Left: Tools & Target Channel */}
        <div className="flex items-center gap-2">
          {/* Target Channel Pill (FL Studio Screenshot 3) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c212d] border border-[#2d364a] text-emerald-400 font-semibold text-[11px] font-mono">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: activeTrack.color }}
            />
            <span>Piano roll - {activeTrack.name}</span>
          </div>

          <div className="h-4 w-px bg-[#262a36]"></div>

          {/* Tool Selector */}
          <div className="flex items-center bg-[#1a1d26] border border-[#2b3040] rounded p-0.5">
            <button
              onClick={() => setTool('draw')}
              title="Draw Note (Pencil)"
              className={`p-1.5 rounded transition-colors ${
                tool === 'draw' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('select')}
              title="Select / Marquee"
              className={`p-1.5 rounded transition-colors ${
                tool === 'select' ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('erase')}
              title="Erase Note (Right-click works anytime)"
              className={`p-1.5 rounded transition-colors ${
                tool === 'erase' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#262a36]"></div>

          {/* Octave & Step Operations (Section 9) */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleOctaveUp}
              disabled={selectedNotes.length === 0}
              title={`Octave Up (+${N} microtonal steps)`}
              className="px-2 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] font-mono flex items-center gap-1 text-zinc-200"
            >
              <ChevronUp className="w-3 h-3 text-emerald-400" />
              <span>Oct +{N}</span>
            </button>

            <button
              onClick={handleOctaveDown}
              disabled={selectedNotes.length === 0}
              title={`Octave Down (-${N} microtonal steps)`}
              className="px-2 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] font-mono flex items-center gap-1 text-zinc-200"
            >
              <ChevronDown className="w-3 h-3 text-emerald-400" />
              <span>Oct -{N}</span>
            </button>

            <button
              onClick={handleStepUp}
              disabled={selectedNotes.length === 0}
              title="Step Up (+1 microtonal step)"
              className="p-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-zinc-200"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            <button
              onClick={handleStepDown}
              disabled={selectedNotes.length === 0}
              title="Step Down (-1 microtonal step)"
              className="p-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-zinc-200"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#262a36]"></div>

          {/* Musical Transformations: Quantize, Stretch, Reverse, Randomize */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleQuantize}
              disabled={selectedNotes.length === 0}
              title="Quantize Notes to Grid"
              className="px-2 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] text-zinc-200"
            >
              Quantize
            </button>

            <button
              onClick={() => handleStretch(2)}
              disabled={selectedNotes.length === 0}
              title="Stretch Duration (2x)"
              className="px-1.5 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] text-zinc-200"
            >
              2x
            </button>

            <button
              onClick={() => handleStretch(0.5)}
              disabled={selectedNotes.length === 0}
              title="Compress Duration (0.5x)"
              className="px-1.5 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] text-zinc-200"
            >
              0.5x
            </button>

            <button
              onClick={handleReverse}
              disabled={selectedNotes.length === 0}
              title="Reverse (Retrograde timing)"
              className="p-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-zinc-200"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            <button
              onClick={handleRandomize}
              disabled={selectedNotes.length === 0}
              title="Randomize / Humanize (Pitch within scale, Velocity, Timing)"
              className="px-2 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] disabled:opacity-40 border border-[#2d3344] text-[11px] text-amber-300 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Humanize</span>
            </button>
          </div>
        </div>

        {/* Right: Cross-track Copy / Paste (Section 10) & Zoom */}
        <div className="flex items-center gap-2">
          {/* Cross Track Copy & Paste Menu */}
          <div className="relative">
            <button
              onClick={() => setShowCrossTrackMenu(!showCrossTrackMenu)}
              title="Cross-Track Note Copy / Duplicate Menu"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1c202a] hover:bg-[#262c3b] border border-[#2c3344] text-xs text-indigo-300 font-medium"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Cross-Track</span>
            </button>

            {showCrossTrackMenu && (
              <div
                className="absolute right-0 mt-1 w-64 bg-[#181b22] border border-[#2c3242] rounded shadow-2xl p-2 z-50 text-xs text-zinc-200 space-y-2"
                onMouseLeave={() => setShowCrossTrackMenu(false)}
              >
                <div className="font-semibold text-zinc-400 border-b border-[#242936] pb-1">
                  Copy & Paste Between Tracks
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      handleCopyNotes();
                      setShowCrossTrackMenu(false);
                    }}
                    disabled={selectedNotes.length === 0}
                    className="flex-1 py-1 rounded bg-[#222734] hover:bg-[#2d3344] disabled:opacity-40 text-center font-medium"
                  >
                    Copy Selected
                  </button>
                  <button
                    onClick={() => {
                      handlePasteNotes('original');
                      setShowCrossTrackMenu(false);
                    }}
                    className="flex-1 py-1 rounded bg-[#222734] hover:bg-[#2d3344] text-center"
                    title="Paste at Original Positions"
                  >
                    Paste Original
                  </button>
                  <button
                    onClick={() => {
                      handlePasteNotes('cursor');
                      setShowCrossTrackMenu(false);
                    }}
                    className="flex-1 py-1 rounded bg-[#222734] hover:bg-[#2d3344] text-center text-emerald-400"
                    title="Paste at Playhead Cursor"
                  >
                    Paste Cursor
                  </button>
                </div>

                <div className="border-t border-[#242936] pt-2">
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Duplicate Notes Directly to Track:
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {project.tracks.map((t) => (
                      <button
                        key={t.id}
                        disabled={selectedNotes.length === 0}
                        onClick={() => handleDuplicateToTrack(t.id)}
                        className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between hover:bg-[#293040] ${
                          t.id === activeTrack.id ? 'text-zinc-500 italic' : 'text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span>{t.name}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500">→ Send</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-[#262a36]"></div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#1a1d26] border border-[#2b3040] rounded px-1 py-0.5 text-[11px] text-zinc-400">
            <span>Zoom:</span>
            <button
              onClick={() => setTickZoom((z) => Math.max(0.1, z * 0.8))}
              className="p-0.5 hover:text-white"
            >
              -
            </button>
            <button
              onClick={() => setTickZoom((z) => Math.min(1.0, z * 1.25))}
              className="p-0.5 hover:text-white"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Area: Left Key Ruler + Right Notes Grid Canvas */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Left: Dynamic Microtonal Piano Keys Sidebar (Adapts to N-TET!) */}
        <div
          ref={keysContainerRef}
          className="w-28 bg-[#14161c] border-r border-[#242833] flex flex-col overflow-hidden select-none shrink-0"
        >
          <div style={{ height: gridHeight }} className="relative">
            {Array.from({ length: totalRows }).map((_, i) => {
              const step = maxStep - 1 - i;
              const stepInOctave = ((step % N) + N) % N;
              const inScale = isStepInScale(stepInOctave, scale, N);
              const isRoot = stepInOctave === scale.root;
              const info = getStepLabel(step, tuning);

              return (
                <div
                  key={step}
                  onClick={() => previewStep(step)}
                  style={{ top: i * rowHeight, height: rowHeight }}
                  className={`absolute w-full px-1.5 border-b border-[#1e222d] flex items-center justify-between text-[10px] font-mono cursor-pointer transition-colors ${
                    isRoot
                      ? 'bg-emerald-950/80 text-emerald-300 font-bold border-l-4 border-l-emerald-500'
                      : inScale
                      ? 'bg-[#181f26] text-emerald-400/90 hover:bg-[#202933]'
                      : stepInOctave % 2 === 1
                      ? 'bg-[#101217] text-zinc-500 hover:bg-[#1b1f28]'
                      : 'bg-[#14161d] text-zinc-400 hover:bg-[#1e222e]'
                  }`}
                  title={`${info.name} • ${info.hz} Hz • ${info.cents}c (Step ${step})`}
                >
                  <div className="flex items-center gap-1 truncate">
                    <span className="font-semibold">{info.name.split(' ')[0]}</span>
                    {stepInOctave === 0 && (
                      <span className="text-[9px] text-zinc-500">Oct {info.octave}</span>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-500 opacity-80">{info.cents}c</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Note Grid */}
        <div
          ref={gridContainerRef}
          onScroll={handleGridScroll}
          onMouseDown={handleGridMouseDown}
          onMouseMove={handleGridMouseMove}
          onMouseUp={handleGridMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className="flex-1 overflow-auto bg-[#101216] relative cursor-crosshair"
        >
          {/* Background Canvas */}
          <canvas
            ref={canvasRef}
            width={gridWidth}
            height={gridHeight}
            className="absolute top-0 left-0 pointer-events-none"
          />

          {/* Playhead Indicator Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-20 shadow-sm"
            style={{ left: playheadTick * tickZoom }}
          >
            <div className="w-2.5 h-2.5 -ml-1 bg-rose-500 rounded-b-xs"></div>
          </div>

          {/* Render Active Pattern Notes */}
          <div style={{ width: gridWidth, height: gridHeight }} className="relative pointer-events-none">
            {activePattern.notes.map((note) => {
              const rowIndex = maxStep - 1 - note.pitch;
              const top = rowIndex * rowHeight;
              const left = note.startTick * tickZoom;
              const width = Math.max(6, note.durationTicks * tickZoom);

              return (
                <div
                  key={note.id}
                  style={{
                    top: top + 1,
                    left,
                    width,
                    height: rowHeight - 2,
                    backgroundColor: note.selected ? '#10b981' : activeTrack.color || '#3b82f6',
                  }}
                  className={`absolute rounded-xs border pointer-events-auto flex items-center px-1 overflow-hidden transition-shadow ${
                    note.selected
                      ? 'border-white shadow-md ring-1 ring-white/50 text-black font-bold'
                      : 'border-black/40 text-white/90'
                  }`}
                >
                  <span className="text-[9px] font-mono truncate select-none">
                    {getStepLabel(note.pitch, tuning).name}
                  </span>
                  {/* Resize handle strip on right */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/40 cursor-ew-resize"></div>
                </div>
              );
            })}

            {/* Marquee Selection Rectangle */}
            {isMarqueeSelecting && marqueeStart && marqueeCurrent && (
              <div
                style={{
                  left: Math.min(marqueeStart.x, marqueeCurrent.x) + (gridContainerRef.current?.scrollLeft || 0),
                  top: Math.min(marqueeStart.y, marqueeCurrent.y) + (gridContainerRef.current?.scrollTop || 0),
                  width: Math.abs(marqueeCurrent.x - marqueeStart.x),
                  height: Math.abs(marqueeCurrent.y - marqueeStart.y),
                }}
                className="absolute bg-emerald-500/20 border border-emerald-400 pointer-events-none z-30"
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Velocity Lane */}
      <div
        style={{ height: velocityHeight }}
        className="bg-[#13151b] border-t border-[#252833] flex flex-col shrink-0 select-none overflow-hidden relative"
      >
        <div className="h-5 bg-[#171922] px-3 flex items-center justify-between text-[10px] text-zinc-400 border-b border-[#20232d]">
          <span className="font-semibold text-zinc-300">Note Velocity Lane</span>
          <span>Click / drag velocity bars to adjust dynamics (0 - 127)</span>
        </div>

        <div className="flex-1 flex relative overflow-x-hidden">
          <div className="w-28 bg-[#14161c] border-r border-[#242833] shrink-0 flex flex-col justify-between p-1 text-[9px] font-mono text-zinc-500">
            <span>127</span>
            <span>64</span>
            <span>0</span>
          </div>

          <div
            style={{ width: gridWidth }}
            className="flex-1 relative bg-[#0e1014] cursor-ns-resize"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left + (gridContainerRef.current?.scrollLeft || 0);
              const clickY = e.clientY - rect.top;
              const clickTick = clickX / tickZoom;
              const normalizedVel = Math.round((1 - clickY / (velocityHeight - 20)) * 127);
              const clampedVel = Math.max(1, Math.min(127, normalizedVel));

              // Find closest note
              const target = activePattern.notes.find(
                (n) => clickTick >= n.startTick && clickTick <= n.startTick + n.durationTicks
              );
              if (target) {
                onUpdatePatternNotes(
                  activePattern.notes.map((n) => (n.id === target.id ? { ...n, velocity: clampedVel } : n))
                );
              }
            }}
          >
            {activePattern.notes.map((note) => {
              const left = note.startTick * tickZoom;
              const velHeight = ((note.velocity / 127) * (velocityHeight - 25));

              return (
                <div
                  key={note.id}
                  style={{
                    left: left + 2,
                    bottom: 0,
                    height: velHeight,
                  }}
                  className={`absolute w-1.5 rounded-t-xs transition-colors ${
                    note.selected ? 'bg-emerald-400 shadow-xs' : 'bg-blue-500'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
