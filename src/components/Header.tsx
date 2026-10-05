import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Circle,
  Repeat,
  RotateCcw,
  RotateCw,
  FolderDown,
  Settings,
  Music,
  Sliders,
  Sparkles,
  Layers,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { Project, SnapValue } from '../types/daw';
import { audioEngine } from '../audio/engine';

interface HeaderProps {
  project: Project;
  isPlaying: boolean;
  isRecording: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecordToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUpdateBpm: (bpm: number) => void;
  onUpdateSnap: (snap: SnapValue) => void;
  onToggleSnapToScale: () => void;
  onOpenTuningModal: () => void;
  onOpenRhythmModal: () => void;
  onOpenScaleModal: () => void;
  onOpenCollectModal: () => void;
  onOpenSettingsModal: () => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  isPlaying,
  isRecording,
  onPlay,
  onPause,
  onStop,
  onRecordToggle,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onUpdateBpm,
  onUpdateSnap,
  onToggleSnapToScale,
  onOpenTuningModal,
  onOpenRhythmModal,
  onOpenScaleModal,
  onOpenCollectModal,
  onOpenSettingsModal,
  onNewProject,
  onSaveProject,
  onLoadProject,
}) => {
  const [bpmInput, setBpmInput] = useState(project.bpm.toString());
  const [masterVol, setMasterVol] = useState(project.masterVolume);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [meterL, setMeterL] = useState(0);
  const [meterR, setMeterR] = useState(0);

  useEffect(() => {
    setBpmInput(project.bpm.toString());
  }, [project.bpm]);

  // Audio meter polling
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
    const val = parseInt(bpmInput, 10);
    if (!isNaN(val) && val >= 30 && val <= 300) {
      onUpdateBpm(val);
    } else {
      setBpmInput(project.bpm.toString());
    }
  };

  const handleMasterVolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMasterVol(val);
    audioEngine.setMasterVolume(val);
  };

  return (
    <header className="h-14 bg-[#16181d] border-b border-[#252830] px-3 flex items-center justify-between select-none shrink-0 z-30">
      {/* Brand & Project Menu */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#1e2129] hover:bg-[#282c37] border border-[#2b303d] text-xs font-semibold text-white transition-colors"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold tracking-tight">AetherDAW</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {projectMenuOpen && (
            <div
              className="absolute left-0 mt-1 w-52 bg-[#1c1f26] border border-[#2e3340] rounded shadow-2xl py-1 z-50 text-xs text-zinc-200"
              onMouseLeave={() => setProjectMenuOpen(false)}
            >
              <div className="px-3 py-1.5 font-semibold text-zinc-400 border-b border-[#262b36]">
                {project.name}
              </div>
              <button
                onClick={() => {
                  onNewProject();
                  setProjectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#2a303d] flex items-center gap-2"
              >
                <span>New Project</span>
              </button>
              <button
                onClick={() => {
                  onSaveProject();
                  setProjectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#2a303d] flex items-center justify-between"
              >
                <span>Save Project</span>
                <span className="text-[10px] text-zinc-500">Ctrl+S</span>
              </button>
              <button
                onClick={() => {
                  onLoadProject();
                  setProjectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#2a303d] flex items-center gap-2"
              >
                <span>Load Project (.experimental)</span>
              </button>
              <div className="border-t border-[#262b36] my-1"></div>
              <button
                onClick={() => {
                  onOpenCollectModal();
                  setProjectMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#2a303d] flex items-center gap-2 text-emerald-400"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Collect Project Files...</span>
              </button>
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-[#1c1f26] border border-[#2b303d] rounded p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded transition-colors ${
              canUndo ? 'hover:bg-[#2b3140] text-zinc-200' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1.5 rounded transition-colors ${
              canRedo ? 'hover:bg-[#2b3140] text-zinc-200' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Transport & Master Clock */}
      <div className="flex items-center gap-3">
        {/* Transport Controls */}
        <div className="flex items-center bg-[#1a1d24] border border-[#282c38] rounded-md p-1 gap-1">
          <button
            onClick={isPlaying ? onPause : onPlay}
            title="Play / Pause (Space)"
            className={`px-3 py-1.5 rounded font-medium flex items-center gap-1.5 text-xs transition-colors ${
              isPlaying
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-[#232732] hover:bg-[#2d3240] text-zinc-200'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={onStop}
            title="Stop"
            className="p-1.5 rounded bg-[#232732] hover:bg-[#2d3240] text-zinc-300 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={onRecordToggle}
            title="Record Audio (Mic/Input)"
            className={`px-2.5 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#232732] hover:bg-[#2d3240] text-rose-400'
            }`}
          >
            <Circle className={`w-3 h-3 ${isRecording ? 'fill-white' : 'fill-rose-500'}`} />
            <span>{isRecording ? 'Recording' : 'Rec'}</span>
          </button>
        </div>

        {/* BPM Input */}
        <div className="flex items-center bg-[#1a1d24] border border-[#282c38] rounded px-2 py-1 text-xs gap-1.5">
          <span className="text-zinc-500 font-mono font-medium">BPM</span>
          <input
            type="number"
            min={40}
            max={300}
            value={bpmInput}
            onChange={(e) => setBpmInput(e.target.value)}
            onBlur={handleBpmCommit}
            onKeyDown={(e) => e.key === 'Enter' && handleBpmCommit()}
            className="w-12 bg-transparent text-center font-mono font-bold text-amber-400 focus:outline-none"
          />
        </div>

        {/* Compound Rhythm Structure Pill */}
        <button
          onClick={onOpenRhythmModal}
          title="Custom Rhythm Structure & Irregular Compound Meter"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1d24] hover:bg-[#242833] border border-[#2c3240] rounded text-xs transition-colors group"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400">Rhythm:</span>
          <span className="font-mono font-semibold text-cyan-300 tracking-tight">
            [{project.rhythm.groups.join(', ')}]
          </span>
          <span className="text-[10px] text-zinc-500">({project.rhythm.totalBeats}b)</span>
        </button>

        {/* Microtonal Tuning Pill */}
        <button
          onClick={onOpenTuningModal}
          title="Microtonal N-TET Tuning System"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1d24] hover:bg-[#242833] border border-[#2c3240] rounded text-xs transition-colors group"
        >
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-zinc-400">Tuning:</span>
          <span className="font-mono font-semibold text-indigo-300">
            {project.tuning.divisionsPerOctave}-TET
          </span>
          <span className="text-[10px] text-zinc-500">A4={project.tuning.referencePitchHz}Hz</span>
        </button>

        {/* Procedural Scale Pill */}
        <button
          onClick={onOpenScaleModal}
          title="Procedural Scale Generator & Acoustic Consonance"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1d24] hover:bg-[#242833] border border-[#2c3240] rounded text-xs transition-colors group"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-400">Scale:</span>
          <span className="font-medium text-emerald-300 truncate max-w-[110px]">
            {project.scale.name.split('(')[0].replace('Procedural ', '')}
          </span>
          <span className="text-[10px] text-zinc-500">({project.scale.steps.length}n)</span>
        </button>

        {/* Snap to Scale Toggle */}
        <button
          onClick={onToggleSnapToScale}
          title="Snap to Scale: forces notes to lock to current procedural scale degrees"
          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
            project.snapToScale
              ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300'
              : 'bg-[#1a1d24] border-[#2c3240] text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Scale Snap: {project.snapToScale ? 'ON' : 'OFF'}
        </button>

        {/* Grid Snap Selector */}
        <div className="flex items-center bg-[#1a1d24] border border-[#282c38] rounded px-2 py-1 text-xs gap-1">
          <span className="text-zinc-500">Snap:</span>
          <select
            value={project.snapGrid}
            onChange={(e) => onUpdateSnap(e.target.value as SnapValue)}
            className="bg-transparent text-zinc-200 font-mono focus:outline-none cursor-pointer"
          >
            <option value="bar" className="bg-[#1a1d24]">Bar</option>
            <option value="group" className="bg-[#1a1d24]">Group</option>
            <option value="beat" className="bg-[#1a1d24]">Beat</option>
            <option value="step" className="bg-[#1a1d24]">1/16 Step</option>
            <option value="1/2" className="bg-[#1a1d24]">1/2</option>
            <option value="1/4" className="bg-[#1a1d24]">1/4</option>
            <option value="none" className="bg-[#1a1d24]">None</option>
          </select>
        </div>
      </div>

      {/* Right: Master Output, VU Meter, Settings */}
      <div className="flex items-center gap-3">
        {/* Master Volume & Stereo Meter */}
        <div className="flex items-center gap-2 bg-[#1a1d24] border border-[#282c38] rounded px-2 py-1">
          <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="range"
            min={0}
            max={1.2}
            step={0.01}
            value={masterVol}
            onChange={handleMasterVolChange}
            className="w-16 h-1 bg-[#2b303c] rounded accent-emerald-500 cursor-pointer"
            title={`Master Volume: ${Math.round(masterVol * 100)}%`}
          />
          {/* Dual LED Meter */}
          <div className="flex flex-col gap-0.5 w-12 h-3 bg-black/60 rounded px-0.5 py-0.5">
            <div className="h-1 bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  meterL > 0.85 ? 'bg-rose-500' : meterL > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, meterL * 100)}%` }}
              />
            </div>
            <div className="h-1 bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  meterR > 0.85 ? 'bg-rose-500' : meterR > 0.6 ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, meterR * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Offline Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 bg-[#16181d] px-2 py-1 rounded border border-[#262933]">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Offline Ready</span>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettingsModal}
          title="Audio Engine & Hardware MIDI Setup"
          className="p-1.5 rounded bg-[#1c1f26] hover:bg-[#282c37] border border-[#2b303d] text-zinc-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
