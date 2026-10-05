import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Cpu,
  RefreshCw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FolderSearch,
  Music,
  Disc3,
  Layers,
  Radio,
} from 'lucide-react';
import { PluginRecord, TuningSystem } from '../types/daw';
import { midiEngine } from '../audio/midi';

export interface BuiltInInstrument {
  id: string;
  name: string;
  type: 'synth' | 'drum' | 'sampler' | 'audio';
  category: string;
  description: string;
  color: string;
  isNative: true;
}

export const BUILT_IN_INSTRUMENTS: BuiltInInstrument[] = [
  {
    id: 'aether-polyfm',
    name: 'Aether PolyFM (Microtonal)',
    type: 'synth',
    category: 'Synthesizer',
    description: 'Native 2-operator FM synth with dynamic microtonal carrier/modulator ratios and feedback.',
    color: '#10b981', // emerald
    isNative: true,
  },
  {
    id: 'aether-subtractive',
    name: 'Subtractive Pro (N-TET)',
    type: 'synth',
    category: 'Synthesizer',
    description: 'Dual-oscillator detuned analog emulation with resonant low-pass filter and ADSR envelopes.',
    color: '#3b82f6', // blue
    isNative: true,
  },
  {
    id: 'aether-micro-organ',
    name: 'Micro-Additive Harmonic Organ',
    type: 'synth',
    category: 'Additive / Organ',
    description: 'Additive drawbar synthesizer generating partials based on exact microtonal frequency ratios.',
    color: '#f59e0b', // amber
    isNative: true,
  },
  {
    id: 'aether-drum-synth',
    name: 'Aether Micro-Drum Machine',
    type: 'drum',
    category: 'Drums & Percussion',
    description: 'Procedural 808/909 sub kicks, snappy snares, metallic micro-percussions, and glitch toms.',
    color: '#ef4444', // red
    isNative: true,
  },
  {
    id: 'audio-clip-player',
    name: 'Audio Stem / Sample Track',
    type: 'audio',
    category: 'Audio Player',
    description: 'High-fidelity audio playback track for recorded vocals, live stems, and imported WAV samples.',
    color: '#ec4899', // pink
    isNative: true,
  },
];

interface AddTrackModalProps {
  isOpen: boolean;
  tuning: TuningSystem;
  onClose: () => void;
  onSelectInstrument: (item: {
    name: string;
    type: 'synth' | 'drum' | 'sampler' | 'audio' | 'vst-bridge';
    instrumentId: string;
    color: string;
    format: 'Native' | 'VST3' | 'VST2';
    vendor?: string;
  }) => void;
}

export const AddTrackModal: React.FC<AddTrackModalProps> = ({
  isOpen,
  tuning,
  onClose,
  onSelectInstrument,
}) => {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'native' | 'vst' | 'synths' | 'drums'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Load scanned plugins from native backend
  const loadPlugins = async () => {
    try {
      const res = await fetch('/api/plugins/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanPC = async () => {
    setIsScanning(true);
    setScanMessage('Scanning computer VST3 & VST2 directories (C:\\Program Files\\Common Files\\VST3)...');
    try {
      const res = await fetch('/api/plugins/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
        setScanMessage(`Scan complete! Found ${data.totalScanned || data.plugins?.length} plugins on this machine.`);
        setTimeout(() => setScanMessage(null), 4000);
      }
    } catch (err) {
      setScanMessage('Error scanning local plugins.');
    } finally {
      setIsScanning(false);
    }
  };

  // Filter native instruments
  const filteredNative = BUILT_IN_INSTRUMENTS.filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      activeTab === 'native' ||
      (activeTab === 'synths' && inst.type === 'synth') ||
      (activeTab === 'drums' && inst.type === 'drum');
    return matchesSearch && matchesTab;
  });

  // Filter scanned computer VSTs (excluding built-in native placeholders from scanned list to avoid duplication)
  const scannedVsts = plugins.filter((p) => p.format !== 'Native');
  const filteredVsts = scannedVsts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      activeTab === 'vst' ||
      (activeTab === 'synths' && (p.category.toLowerCase().includes('synth') || p.type === 'instrument')) ||
      (activeTab === 'drums' && p.category.toLowerCase().includes('drum'));
    return matchesSearch && matchesTab;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#14161e] border border-[#2b3040] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-14 bg-[#191c26] border-b border-[#292e3c] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Add Track - Select Instrument or Plugin
              </h2>
              <div className="text-[11px] text-zinc-400">
                Choose from built-in microtonal engines or scanned computer VST3/VST2 plugins.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleScanPC}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222736] hover:bg-[#2c3244] border border-[#333b50] text-xs font-medium text-cyan-300 transition-colors"
              title="Rescan computer for newly installed VSTs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning PC...' : 'Scan PC for VSTs'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#282d3b] text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Navigation */}
        <div className="p-3 bg-[#111319] border-b border-[#222634] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Search Box */}
          <div className="flex items-center gap-2 bg-[#191c26] border border-[#2c3242] rounded-lg px-3 py-1.5 w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              placeholder="Search instruments or VSTs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-[#181b24] p-1 rounded-lg border border-[#262b38] w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({filteredNative.length + filteredVsts.length})
            </button>
            <button
              onClick={() => setActiveTab('native')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'native'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Built-in App VSTs ({filteredNative.length})
            </button>
            <button
              onClick={() => setActiveTab('vst')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'vst'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Scanned PC VSTs ({filteredVsts.length})
            </button>
            <button
              onClick={() => setActiveTab('synths')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'synths'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Synths
            </button>
            <button
              onClick={() => setActiveTab('drums')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'drums'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Drums
            </button>
          </div>
        </div>

        {/* Scan Status Banner */}
        {scanMessage && (
          <div className="px-4 py-2 bg-cyan-950/40 border-b border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}

        {/* Instrument Lists Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* SECTION 1: Built-in Instruments (Próprios do App) */}
          {(activeTab === 'all' || activeTab === 'native' || activeTab === 'synths' || activeTab === 'drums') &&
            filteredNative.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Instrumentos Próprios do App (Built-in Native)
                    </h3>
                  </div>
                  <span className="text-[11px] text-emerald-400/90 font-mono">
                    100% Microtonal {tuning.divisionsPerOctave}-TET Native
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredNative.map((inst) => (
                    <div
                      key={inst.id}
                      onClick={() => {
                        onSelectInstrument({
                          name: inst.name,
                          type: inst.type,
                          instrumentId: inst.id,
                          color: inst.color,
                          format: 'Native',
                          vendor: 'Aether Audio',
                        });
                        onClose();
                      }}
                      className="group bg-[#181b24] hover:bg-[#202533] border border-[#292e3d] hover:border-emerald-500/70 rounded-lg p-3 cursor-pointer transition-all flex items-start justify-between shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm"
                          style={{ backgroundColor: inst.color }}
                        >
                          {inst.type === 'drum' ? (
                            <Disc3 className="w-5 h-5" />
                          ) : inst.type === 'audio' ? (
                            <Music className="w-5 h-5" />
                          ) : (
                            <Radio className="w-5 h-5" />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                            <span>{inst.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono text-[9px] border border-emerald-500/40">
                              NATIVE
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {inst.description}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1.5 font-medium">
                            Category: <span className="text-zinc-300">{inst.category}</span>
                          </div>
                        </div>
                      </div>

                      <button className="px-2.5 py-1 rounded bg-[#252b3a] group-hover:bg-emerald-600 text-zinc-300 group-hover:text-white text-xs font-semibold shrink-0 transition-colors">
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* SECTION 2: Scanned Computer VST Plugins (Escaneados no PC) */}
          {(activeTab === 'all' || activeTab === 'vst' || activeTab === 'synths' || activeTab === 'drums') && (
            <div>
              <div className="flex items-center justify-between mb-2.5 pt-2 border-t border-[#222634]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Plugins VST3 / VST2 Escaneados no PC
                  </h3>
                </div>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {filteredVsts.length} plugin(s) found
                </span>
              </div>

              {filteredVsts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredVsts.map((vst) => {
                    const compatibility = midiEngine.inspectPluginCompatibility(vst, tuning);
                    const isError = vst.status === 'error';

                    return (
                      <div
                        key={vst.id}
                        onClick={() => {
                          if (isError) return;
                          onSelectInstrument({
                            name: vst.name,
                            type: vst.type === 'instrument' ? 'synth' : 'audio',
                            instrumentId: vst.id,
                            color: vst.format === 'VST3' ? '#06b6d4' : '#8b5cf6',
                            format: vst.format,
                            vendor: vst.vendor,
                          });
                          onClose();
                        }}
                        className={`group bg-[#181b24] border rounded-lg p-3 transition-all flex items-start justify-between shadow-xs ${
                          isError
                            ? 'border-rose-900/50 opacity-60 cursor-not-allowed bg-rose-950/10'
                            : 'hover:bg-[#202533] border-[#292e3d] hover:border-cyan-500/70 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-md bg-[#252b3a] border border-[#333b4e] flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                            <Cpu className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5 flex-wrap">
                              <span>{vst.name}</span>
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono text-[9px] border border-cyan-500/40">
                                {vst.format}
                              </span>
                              {vst.mpeSupported && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono text-[9px] border border-indigo-500/40">
                                  MPE
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-zinc-400 mt-1">
                              Vendor: <span className="text-zinc-200">{vst.vendor}</span> •{' '}
                              Category: <span className="text-zinc-300">{vst.category}</span>
                            </div>

                            {/* Microtonal Bridge Compatibility Tag */}
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {compatibility.canReproduceTuning ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{compatibility.recommendedMode === 'mpe' ? 'MPE Microtonal' : 'Poly Ch-Bend'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>12-TET Compatibility Mode</span>
                                </span>
                              )}
                              <span className="text-zinc-600 text-[10px]">•</span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Latency: {vst.latencySamples} smp
                              </span>
                            </div>

                            {vst.errorMessage && (
                              <div className="text-[10px] text-rose-400 mt-1">
                                {vst.errorMessage}
                              </div>
                            )}
                          </div>
                        </div>

                        {!isError && (
                          <button className="px-2.5 py-1 rounded bg-[#252b3a] group-hover:bg-cyan-600 text-zinc-300 group-hover:text-white text-xs font-semibold shrink-0 transition-colors">
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#121419] p-6 rounded-lg border border-[#232734] text-center space-y-2">
                  <FolderSearch className="w-7 h-7 text-zinc-500 mx-auto" />
                  <div className="text-xs text-zinc-300 font-semibold">
                    No external VST plugins found matching your filter.
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Click "Scan PC for VSTs" to scan <code className="text-zinc-400 font-mono">C:\Program Files\Common Files\VST3</code> or configure custom plugin paths in the Plugin Browser.
                  </div>
                  <button
                    onClick={handleScanPC}
                    className="px-3 py-1.5 rounded bg-[#222736] hover:bg-[#2c3244] border border-[#333b50] text-cyan-300 text-xs font-medium inline-flex items-center gap-1.5 mt-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Plugin Scanner Now</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#12141a] border-t border-[#232734] px-4 flex items-center justify-between shrink-0 text-xs text-zinc-400">
          <div>
            Active Project Tuning:{' '}
            <strong className="text-white font-mono">{tuning.divisionsPerOctave}-TET</strong> (A4 = {tuning.referencePitchHz} Hz)
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#222632] hover:bg-[#2d3244] text-zinc-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
