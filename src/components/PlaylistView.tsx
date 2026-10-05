import React, { useState, useRef } from 'react';
import {
  Pencil,
  Brush,
  Eraser,
  VolumeX,
  Scissors,
  MousePointer,
  ZoomIn,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { Track, Clip, Pattern, Project, SnapValue } from '../types/daw';
import { snapTick, getTickRhythmInfo } from '../core/rhythm';

interface PlaylistViewProps {
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
  onOpenPianoRoll?: (patternId: string) => void;
  onDropItemOnLane?: (trackId: string, dropTick: number, item: any) => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
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
  onOpenPianoRoll,
  onDropItemOnLane,
}) => {
  const { rhythm, snapGrid, clips, tracks, patterns } = project;

  const [tickZoom, setTickZoom] = useState<number>(0.16); // px per tick
  const [trackHeight, setTrackHeight] = useState<number>(36); // px
  const [activeTool, setActiveTool] = useState<'draw' | 'paint' | 'erase' | 'slice' | 'select'>('draw');

  // Dragging / Resizing Clip State
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [resizingClipId, setResizingClipId] = useState<string | null>(null);
  const [dragStartTick, setDragStartTick] = useState<number>(0);

  const gridScrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const measureTicks = rhythm.totalBeats * rhythm.ticksPerBeat;
  const totalMeasures = 32; // 32 measures arrangement grid
  const maxTimelineTicks = measureTicks * totalMeasures;
  const timelineWidth = Math.max(1600, maxTimelineTicks * tickZoom);

  // Helper: pixel to tick
  const getTickFromX = (x: number): number => {
    const raw = Math.max(0, Math.floor(x / tickZoom));
    return snapTick(raw, snapGrid, rhythm);
  };

  // Click on Track Lane to place active pattern
  const handleLaneClick = (e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    if (activeTool === 'erase' || draggingClipId || resizingClipId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (gridScrollRef.current?.scrollLeft || 0);
    const tick = getTickFromX(x);

    // Check if clicked existing clip
    const existing = clips.find(
      (c) => c.trackId === trackId && tick >= c.startTick && tick < c.startTick + c.durationTicks
    );

    if (existing) {
      if (activeTool === 'slice') {
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

    onRecordHistory('Add Clip to Playlist');
    onUpdateClips([...clips, newClip]);
  };

  const handleClipMouseDown = (e: React.MouseEvent<HTMLDivElement>, clip: Clip) => {
    e.stopPropagation();

    if (activeTool === 'erase') {
      onRecordHistory('Delete Clip');
      onUpdateClips(clips.filter((c) => c.id !== clip.id));
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isRightEdge = rect.width - clickX < 10;

    if (isRightEdge) {
      setResizingClipId(clip.id);
    } else {
      setDraggingClipId(clip.id);
      setDragStartTick(clip.startTick);
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

  const activePattern = patterns.find((p) => p.id === activePatternId) || patterns[0];

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex-1 flex flex-col bg-[#0b0e14] select-none overflow-hidden relative font-sans text-xs"
    >
      {/* Playlist Top Toolbar (As seen in FL Studio Screenshot 1, 2, 4) */}
      <div className="h-8 bg-[#141822] border-b border-[#222838] px-2 flex items-center justify-between shrink-0 text-zinc-300">
        <div className="flex items-center gap-2">
          {/* Tool Palette Icons */}
          <div className="flex items-center bg-[#0e1118] border border-[#262e40] rounded p-0.5 gap-0.5">
            <button
              onClick={() => setActiveTool('draw')}
              title="Draw (Pencil)"
              className={`p-1 rounded ${activeTool === 'draw' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTool('paint')}
              title="Paint (Brush)"
              className={`p-1 rounded ${activeTool === 'paint' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Brush className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTool('erase')}
              title="Delete / Erase"
              className={`p-1 rounded ${activeTool === 'erase' ? 'bg-rose-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Eraser className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTool('slice')}
              title="Slice / Razor"
              className={`p-1 rounded ${activeTool === 'slice' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Scissors className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveTool('select')}
              title="Select"
              className={`p-1 rounded ${activeTool === 'select' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <MousePointer className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-[#262e40]"></div>

          {/* Arrangement Header Label (FL Studio Style) */}
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold font-mono text-[11px]">
            <span>Playlist - Arrangement ▸</span>
            <select
              value={activePatternId}
              onChange={(e) => onSelectPattern(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {patterns.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#141822]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Add Track Button & Zoom */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAddTrack}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#1e2536] hover:bg-[#283248] text-emerald-400 border border-[#2e3a50] text-[11px] font-semibold"
          >
            <Plus className="w-3 h-3" />
            <span>Add Track</span>
          </button>

          <div className="flex items-center gap-1 bg-[#0e1118] border border-[#262e40] rounded px-1.5 py-0.5 text-[10px] text-zinc-400">
            <span>Zoom</span>
            <button onClick={() => setTickZoom((z) => Math.max(0.05, z * 0.8))} className="hover:text-white px-0.5">-</button>
            <button onClick={() => setTickZoom((z) => Math.min(0.5, z * 1.25))} className="hover:text-white px-0.5">+</button>
          </div>
        </div>
      </div>

      {/* Timeline Ruler Header */}
      <div className="h-6 bg-[#12151e] border-b border-[#222838] flex shrink-0 overflow-hidden select-none">
        {/* Track Headers Spacer */}
        <div className="w-44 bg-[#141822] border-r border-[#222838] px-3 flex items-center justify-between text-[10px] text-zinc-500 font-mono font-bold">
          <span>TRACK</span>
          <span className="text-cyan-400">[{rhythm.groups.join('+')}]</span>
        </div>

        {/* Measure Numbers Ruler */}
        <div ref={headerScrollRef} className="flex-1 overflow-hidden relative">
          <div style={{ width: timelineWidth }} className="h-full relative font-mono text-[10px]">
            {Array.from({ length: totalMeasures }).map((_, mIdx) => {
              const startTick = mIdx * measureTicks;
              const left = startTick * tickZoom;

              return (
                <div
                  key={mIdx}
                  style={{ left }}
                  className="absolute top-0 bottom-0 border-l border-zinc-600 pl-1.5 flex items-center text-zinc-400 font-bold"
                >
                  <span>{mIdx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Arranger Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Track Sidebar (FL Studio style: Track 1, Track 2... with blue LED dots) */}
        <div className="w-44 bg-[#11141c] border-r border-[#222838] overflow-y-auto shrink-0 select-none divide-y divide-[#1c212e]">
          {/* Default list of 24 tracks (FL Studio style empty track lanes) */}
          {Array.from({ length: Math.max(24, tracks.length) }).map((_, idx) => {
            const track = tracks[idx];
            const trackNum = idx + 1;
            const isAssigned = Boolean(track);
            const isSelected = track?.id === activeTrackId;

            return (
              <div
                key={track ? track.id : `empty-track-${trackNum}`}
                onClick={() => track && onSelectTrack(track.id)}
                style={{ height: trackHeight }}
                className={`px-2 flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-[#1e2536]' : 'hover:bg-[#161a25]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {/* Blue active LED dot as in FL Studio screenshots 1, 2, 4 */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
                      isAssigned
                        ? 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]'
                        : 'bg-zinc-700'
                    }`}
                  />
                  <div className="truncate font-sans font-semibold text-[11px] text-zinc-300">
                    {track ? track.name : `Track ${trackNum}`}
                  </div>
                </div>

                {track && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack({ ...track, muted: !track.muted });
                    }}
                    className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                      track.muted ? 'bg-rose-900 text-rose-300' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    M
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Playlist Grid Canvas Area */}
        <div
          ref={gridScrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto bg-[#0a0d13] relative cursor-crosshair"
        >
          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-30 shadow-[0_0_6px_#f43f5e]"
            style={{ left: playheadTick * tickZoom }}
          >
            <div className="w-2.5 h-2.5 -ml-1 bg-rose-500 rounded-b-xs"></div>
          </div>

          <div style={{ width: timelineWidth }} className="relative">
            {Array.from({ length: Math.max(24, tracks.length) }).map((_, idx) => {
              const track = tracks[idx];
              const trackId = track ? track.id : `track-placeholder-${idx}`;

              return (
                <div
                  key={trackId}
                  onClick={(e) => track && handleLaneClick(e, track.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rawData = e.dataTransfer.getData('application/json');
                    if (rawData && track) {
                      try {
                        const item = JSON.parse(rawData);
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left + (gridScrollRef.current?.scrollLeft || 0);
                        const dropTick = getTickFromX(x);
                        onDropItemOnLane?.(track.id, dropTick, item);
                      } catch (err) {}
                    }
                  }}
                  style={{ height: trackHeight }}
                  className="w-full border-b border-[#1b202c] relative hover:bg-white/[0.015]"
                >
                  {/* Grid measure lines */}
                  {Array.from({ length: totalMeasures }).map((_, mIdx) => {
                    const mStart = mIdx * measureTicks;
                    return (
                      <div
                        key={mIdx}
                        style={{ left: mStart * tickZoom }}
                        className="absolute top-0 bottom-0 border-l border-[#222836] pointer-events-none"
                      />
                    );
                  })}

                  {/* Render clips on this track */}
                  {track &&
                    clips
                      .filter((c) => c.trackId === track.id)
                      .map((clip) => {
                        const pat = patterns.find((p) => p.id === clip.patternId);
                        const left = clip.startTick * tickZoom;
                        const width = clip.durationTicks * tickZoom;

                        return (
                          <div
                            key={clip.id}
                            onMouseDown={(e) => handleClipMouseDown(e, clip)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onSelectPattern(clip.patternId);
                              onSelectTrack(clip.trackId);
                              onOpenPianoRoll?.(clip.patternId);
                            }}
                            style={{
                              left,
                              width: Math.max(16, width),
                              backgroundColor: pat?.color ? `${pat.color}dd` : '#38bdf8dd',
                            }}
                            title={`Double click to open in Piano Roll (${pat?.name || 'Clip'})`}
                            className={`absolute top-0.5 bottom-0.5 rounded-xs border border-black/40 shadow-xs flex items-center justify-between px-2 overflow-hidden text-xs text-white font-medium group cursor-grab active:cursor-grabbing ${
                              clip.selected ? 'ring-1 ring-white' : ''
                            }`}
                          >
                            <span className="font-semibold text-[10px] truncate select-none">
                              {pat?.name || 'Clip'}
                            </span>

                            {/* Mini notes waveform / piano preview */}
                            <div className="absolute inset-0 pointer-events-none opacity-25 flex items-center px-1">
                              {pat?.notes.map((n) => (
                                <div
                                  key={n.id}
                                  style={{
                                    left: (n.startTick / (pat.lengthBeats * rhythm.ticksPerBeat)) * 100 + '%',
                                  }}
                                  className="absolute w-1 h-2.5 bg-white rounded-xs"
                                />
                              ))}
                            </div>

                            {/* Right resize handle strip */}
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-black/20 hover:bg-white/40 cursor-ew-resize"></div>
                          </div>
                        );
                      })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
