import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Circle,
  Repeat,
  Volume2,
  Sliders,
  Layers,
  Piano,
  FolderOpen,
  Save,
  Radio,
  Clock,
  Compass,
  Zap,
} from 'lucide-react';
import { Project, SnapValue } from '../types/daw';
import { audioEngine } from '../audio/engine';

interface TransportBarProps {
  project: Project;
  isPlaying: boolean;
  isRecording: boolean;
  playMode: 'pat' | 'song';
  playheadTick: number;
  onTogglePlayMode: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecordToggle: () => void;
  onUpdateBpm: (bpm: number) => void;
  onUpdateSnap: (snap: SnapValue) => void;
  onToggleView: (view: 'playlist' | 'piano-roll' | 'channel-rack' | 'mixer' | 'browser') => void;
  onSaveProject: () => void;
  onSelectPattern: (patternId: string) => void;
  onAddPattern: () => void;
  activePatternId: string;
  activeViews: {
    playlist: boolean;
    pianoRoll: boolean;
    channelRack: boolean;
    mixer: boolean;
    browser: boolean;
  };
}

export const TransportBar: React.FC<TransportBarProps> = ({
  project,
  isPlaying,
  isRecording,
  playMode,
  playheadTick,
  onTogglePlayMode,
  onPlay,
  onPause,
  onStop,
  onRecordToggle,
  onUpdateBpm,
  onUpdateSnap,
  onToggleView,
  onSaveProject,
  onSelectPattern,
  onAddPattern,
  activePatternId,
  activeViews,
}) => {
  const [bpmInput, setBpmInput] = useState(project.bpm.toFixed(3));
  const [masterVol, setMasterVol] = useState(project.masterVolume);
  const [meterL, setMeterL] = useState(0);
  const [meterR, setMeterR] = useState(0);

  useEffect(() => {
    setBpmInput(project.bpm.toFixed(3));
  }, [project.bpm]);

  // Meter polling
  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      if (isPlaying) {
        const levels = audioEngine.getMasterPeakLevels();
        setMeterL(levels.left);
        setMeterR(levels.right);
      } else {
        setMeterL((prev) => Math.max(0, prev * 0.85));
        setMeterR((prev) => Math.max(0, prev * 0.85));
      }
      animId = requestAnimationFrame(updateMeter);
    };
    animId = requestAnimationFrame(updateMeter);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const handleBpmCommit = () => {
    const val = parseFloat(bpmInput);
    if (!isNaN(val) && val >= 30 && val <= 400) {
      onUpdateBpm(Math.round(val * 1000) / 1000);
    } else {
      setBpmInput(project.bpm.toFixed(3));
    }
  };

  // Convert playheadTick to time format (00:00:00) and Musical Position (Bar : Beat : Step)
  const seconds = (playheadTick / (project.bpm * (project.rhythm.ticksPerBeat / 60)));
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  const timeString = `${mins}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;

  const ticksPerBeat = project.rhythm.ticksPerBeat;
  const ticksPerMeasure = project.rhythm.totalBeats * ticksPerBeat;
  const barNum = Math.floor(playheadTick / ticksPerMeasure) + 1;
  const beatInMeasure = Math.floor((playheadTick % ticksPerMeasure) / ticksPerBeat) + 1;
  const stepInBeat = Math.floor(((playheadTick % ticksPerMeasure) % ticksPerBeat) / (ticksPerBeat / 4)) + 1;
  const barPosString = `${barNum} : ${beatInMeasure} : ${stepInBeat}`;

  return (
    <div className="h-11 bg-[#191d27] border-b border-[#242938] px-2.5 flex items-center justify-between select-none text-xs shrink-0 z-40 text-zinc-300">
      {/* Left Segment: PAT/SONG, Transport, BPM, Time Display */}
      <div className="flex items-center gap-2">
        {/* PAT / SONG Switcher (FL Studio style) */}
        <div className="flex rounded-md overflow-hidden border border-[#2e374b] bg-[#141720] p-0.5">
          <button
            onClick={onTogglePlayMode}
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors ${
              playMode === 'pat'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Pattern Mode (Plays active pattern only)"
          >
            PAT
          </button>
          <button
            onClick={onTogglePlayMode}
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors ${
              playMode === 'song'
                ? 'bg-amber-500 text-black shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Song Mode (Plays full playlist / arrangement)"
          >
            SONG
          </button>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1 bg-[#141720] border border-[#2b3346] rounded-md p-0.5">
          <button
            onClick={isPlaying ? onPause : onPlay}
            title="Play / Pause (Space)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              isPlaying
                ? 'bg-emerald-500 text-black'
                : 'bg-[#202534] hover:bg-[#283042] text-zinc-200'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5 text-emerald-400" />
            )}
          </button>

          <button
            onClick={onStop}
            title="Stop"
            className="w-7 h-7 rounded bg-[#202534] hover:bg-[#283042] text-zinc-300 flex items-center justify-center"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>

          <button
            onClick={onRecordToggle}
            title="Record Audio"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#202534] hover:bg-[#283042] text-rose-400'
            }`}
          >
            <Circle className={`w-3 h-3 ${isRecording ? 'fill-white' : 'fill-rose-500'}`} />
          </button>
        </div>

        {/* BPM Counter Display */}
        <div className="flex items-center bg-[#13151e] border border-[#2b3346] rounded px-2 py-1 text-xs gap-1.5 shadow-inner">
          <span className="text-[10px] text-zinc-500 font-mono">BPM</span>
          <input
            type="text"
            value={bpmInput}
            onChange={(e) => setBpmInput(e.target.value)}
            onBlur={handleBpmCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleBpmCommit()}
            className="w-14 bg-transparent text-center font-mono font-bold text-amber-400 focus:outline-none"
          />
        </div>

        {/* FL Studio Style LCD Digital Clock / Position Display */}
        <div className="flex items-center gap-2 bg-[#0c0e14] border border-[#282f42] rounded px-2.5 py-1 text-cyan-400 font-mono shadow-inner">
          <Clock className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-widest">{timeString}</span>
            <span className="text-[9px] text-cyan-600 font-medium tracking-tight">
              BAR: {barPosString}
            </span>
          </div>
        </div>

        {/* Snap Selector */}
        <div className="flex items-center bg-[#141720] border border-[#2b3346] rounded px-2 py-1 text-xs gap-1">
          <span className="text-zinc-500 text-[10px]">SNAP:</span>
          <select
            value={project.snapGrid}
            onChange={(e) => onUpdateSnap(e.target.value as SnapValue)}
            className="bg-transparent text-zinc-200 font-mono text-[11px] focus:outline-none cursor-pointer"
          >
            <option value="bar" className="bg-[#141720]">Bar</option>
            <option value="group" className="bg-[#141720]">Group</option>
            <option value="beat" className="bg-[#141720]">Beat</option>
            <option value="step" className="bg-[#141720]">Line / 1/16</option>
            <option value="1/2" className="bg-[#141720]">1/2</option>
            <option value="1/4" className="bg-[#141720]">1/4</option>
            <option value="none" className="bg-[#141720]">None</option>
          </select>
        </div>

        {/* Pattern Selector */}
        <div className="flex items-center bg-[#141720] border border-[#2b3346] rounded px-2 py-1 text-xs gap-1.5">
          <span className="text-zinc-500 text-[10px]">PAT:</span>
          <select
            value={activePatternId}
            onChange={(e) => onSelectPattern(e.target.value)}
            className="bg-transparent text-cyan-300 font-bold font-mono text-[11px] focus:outline-none cursor-pointer"
          >
            {project.patterns.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#141720]">
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={onAddPattern}
            className="w-4 h-4 rounded bg-[#202636] hover:bg-[#2c344a] text-emerald-400 flex items-center justify-center text-xs font-bold"
            title="Create New Pattern"
          >
            +
          </button>
        </div>
      </div>

      {/* Right Segment: Master Volume Knob, Meters & FL Studio Quick Window Toggle Icons */}
      <div className="flex items-center gap-3">
        {/* Master Output Meter */}
        <div className="flex items-center gap-1.5 bg-[#141720] border border-[#2b3346] rounded px-2 py-1">
          <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.01}
            value={masterVol}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMasterVol(v);
              audioEngine.setMasterVolume(v);
            }}
            className="w-14 h-1 bg-[#2b3447] rounded accent-emerald-500 cursor-pointer"
            title={`Master Volume: ${Math.round(masterVol * 100)}%`}
          />
          {/* Dual LED Meter */}
          <div className="flex flex-col gap-0.5 w-10 h-3 bg-black/80 rounded px-0.5 py-0.5">
            <div className="h-1 bg-zinc-800 rounded-xs overflow-hidden">
              <div
                className={`h-full ${
                  meterL > 0.85 ? 'bg-rose-500' : meterL > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, meterL * 100)}%` }}
              />
            </div>
            <div className="h-1 bg-zinc-800 rounded-xs overflow-hidden">
              <div
                className={`h-full ${
                  meterR > 0.85 ? 'bg-rose-500' : meterR > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, meterR * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CPU & RAM Indicator */}
        <div className="hidden lg:flex items-center gap-2 bg-[#12151e] border border-[#262c3d] rounded px-2 py-1 font-mono text-[10px] text-zinc-400">
          <span>CPU: <strong className="text-emerald-400">2%</strong></span>
          <span>RAM: <strong className="text-zinc-300">180 MB</strong></span>
        </div>

        {/* Window Toggle Icons (The iconic FL toolbar cluster) */}
        <div className="flex items-center gap-0.5 bg-[#141720] border border-[#2b3346] rounded p-0.5">
          <button
            onClick={() => onToggleView('playlist')}
            title="View Playlist / Arranger (F5)"
            className={`p-1.5 rounded transition-colors ${
              activeViews.playlist
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#202636]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleView('piano-roll')}
            title="View Piano Roll (F7)"
            className={`p-1.5 rounded transition-colors ${
              activeViews.pianoRoll
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#202636]'
            }`}
          >
            <Piano className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleView('channel-rack')}
            title="View Channel Rack / Step Sequencer (F6)"
            className={`p-1.5 rounded transition-colors ${
              activeViews.channelRack
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#202636]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleView('mixer')}
            title="View Mixer (F9)"
            className={`p-1.5 rounded transition-colors ${
              activeViews.mixer
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#202636]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleView('browser')}
            title="Toggle Browser Sidebar (Alt+F8)"
            className={`p-1.5 rounded transition-colors ${
              activeViews.browser
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-[#202636]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onSaveProject}
            title="Save Project (Ctrl+S)"
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#202636]"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
