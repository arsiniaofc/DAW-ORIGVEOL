import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Headphones,
  Circle,
  Plus,
  Trash2,
  Scissors,
  Copy,
  Layers,
  ChevronDown,
  Activity,
  Sliders,
} from 'lucide-react';
import { Track, Clip, Pattern, Project, SnapValue } from '../types/daw';
import { snapTick, getTickRhythmInfo } from '../core/rhythm';
import { audioEngine } from '../audio/engine';

interface TimelineProps {
  project: Project;
  activeTrackId: string;
  activePatternId: string;
  playheadTick: number;
  onSelectTrack: (trackId: string) => void;
  onSelectPattern: (patternId: string) => void;
  onUpdateClips: (clips: Clip[]) => void;
  onUpdateTrack: (track: Track) => void;
  onAddTrack: () => void;
  onRemoveTrack: (trackId: string) => void;
  onRecordHistory: (description: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  project,
  activeTrackId,
  activePatternId,
  playheadTick,
  onSelectTrack,
  onSelectPattern,
  onUpdateClips,
  onUpdateTrack,
  onAddTrack,
  onRemoveTrack,
  onRecordHistory,
}) => {
  const { rhythm, snapGrid, clips, tracks, patterns } = project;

  const [tickZoom, setTickZoom] = useState<number>(0.18); // px per tick
  const [trackHeight, setTrackHeight] = useState<number>(44); // px
  const [tool, setTool] = useState<'pointer' | 'cut' | 'erase'>('pointer');

  // Dragging / Resizing Clip State
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const [dragStartTick, setDragStartTick] = useState<number>(0);
  const [dragStartTrackId, setDragStartTrackId] = useState<string>('');

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Sync horizontal header scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const measureTicks = rhythm.totalBeats * rhythm.ticksPerBeat;
  const totalMeasures = 8;
  const maxTimelineTicks = measureTicks * totalMeasures;
  const timelineWidth = Math.max(1200, maxTimelineTicks * tickZoom);

  // Helper: pixel to tick
  const getTickFromX = (x: number): number => {
    const raw = Math.max(0, Math.floor(x / tickZoom));
    return snapTick(raw, snapGrid, rhythm);
  };

  // Click on Track Lane to place active pattern
  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    if (tool === 'erase' || draggingClipId || resizingClipId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridScrollRef.current?.scrollLeft || 0);
    const tick = getTickFromX(x);

    // Check if clicked existing clip
    const existing = clips.find(
      (c) => c.trackId === trackId && tick >= c.startTick && tick < c.startTick + c.durationTicks
    );

    if (existing) {
      if (tool === 'cut') {
        // Split clip at tick
        const splitOffset = tick - existing.startTick;
        if (splitOffset > 120 && splitOffset < existing.durationTicks - 120) {
          onRecordHistory('Split Clip');
          const firstPart: Clip = { ...existing, durationTicks: splitOffset };
          const secondPart: Clip = {
            id: `clip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
            patternId: existing.patternId,
            trackId: existing.trackId,
            startTick: tick,
            durationTicks: existing.durationTicks - splitOffset,
          };
          onUpdateClips(clips.map((c) => (c.id === existing.id ? firstPart : c)).concat(secondPart));
        }
      }
      return;
    }

    // Place new clip of active pattern
    const activePat = patterns.find((p) => p.id === activePatternId) || patterns[0];
    if (!activePat) return;

    const clipDuration = activePat.lengthBeats * rhythm.ticksPerBeat || measureTicks;
    const newClip: Clip = {
      id: `clip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      patternId: activePat.id,
      trackId,
      startTick: tick,
      durationTicks: clipDuration,
      selected: true,
    };

    onRecordHistory('Add Clip to Timeline');
    onUpdateClips([...clips, newClip]);
  };

  const handleClipMouseDown = (e: React.MouseEvent<HTMLDivElement>, clip: Clip) => {
    e.stopPropagation();

    if (tool === 'erase') {
      onRecordHistory('Delete Clip');
      onUpdateClips(clips.filter((c) => c.id !== clip.id));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightEdge = rect.width - clickX < 12;

    if (isRightEdge) {
      setResizingClipId(clip.id);
    } else {
      setDraggingClipId(clip.id);
      setDragStartTick(clip.startTick);
      setDragStartTrackId(clip.trackId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingClipId && !resizingClipId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridScrollRef.current?.scrollLeft || 0);
    const tick = getTickFromX(x);

    if (resizingClipId) {
      onUpdateClips(
        clips.map((c) => {
          if (c.id === resizingClipId) {
            const newDuration = Math.max(120, tick - c.startTick);
            return { ...c, durationTicks: newDuration };
          }
          return c;
        })
      );
      return;
    }

    if (draggingClipId) {
      onUpdateClips(
        clips.map((c) => {
          if (c.id === draggingClipId) {
            return { ...c, startTick: Math.max(0, tick) };
          }
          return c;
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (draggingClipId || resizingClipId) {
      onRecordHistory('Move / Resize Clip');
    }
    setDraggingClipId(null);
    setResizingClipId(null);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 flex flex-col bg-[#111317] select-none overflow-hidden relative"
    >
      {/* Timeline Control Header Bar */}
      <div className="h-10 bg-[#16181f] border-b border-[#252833] px-3 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          {/* Active Pattern Picker */}
          <div className="flex items-center gap-1.5 bg-[#1a1d26] border border-[#2b3040] rounded px-2 py-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400 text-[11px]">Pattern:</span>
            <select
              value={activePatternId}
              onChange={(e) => onSelectPattern(e.target.value)}
              className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1a1d26] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-[#262a36]"></div>

          {/* Tools */}
          <div className="flex items-center bg-[#1a1d26] border border-[#2b3040] rounded p-0.5">
            <button
              onClick={() => setTool('pointer')}
              title="Paint / Move Clips"
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                tool === 'pointer' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Draw / Select
            </button>
            <button
              onClick={() => setTool('cut')}
              title="Razor / Split Clip"
              className={`p-1.5 rounded transition-colors ${
                tool === 'cut' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTool('erase')}
              title="Erase Clip"
              className={`p-1.5 rounded transition-colors ${
                tool === 'erase' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Track Button */}
          <button
            onClick={onAddTrack}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e222d] hover:bg-[#282d3b] border border-[#2c3242] text-xs font-medium text-emerald-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Track</span>
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-[#1a1d26] border border-[#2b3040] rounded px-1.5 py-0.5 text-[11px] text-zinc-400">
          <span>Zoom:</span>
          <button
            onClick={() => setTickZoom((z) => Math.max(0.06, z * 0.8))}
            className="p-0.5 hover:text-white"
          >
            -
          </button>
          <button
            onClick={() => setTickZoom((z) => Math.min(0.6, z * 1.25))}
            className="p-0.5 hover:text-white"
          >
            +
          </button>
        </div>
      </div>

      {/* Timeline Ruler Header */}
      <div className="h-6 bg-[#14161d] border-b border-[#242833] flex select-none shrink-0 overflow-hidden">
        {/* Track Headers Spacer */}
        <div className="w-56 bg-[#16181f] border-r border-[#242833] px-3 flex items-center text-[10px] text-zinc-400 font-semibold">
          TRACK LIST
        </div>

        {/* Measure & Compound Rhythm Ruler */}
        <div ref={headerScrollRef} className="flex-1 overflow-hidden relative">
          <div style={{ width: timelineWidth }} className="h-full relative font-mono text-[10px]">
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              const startTick = mIdx * measureTicks;
              const left = startTick * tickZoom;

              return (
                <div
                  key={mIdx}
                  style={{ left }}
                  className="absolute top-0 bottom-0 border-l border-zinc-500 pl-1 flex items-center text-zinc-300 font-bold"
                >
                  <span>Bar {mIdx + 1}</span>
                  <span className="text-[9px] text-cyan-400 ml-1.5 font-normal">
                    [{rhythm.groups.join('+')}]
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Arranger Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Controls Sidebar */}
        <div className="w-56 bg-[#15171d] border-r border-[#242833] overflow-y-auto shrink-0 select-none divide-y divide-[#20232c]">
          {tracks.map((track) => (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              style={{ height: trackHeight }}
              className={`px-2 flex items-center justify-between cursor-pointer transition-colors ${
                track.id === activeTrackId ? 'bg-[#20242f]' : 'hover:bg-[#1a1c24]'
              }`}
            >
              {/* Color strip + Name */}
              <div className="flex items-center gap-2 truncate">
                <span
                  className="w-2 h-7 rounded-sm shrink-0"
                  style={{ backgroundColor: track.color }}
                />
                <div className="truncate">
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {track.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    Ch {track.mixerChannel} • {track.type}
                  </div>
                </div>
              </div>

              {/* Mute / Solo / Arm Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTrack({ ...track, muted: !track.muted });
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    track.muted
                      ? 'bg-rose-900 text-rose-300'
                      : 'bg-[#242834] text-zinc-400 hover:text-white'
                  }`}
                  title="Mute"
                >
                  M
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTrack({ ...track, solo: !track.solo });
                  }}
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    track.solo
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#242834] text-zinc-400 hover:text-white'
                  }`}
                  title="Solo"
                >
                  S
                </button>
              </div>
            </div>
          ))}

          {/* Add Track Button at bottom of Track List */}
          <div className="p-2">
            <button
              onClick={onAddTrack}
              className="w-full py-2 px-2.5 rounded border border-dashed border-[#2f3545] hover:border-emerald-500/80 bg-[#191c24] hover:bg-[#202532] text-zinc-300 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Track / VST...</span>
            </button>
          </div>
        </div>

        {/* Arranger Tracks & Clips Grid */}
        <div
          ref={gridScrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto bg-[#0f1115] relative cursor-pointer"
        >
          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-30"
            style={{ left: playheadTick * tickZoom }}
          >
            <div className="w-2.5 h-2.5 -ml-1 bg-rose-500 rounded-b-xs"></div>
          </div>

          <div style={{ width: timelineWidth }} className="relative">
            {tracks.map((track) => (
              <div
                key={track.id}
                onClick={(e) => handleLaneClick(e, track.id)}
                style={{ height: trackHeight }}
                className="w-full border-b border-[#1f222b] relative hover:bg-white/[0.015]"
              >
                {/* Compound Rhythm Grid Marker Lines */}
                {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                  const mStart = mIdx * measureTicks;
                  return (
                    <div
                      key={mIdx}
                      style={{ left: mStart * tickZoom }}
                      className="absolute top-0 bottom-0 border-l-2 border-[#2b303d] pointer-events-none"
                    />
                  );
                })}

                {/* Clips in this track */}
                {clips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const pat = patterns.find((p) => p.id === clip.patternId);
                    const left = clip.startTick * tickZoom;
                    const width = clip.durationTicks * tickZoom;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        style={{
                          left,
                          width: Math.max(16, width),
                          backgroundColor: pat?.color ? `${pat.color}dd` : '#3b82f6dd',
                        }}
                        className={`absolute top-1 bottom-1 rounded-sm border border-black/40 shadow-xs flex items-center justify-between px-2 overflow-hidden text-xs text-white font-medium group cursor-grab active:cursor-grabbing ${
                          clip.selected ? 'ring-1 ring-white shadow-md' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate pointer-events-none select-none">
                          <span className="font-semibold text-[11px] truncate">
                            {pat?.name || 'Clip'}
                          </span>
                        </div>

                        {/* Note mini tick markers preview */}
                        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center px-1 overflow-hidden">
                          {pat?.notes.map((n) => (
                            <div
                              key={n.id}
                              style={{ left: (n.startTick / (pat.lengthBeats * rhythm.ticksPerBeat)) * 100 + '%' }}
                              className="absolute w-1 h-3 bg-white rounded-xs"
                            />
                          ))}
                        </div>

                        {/* Resize Right Handle */}
                        <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/20 hover:bg-white/40 cursor-ew-resize"></div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
