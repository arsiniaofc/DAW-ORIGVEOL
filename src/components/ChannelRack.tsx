import React, { useState } from 'react';
import {
  X,
  Plus,
  Sliders,
  ChevronDown,
  Volume2,
  Disc3,
  Radio,
  Music,
} from 'lucide-react';
import { Project, Track, Pattern, Note } from '../types/daw';
import { audioEngine } from '../audio/engine';
import { TrackContextMenu } from './TrackContextMenu';

interface ChannelRackProps {
  project: Project;
  activePattern: Pattern;
  activeTrackId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (trackId: string) => void;
  onUpdateTrack: (track: Track) => void;
  onUpdatePatternNotes: (notes: Note[]) => void;
  onOpenPluginUI: (trackId: string) => void;
  onAddTrack: () => void;
  onRecordHistory: (desc: string) => void;
  embedded?: boolean;
  onOpenPianoRoll?: (trackId: string) => void;
  onCloneTrack?: (trackId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
  onReplaceInstrument?: (trackId: string, instrumentId: string, name: string) => void;
  onInsertTrack?: (beforeTrackId: string) => void;
  onDropOnTrack?: (trackId: string, item: any) => void;
  onDropToCreateTrack?: (item: any) => void;
}

export const ChannelRack: React.FC<ChannelRackProps> = ({
  project,
  activePattern,
  activeTrackId,
  isOpen,
  onClose,
  onSelectTrack,
  onUpdateTrack,
  onUpdatePatternNotes,
  onOpenPluginUI,
  onAddTrack,
  onRecordHistory,
  embedded = false,
  onOpenPianoRoll,
  onCloneTrack,
  onDeleteTrack,
  onReplaceInstrument,
  onInsertTrack,
  onDropOnTrack,
  onDropToCreateTrack,
}) => {
  const [filterMode, setFilterMode] = useState<'All' | 'Audio' | 'Unsorted'>('All');
  const [swing, setSwing] = useState<number>(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [isDraggingOverBottom, setIsDraggingOverBottom] = useState<boolean>(false);

  if (!isOpen) return null;

  const ticksPerBeat = project.rhythm.ticksPerBeat;
  const ticksPerStep = ticksPerBeat / 4; // 120 ticks (16th note)
  const totalSteps = 16; // 16-step sequencer pattern

  // Check if a note exists at a step for a track
  const hasStepNote = (track: Track, stepIdx: number): Note | undefined => {
    const stepTick = stepIdx * ticksPerStep;
    const isDefaultTrack = project.tracks[0]?.id === track.id;
    return activePattern.notes.find((n) => {
      const isForThisTrack = n.trackId === track.id || (!n.trackId && isDefaultTrack);
      return isForThisTrack && Math.abs(n.startTick - stepTick) < 30;
    });
  };

  const handleToggleStep = (track: Track, stepIdx: number) => {
    const existing = hasStepNote(track, stepIdx);
    const stepTick = stepIdx * ticksPerStep;

    if (existing) {
      onRecordHistory(`Remove Step ${stepIdx + 1}`);
      onUpdatePatternNotes(activePattern.notes.filter((n) => n.id !== existing.id));
    } else {
      onRecordHistory(`Add Step ${stepIdx + 1}`);
      const newNote: Note = {
        id: `step-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        trackId: track.id,
        pitch: track.type === 'drum' ? 0 : project.tuning.referenceNoteStep,
        startTick: stepTick,
        durationTicks: ticksPerStep,
        velocity: 100,
      };
      onUpdatePatternNotes([...activePattern.notes, newNote]);
      audioEngine.previewNote(track, newNote.pitch, project.tuning, 100, 0.3);
    }
  };

  const handlePanChange = (track: Track, panVal: number) => {
    onUpdateTrack({ ...track, pan: panVal });
    audioEngine.updateMixerChannel({
      id: track.mixerChannel,
      name: track.name,
      volume: track.volume,
      pan: panVal,
      muted: track.muted,
      solo: track.solo,
      effects: [],
      sendLevels: {},
      peakL: 0,
      peakR: 0,
    });
  };

  const handleVolumeChange = (track: Track, volVal: number) => {
    onUpdateTrack({ ...track, volume: volVal });
    audioEngine.updateMixerChannel({
      id: track.mixerChannel,
      name: track.name,
      volume: volVal,
      pan: track.pan,
      muted: track.muted,
      solo: track.solo,
      effects: [],
      sendLevels: {},
      peakL: 0,
      peakR: 0,
    });
  };

  if (embedded) {
    return (
      <div className="w-full h-full flex flex-col select-none overflow-hidden text-xs bg-[#13161f]">
        {/* Sub-bar for Filter and Swing */}
        <div className="h-6 bg-[#161a25] border-b border-[#232a3a] px-2.5 flex items-center justify-between shrink-0 text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">TRACKS: {project.tracks.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-[#10131b] border border-[#242c3d] rounded px-1.5 py-0.5">
              <span>{filterMode}</span>
              <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
            </div>

            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
              <span>SWING</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={swing}
                onChange={(e) => setSwing(parseFloat(e.target.value))}
                className="w-10 h-1 bg-[#2b3548] accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 p-2 space-y-1 overflow-y-auto min-h-0 bg-[#13161f]">
          {project.tracks.map((track) => {
            const isSelected = track.id === activeTrackId;
            const isDropTarget = dragOverTrackId === track.id;

            return (
              <div
                key={track.id}
                onClick={() => onSelectTrack(track.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  setDragOverTrackId(track.id);
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  setDragOverTrackId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverTrackId(null);
                  const data = e.dataTransfer.getData('application/json');
                  if (data) {
                    try {
                      onDropOnTrack?.(track.id, JSON.parse(data));
                    } catch (err) {}
                  }
                }}
                className={`h-8 flex items-center justify-between px-1.5 rounded transition-all border ${
                  isDropTarget
                    ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/60 shadow-lg'
                    : isSelected
                    ? 'bg-[#1e2536] border-transparent'
                    : 'hover:bg-[#181d2a] border-transparent'
                }`}
              >
                {/* Left Controls: Mute/Solo LED, Pan, Vol, FX Route */}
                <div className="flex items-center gap-2">
                  {/* Mute/Solo Green LED Dot */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTrack({ ...track, muted: !track.muted });
                    }}
                    className={`w-3 h-3 rounded-full transition-all ${
                      track.muted
                        ? 'bg-zinc-700 shadow-none'
                        : 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                    }`}
                    title={track.muted ? 'Unmute' : 'Mute (Active)'}
                  />

                  {/* Pan Knobs */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-zinc-500 font-mono">P</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.05}
                      value={track.pan}
                      onChange={(e) => {
                        e.stopPropagation();
                        handlePanChange(track, parseFloat(e.target.value));
                      }}
                      className="w-8 h-1 bg-[#283244] accent-cyan-400 cursor-pointer"
                      title={`Pan: ${Math.round(track.pan * 100)}%`}
                    />
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-zinc-500 font-mono">V</span>
                    <input
                      type="range"
                      min={0}
                      max={1.25}
                      step={0.02}
                      value={track.volume}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleVolumeChange(track, parseFloat(e.target.value));
                      }}
                      className="w-10 h-1 bg-[#283244] accent-emerald-400 cursor-pointer"
                      title={`Volume: ${Math.round(track.volume * 100)}%`}
                    />
                  </div>

                  {/* FX Route / Mixer Insert Badge */}
                  <span
                    className="w-5 h-4.5 rounded bg-[#10131b] border border-[#273042] text-[10px] font-mono text-zinc-400 flex items-center justify-center cursor-pointer hover:border-zinc-500"
                    title={`Routed to Mixer Channel ${track.mixerChannel}`}
                  >
                    {track.mixerChannel}
                  </span>

                  {/* Track Name / Instrument Button (Click to open Plugin UI, Right click for FL Context Menu) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrack(track.id);
                      onOpenPluginUI(track.id);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelectTrack(track.id);
                      setContextMenu({ x: e.clientX, y: e.clientY, track });
                    }}
                    className={`w-28 h-6 rounded px-2 text-left font-semibold text-[11px] truncate flex items-center gap-1.5 transition-colors border ${
                      isDropTarget
                        ? 'bg-cyan-900 text-white border-cyan-300'
                        : isSelected
                        ? 'bg-[#293248] text-white border-cyan-500/70 shadow-xs'
                        : 'bg-[#1b202c] text-zinc-200 border-[#283144] hover:bg-[#222838]'
                    }`}
                    title="Click: Open Plugin UI | Right Click: Channel Options | Drag audio/SF2 here to load!"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: track.color }}
                    />
                    <span className="truncate">{track.name}</span>
                  </button>
                </div>

                {/* Right: 16-Step Sequencer Pads */}
                <div className="flex items-center gap-1 pl-2">
                  {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                    const isLightGroup = Math.floor(stepIdx / 4) % 2 === 0;
                    const noteAtStep = hasStepNote(track, stepIdx);
                    const isActive = Boolean(noteAtStep);

                    return (
                      <button
                        key={stepIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStep(track, stepIdx);
                        }}
                        className={`w-4.5 h-6 rounded-xs transition-all border ${
                          isActive
                            ? 'bg-amber-400 border-amber-300 shadow-[0_0_5px_#f59e0b]'
                            : isLightGroup
                            ? 'bg-[#2a3040] hover:bg-[#343d52] border-[#384258]'
                            : 'bg-[#1c212c] hover:bg-[#252c3b] border-[#262c3b]'
                        }`}
                        title={`Step ${stepIdx + 1} (${isActive ? 'Active' : 'Empty'})`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Add Channel Button (+) at bottom of Channel Rack / Drop target to create track */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              setIsDraggingOverBottom(true);
            }}
            onDragLeave={() => setIsDraggingOverBottom(false)}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingOverBottom(false);
              const data = e.dataTransfer.getData('application/json');
              if (data) {
                try {
                  onDropToCreateTrack?.(JSON.parse(data));
                } catch (err) {}
              }
            }}
            className="pt-2"
          >
            <button
              onClick={onAddTrack}
              className={`w-full py-2 rounded border border-dashed transition-all text-xs font-semibold flex items-center justify-center gap-1.5 ${
                isDraggingOverBottom
                  ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200 ring-2 ring-cyan-400/50 scale-[1.01]'
                  : 'border-[#2b3548] hover:border-emerald-500/80 bg-[#161a24] hover:bg-[#202738] text-zinc-300 hover:text-emerald-400'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isDraggingOverBottom ? 'Drop here to create new channel!' : 'Add one / VST (or drag & drop file here)...'}</span>
            </button>
          </div>
        </div>

        {/* FL Studio Right-Click Channel Context Menu */}
        {contextMenu && (
          <TrackContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            track={contextMenu.track}
            project={project}
            activePattern={activePattern}
            onClose={() => setContextMenu(null)}
            onOpenPianoRoll={(tId) => {
              onSelectTrack(tId);
              onOpenPianoRoll?.(tId);
            }}
            onUpdateTrack={onUpdateTrack}
            onCloneTrack={(tId) => onCloneTrack?.(tId)}
            onDeleteTrack={(tId) => onDeleteTrack?.(tId)}
            onReplaceInstrument={(tId, instId, name) => onReplaceInstrument?.(tId, instId, name)}
            onInsertTrack={(tId) => onInsertTrack?.(tId)}
            onUpdatePatternNotes={onUpdatePatternNotes}
            onRecordHistory={onRecordHistory}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-[520px] bg-[#161a24] border border-[#2a3244] rounded-lg shadow-2xl flex flex-col select-none overflow-hidden text-xs z-30">
      {/* Title Bar (FL Studio Style) */}
      <div className="h-7 bg-[#1c2230] border-b border-[#293246] px-2.5 flex items-center justify-between shrink-0 handle cursor-move">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-white text-xs tracking-wide">Channel rack</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 bg-[#12151e] border border-[#262f42] rounded px-1.5 py-0.5">
            <span>{filterMode}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </div>

          {/* Swing Knob */}
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono">
            <span>SWING</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={swing}
              onChange={(e) => setSwing(parseFloat(e.target.value))}
              className="w-10 h-1 bg-[#2b3548] accent-amber-500 cursor-pointer"
            />
          </div>

          <button
            onClick={onClose}
            className="w-4 h-4 rounded-sm flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-900/60"
            title="Close Channel Rack"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Channels List */}
      <div className="p-2 space-y-1 max-h-96 overflow-y-auto bg-[#13161f]">
        {project.tracks.map((track) => {
          const isSelected = track.id === activeTrackId;

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`h-8 flex items-center justify-between px-1.5 rounded transition-colors ${
                isSelected ? 'bg-[#1e2536]' : 'hover:bg-[#181d2a]'
              }`}
            >
              {/* Left Controls: Mute/Solo LED, Pan, Vol, FX Route */}
              <div className="flex items-center gap-2">
                {/* Mute/Solo Green LED Dot */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTrack({ ...track, muted: !track.muted });
                  }}
                  className={`w-3 h-3 rounded-full transition-all ${
                    track.muted
                      ? 'bg-zinc-700 shadow-none'
                      : 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                  }`}
                  title={track.muted ? 'Unmute' : 'Mute (Active)'}
                />

                {/* Pan Mini Knob */}
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={track.pan}
                  onChange={(e) => handlePanChange(track, parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-1 bg-[#283042] rounded accent-cyan-400 cursor-pointer"
                  title={`Pan: ${Math.round(track.pan * 100)}%`}
                />

                {/* Vol Mini Knob */}
                <input
                  type="range"
                  min={0}
                  max={1.2}
                  step={0.02}
                  value={track.volume}
                  onChange={(e) => handleVolumeChange(track, parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-1 bg-[#283042] rounded accent-emerald-500 cursor-pointer"
                  title={`Volume: ${Math.round(track.volume * 100)}%`}
                />

                {/* Mixer Routing Box */}
                <div
                  className="w-7 h-5 bg-[#0f1118] border border-[#273042] rounded text-center text-[10px] font-mono font-bold text-zinc-300 flex items-center justify-center cursor-pointer hover:border-cyan-400"
                  title={`Routing to Mixer Insert ${track.mixerChannel}`}
                >
                  {track.mixerChannel}
                </div>

                {/* Channel Name Button (Clicking opens the Plugin Window! Right click for Context Menu) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTrack(track.id);
                    onOpenPluginUI(track.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectTrack(track.id);
                    setContextMenu({ x: e.clientX, y: e.clientY, track });
                  }}
                  className={`w-28 h-6 rounded px-2 text-left font-semibold text-[11px] truncate flex items-center gap-1.5 transition-colors border ${
                    isSelected
                      ? 'bg-[#293248] text-white border-cyan-500/70 shadow-xs'
                      : 'bg-[#1b202c] text-zinc-200 border-[#283144] hover:bg-[#222838]'
                  }`}
                  title="Click: Open Plugin UI | Right Click: Channel Options"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="truncate">{track.name}</span>
                </button>
              </div>

              {/* Right: 16-Step Sequencer Pads (in 4 groups of 4) */}
              <div className="flex items-center gap-1 pl-2">
                {Array.from({ length: totalSteps }).map((_, stepIdx) => {
                  const isBeatStart = stepIdx % 4 === 0;
                  const isLightGroup = Math.floor(stepIdx / 4) % 2 === 0;
                  const noteAtStep = hasStepNote(track, stepIdx);
                  const isActive = Boolean(noteAtStep);

                  return (
                    <button
                      key={stepIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStep(track, stepIdx);
                      }}
                      className={`w-4.5 h-6 rounded-xs transition-all border ${
                        isActive
                          ? 'bg-amber-400 border-amber-300 shadow-[0_0_5px_#f59e0b]'
                          : isLightGroup
                          ? 'bg-[#2a3040] hover:bg-[#343d52] border-[#384258]'
                          : 'bg-[#1c212c] hover:bg-[#252c3b] border-[#262c3b]'
                      }`}
                      title={`Step ${stepIdx + 1} (${isActive ? 'Active' : 'Empty'})`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Channel Button (+) at bottom of Channel Rack */}
        <div className="pt-2">
          <button
            onClick={onAddTrack}
            className="w-full py-1.5 rounded border border-dashed border-[#2b3548] hover:border-emerald-500/80 bg-[#161a24] hover:bg-[#202738] text-zinc-300 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add one / VST...</span>
          </button>
        </div>
      </div>

      {/* FL Studio Right-Click Channel Context Menu */}
      {contextMenu && (
        <TrackContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={contextMenu.track}
          project={project}
          activePattern={activePattern}
          onClose={() => setContextMenu(null)}
          onOpenPianoRoll={(tId) => {
            onSelectTrack(tId);
            onOpenPianoRoll?.(tId);
          }}
          onUpdateTrack={onUpdateTrack}
          onCloneTrack={(tId) => onCloneTrack?.(tId)}
          onDeleteTrack={(tId) => onDeleteTrack?.(tId)}
          onReplaceInstrument={(tId, instId, name) => onReplaceInstrument?.(tId, instId, name)}
          onInsertTrack={(tId) => onInsertTrack?.(tId)}
          onUpdatePatternNotes={onUpdatePatternNotes}
          onRecordHistory={onRecordHistory}
        />
      )}
    </div>
  );
};
