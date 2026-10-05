import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  FolderOpen,
  Cpu,
  Radio,
  Sliders,
  HardDrive,
  RefreshCw,
  Check,
  AlertTriangle,
  FolderPlus,
  Trash2,
  Sparkles,
  Shield,
  Layers,
  Volume2,
} from 'lucide-react';
import { TuningSystem } from '../types/daw';
import { audioEngine } from '../audio/engine';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: string;
  tuning: TuningSystem;
  onClose: () => void;
  onUpdateTuning?: (tuning: TuningSystem) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = 'files',
  tuning,
  onClose,
  onUpdateTuning,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Files & Library paths
  const [samplePaths, setSamplePaths] = useState<string[]>([
    'C:\\Program Files\\Image-Line\\FL Studio 2026\\Data\\Patches\\Packs',
    'C:\\Audio\\Samples',
    'D:\\Samples\\Drum Kits',
    'D:\\Sound Libraries',
  ]);
  const [newSamplePath, setNewSamplePath] = useState('');

  // FL Studio paths (Section 50)
  const [flStudioPath, setFlStudioPath] = useState('C:\\Program Files\\Image-Line\\FL Studio 2026');
  const [flPacksPath, setFlPacksPath] = useState('C:\\Program Files\\Image-Line\\FL Studio 2026\\Data\\Patches\\Packs');
  const [flDetected, setFlDetected] = useState(true);

  // Plugin paths (Section 49)
  const [pluginPaths, setPluginPaths] = useState<string[]>([
    'C:\\Program Files\\Common Files\\VST3',
    'C:\\Program Files\\VSTPlugins',
    'D:\\Plugins\\Instruments',
    'D:\\Plugins\\Effects',
  ]);
  const [newPluginPath, setNewPluginPath] = useState('');

  // Audio settings
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [bufferSize, setBufferSize] = useState<number>(256);

  // MPE settings (Section 65)
  const [mpeEnabled, setMpeEnabled] = useState(true);
  const [mpeChannels, setMpeChannels] = useState('2-16');
  const [pitchBendRange, setPitchBendRange] = useState(48);

  // Autosave settings (Section 68)
  const [autosaveEnabled, setAutosaveEnabled] = useState(true);
  const [autosaveInterval, setAutosaveInterval] = useState('5 min');
  const [backupCount, setBackupCount] = useState(10);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  const handleAddSamplePath = () => {
    if (newSamplePath.trim() && !samplePaths.includes(newSamplePath.trim())) {
      setSamplePaths([...samplePaths, newSamplePath.trim()]);
      setNewSamplePath('');
    }
  };

  const handleRemoveSamplePath = (p: string) => {
    setSamplePaths(samplePaths.filter((item) => item !== p));
  };

  const handleAddPluginPath = () => {
    if (newPluginPath.trim() && !pluginPaths.includes(newPluginPath.trim())) {
      setPluginPaths([...pluginPaths, newPluginPath.trim()]);
      setNewPluginPath('');
    }
  };

  const handleRemovePluginPath = (p: string) => {
    setPluginPaths(pluginPaths.filter((item) => item !== p));
  };

  const estimatedLatency = Math.round((bufferSize / sampleRate) * 1000 * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#14161e] border border-[#2b3040] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[75vh]">
        {/* Header */}
        <div className="h-12 bg-[#191c26] border-b border-[#292e3c] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Settings & Library Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282d3b] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Sidebar */}
          <div className="w-56 bg-[#111319] border-r border-[#222634] p-2 space-y-0.5 overflow-y-auto shrink-0 select-none text-xs">
            <button
              onClick={() => setActiveTab('files')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'files'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Files & Libraries</span>
            </button>

            <button
              onClick={() => setActiveTab('flstudio')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'flstudio'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>FL Studio Integration</span>
            </button>

            <button
              onClick={() => setActiveTab('plugins')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'plugins'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Plugin Manager & VST</span>
            </button>

            <button
              onClick={() => setActiveTab('audio')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'audio'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Device</span>
            </button>

            <button
              onClick={() => setActiveTab('midi')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'midi'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>MIDI & MPE</span>
            </button>

            <button
              onClick={() => setActiveTab('microtonal')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'microtonal'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Microtonal Setup</span>
            </button>

            <button
              onClick={() => setActiveTab('autosave')}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 transition-colors ${
                activeTab === 'autosave'
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-[#1a1d28] hover:text-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Autosave & Backups</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 bg-[#151720] p-5 overflow-y-auto text-xs text-zinc-300">
            {/* FILES & LIBRARIES (Section 48, 51, 52) */}
            {activeTab === 'files' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Files & Sound Library Folders
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Configure your existing folders for samples, SoundFonts (sf2), drum kits, and sound libraries on your computer without duplicating files.
                  </p>
                </div>

                <div className="bg-[#12141a] p-3 rounded-lg border border-[#242936] space-y-2">
                  <span className="font-semibold text-zinc-200 text-xs block">
                    Indexed Sample & Pack Directories:
                  </span>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {samplePaths.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-[#191d27] p-2 rounded flex items-center justify-between border border-[#283042]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{p}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveSamplePath(p)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add folder path (e.g. D:\Samples\Packs)..."
                      value={newSamplePath}
                      onChange={(e) => setNewSamplePath(e.target.value)}
                      className="flex-1 bg-[#191d27] border border-[#2b3346] rounded px-3 py-1.5 text-xs text-zinc-200"
                    />
                    <button
                      onClick={handleAddSamplePath}
                      className="px-3 py-1.5 rounded bg-[#202738] hover:bg-[#2b344a] text-cyan-300 border border-[#303a50] font-semibold"
                    >
                      + Add Folder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FL STUDIO INTEGRATION (Section 50) */}
            {activeTab === 'flstudio' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    FL Studio Library Integration
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Point to your existing FL Studio installation to automatically index and access its packs, soundfonts, and compatible generators without duplicating disk space.
                  </p>
                </div>

                <div className="bg-[#12141a] p-4 rounded-lg border border-[#242936] space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      FL Studio Installation Folder:
                    </label>
                    <input
                      type="text"
                      value={flStudioPath}
                      onChange={(e) => setFlStudioPath(e.target.value)}
                      className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs font-mono text-zinc-200"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      FL Studio Packs & SoundFonts Directory:
                    </label>
                    <input
                      type="text"
                      value={flPacksPath}
                      onChange={(e) => setFlPacksPath(e.target.value)}
                      className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs font-mono text-zinc-200"
                    />
                  </div>

                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      FL Studio library detected: 14 soundfont banks and 8 pack categories indexed in the browser sidebar.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PLUGIN MANAGER (Section 49, 53, 56) */}
            {activeTab === 'plugins' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Plugin Search Paths & VST Host
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Locations scanned for VST3 and VST2 plugins on this computer.
                  </p>
                </div>

                <div className="bg-[#12141a] p-3 rounded-lg border border-[#242936] space-y-2">
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {pluginPaths.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-[#191d27] p-2 rounded flex items-center justify-between border border-[#283042]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{p}</span>
                        </div>
                        <button
                          onClick={() => handleRemovePluginPath(p)}
                          className="text-zinc-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add plugin directory path..."
                      value={newPluginPath}
                      onChange={(e) => setNewPluginPath(e.target.value)}
                      className="flex-1 bg-[#191d27] border border-[#2b3346] rounded px-3 py-1.5 text-xs text-zinc-200"
                    />
                    <button
                      onClick={handleAddPluginPath}
                      className="px-3 py-1.5 rounded bg-[#202738] hover:bg-[#2b344a] text-cyan-300 border border-[#303a50] font-semibold"
                    >
                      + Add Path
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AUDIO SETTINGS (Section 63) */}
            {activeTab === 'audio' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Audio Engine & Output</h3>
                  <p className="text-zinc-400 text-xs">
                    Sample rate, buffer sizes, and low latency hardware configuration.
                  </p>
                </div>

                <div className="bg-[#12141a] p-4 rounded-lg border border-[#242936] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Sample Rate:
                      </label>
                      <select
                        value={sampleRate}
                        onChange={(e) => setSampleRate(parseInt(e.target.value))}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs text-zinc-200"
                      >
                        <option value={44100}>44,100 Hz</option>
                        <option value={48000}>48,000 Hz (Standard)</option>
                        <option value={96000}>96,000 Hz (Hi-Res)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Audio Buffer Size:
                      </label>
                      <select
                        value={bufferSize}
                        onChange={(e) => setBufferSize(parseInt(e.target.value))}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs text-zinc-200"
                      >
                        <option value={128}>128 samples (Fastest)</option>
                        <option value={256}>256 samples (Balanced 5.3ms)</option>
                        <option value={512}>512 samples (High Stability)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-[#0d0f14] rounded border border-[#202534] flex items-center justify-between text-[11px] font-mono">
                    <span>
                      Estimated Latency:{' '}
                      <strong className="text-emerald-400">{estimatedLatency} ms</strong>
                    </span>
                    <span>DSP Load: <strong className="text-emerald-400">1.8%</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* MIDI & MPE (Section 65) */}
            {activeTab === 'midi' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    MIDI Controllers & MPE Microtonal Configuration
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Controls polyphonic pitch expression for external microtonal synthesizers.
                  </p>
                </div>

                <div className="bg-[#12141a] p-4 rounded-lg border border-[#242936] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">
                      Enable MIDI Polyphonic Expression (MPE):
                    </span>
                    <input
                      type="checkbox"
                      checked={mpeEnabled}
                      onChange={(e) => setMpeEnabled(e.target.checked)}
                      className="rounded bg-[#191d27] border-[#2b3346] text-cyan-500 focus:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1f2432]">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">MPE Channel Range:</label>
                      <input
                        type="text"
                        value={mpeChannels}
                        onChange={(e) => setMpeChannels(e.target.value)}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs font-mono text-zinc-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Pitch Bend Range (Semitones):
                      </label>
                      <input
                        type="number"
                        value={pitchBendRange}
                        onChange={(e) => setPitchBendRange(parseInt(e.target.value) || 48)}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AUTOSAVE (Section 68) */}
            {activeTab === 'autosave' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Autosave, Backups & Crash Recovery
                  </h3>
                  <p className="text-zinc-400 text-xs">
                    Ensures your music production work is never lost during power outages or plugin issues.
                  </p>
                </div>

                <div className="bg-[#12141a] p-4 rounded-lg border border-[#242936] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">Enable Automatic Project Backup:</span>
                    <input
                      type="checkbox"
                      checked={autosaveEnabled}
                      onChange={(e) => setAutosaveEnabled(e.target.checked)}
                      className="rounded bg-[#191d27] border-[#2b3346] text-emerald-500 focus:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1f2432]">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Autosave Interval:</label>
                      <select
                        value={autosaveInterval}
                        onChange={(e) => setAutosaveInterval(e.target.value)}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs text-zinc-200"
                      >
                        <option value="1 min">Every 1 minute</option>
                        <option value="5 min">Every 5 minutes</option>
                        <option value="10 min">Every 10 minutes</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Maximum Backups:</label>
                      <input
                        type="number"
                        value={backupCount}
                        onChange={(e) => setBackupCount(parseInt(e.target.value) || 10)}
                        className="w-full bg-[#191d27] border border-[#2b3346] rounded p-2 text-xs font-mono text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#12141a] border-t border-[#232734] px-4 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
