import React, { useState, useEffect } from 'react';
import {
  Search,
  FolderPlus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Sliders,
  Plus,
  Zap,
} from 'lucide-react';
import { PluginRecord, TuningSystem, Track } from '../types/daw';
import { midiEngine, PluginCompatibilityReport } from '../audio/midi';

interface PluginBrowserProps {
  tuning: TuningSystem;
  tracks: Track[];
  onAssignPluginToTrack: (plugin: PluginRecord, trackId: string) => void;
}

export const PluginBrowser: React.FC<PluginBrowserProps> = ({
  tuning,
  tracks,
  onAssignPluginToTrack,
}) => {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [pluginPaths, setPluginPaths] = useState<string[]>([]);
  const [newPathInput, setNewPathInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRecord | null>(null);
  const [compatibilityReport, setCompatibilityReport] = useState<PluginCompatibilityReport | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || '');

  // Load plugins from backend or fallback list
  const fetchPlugins = async () => {
    try {
      const res = await fetch('/api/plugins/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
        if (data.plugins?.length > 0 && !selectedPlugin) {
          setSelectedPlugin(data.plugins[0]);
        }
      }
    } catch {
      // offline / mock fallback
    }
  };

  const fetchPaths = async () => {
    try {
      const res = await fetch('/api/plugins/paths');
      if (res.ok) {
        const data = await res.json();
        setPluginPaths(data.paths || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPlugins();
    fetchPaths();
  }, []);

  // Update compatibility inspection when selected plugin or tuning changes
  useEffect(() => {
    if (selectedPlugin) {
      const report = midiEngine.inspectPluginCompatibility(selectedPlugin, tuning);
      setCompatibilityReport(report);
    } else {
      setCompatibilityReport(null);
    }
  }, [selectedPlugin, tuning]);

  const handleScanNow = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/plugins/scan', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch (err) {
      console.warn('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddPath = async () => {
    if (!newPathInput.trim()) return;
    try {
      const res = await fetch('/api/plugins/paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPathInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setPluginPaths(data.paths || []);
        setNewPathInput('');
      }
    } catch {}
  };

  const filteredPlugins = plugins.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 flex bg-[#101217] select-none overflow-hidden text-xs">
      {/* Left: Plugin Scanner & List */}
      <div className="w-80 bg-[#14161d] border-r border-[#242833] flex flex-col shrink-0">
        {/* Search & Scan Action Bar */}
        <div className="p-3 border-b border-[#242833] space-y-2">
          <div className="flex items-center gap-1.5 bg-[#1b1f28] border border-[#2b3040] rounded px-2.5 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search VST3/VST2 plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  categoryFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCategoryFilter('synthesizer')}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  categoryFilter === 'synthesizer' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Synths
              </button>
              <button
                onClick={() => setCategoryFilter('equalizer')}
                className={`px-2 py-0.5 rounded text-[10px] ${
                  categoryFilter === 'equalizer' ? 'bg-cyan-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Effects
              </button>
            </div>

            <button
              onClick={handleScanNow}
              disabled={isScanning}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202532] hover:bg-[#2a3040] border border-[#303648] text-cyan-300 text-[11px]"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning...' : 'Scan Plugins'}</span>
            </button>
          </div>
        </div>

        {/* Scanned Plugins List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e212b]">
          {filteredPlugins.map((plugin) => {
            const isSelected = selectedPlugin?.id === plugin.id;

            return (
              <div
                key={plugin.id}
                onClick={() => setSelectedPlugin(plugin)}
                className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                  isSelected ? 'bg-[#1e2330] border-l-2 border-l-cyan-400' : 'hover:bg-[#181b24]'
                }`}
              >
                <div className="truncate">
                  <div className="font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                    {plugin.status === 'valid' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    {plugin.status === 'warning' && (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {plugin.status === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <span className="truncate">{plugin.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span>{plugin.vendor}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-400">{plugin.format}</span>
                  </div>
                </div>

                <div className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101217] text-zinc-400 shrink-0">
                  {plugin.mpeSupported ? 'MPE' : 'Ch-Bend'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Microtonal Plugin Bridge & Details Inspector (Section 15) */}
      <div className="flex-1 bg-[#121419] p-5 overflow-y-auto space-y-5">
        {selectedPlugin ? (
          <>
            {/* Plugin Header Info */}
            <div className="flex items-start justify-between pb-4 border-b border-[#242936]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedPlugin.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/60 text-cyan-300 font-mono text-[10px]">
                    {selectedPlugin.format}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#1f2432] text-zinc-400 text-[10px]">
                    v{selectedPlugin.version}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Vendor: <span className="text-zinc-200 font-semibold">{selectedPlugin.vendor}</span> •{' '}
                  Category: <span className="text-zinc-200">{selectedPlugin.category}</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                  File: {selectedPlugin.path}
                </div>
              </div>

              {/* Assign to Track Action */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="bg-[#1b1f28] border border-[#303646] rounded px-2.5 py-1.5 text-xs text-zinc-200"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      Track: {t.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onAssignPluginToTrack(selectedPlugin, selectedTrackId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign to Track</span>
                </button>
              </div>
            </div>

            {/* Microtonal Plugin Bridge Card (Section 15) */}
            <div className="bg-[#161922] p-4 rounded-lg border border-[#2b3142] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-300">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Microtonal Plugin Bridge ({tuning.divisionsPerOctave}-TET Context)</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    compatibilityReport?.canReproduceTuning
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {compatibilityReport?.recommendedMode.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-[#111319] p-2.5 rounded border border-[#222736]">
                  <span className="text-[10px] text-zinc-500 block">MPE Support</span>
                  <span className="font-semibold text-xs text-zinc-200">
                    {selectedPlugin.mpeSupported ? '✓ Enabled' : '✕ Unsupported'}
                  </span>
                </div>
                <div className="bg-[#111319] p-2.5 rounded border border-[#222736]">
                  <span className="text-[10px] text-zinc-500 block">Poly Pitch Bend</span>
                  <span className="font-semibold text-xs text-zinc-200">
                    {selectedPlugin.polyPitchSupported ? '✓ Available' : '✕ Fixed 12-TET'}
                  </span>
                </div>
                <div className="bg-[#111319] p-2.5 rounded border border-[#222736]">
                  <span className="text-[10px] text-zinc-500 block">Bridge Strategy</span>
                  <span className="font-semibold text-xs text-cyan-300 capitalize">
                    {selectedPlugin.microtonalTuning}
                  </span>
                </div>
                <div className="bg-[#111319] p-2.5 rounded border border-[#222736]">
                  <span className="text-[10px] text-zinc-500 block">Sandbox Latency</span>
                  <span className="font-semibold text-xs text-zinc-200">
                    {selectedPlugin.latencySamples} samples
                  </span>
                </div>
              </div>

              {/* Status banner with warning or compatibility advice */}
              <div
                className={`p-3 rounded border text-xs leading-relaxed ${
                  compatibilityReport?.canReproduceTuning
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                }`}
              >
                {compatibilityReport?.statusText}
              </div>
            </div>

            {/* Configured VST Folders */}
            <div className="bg-[#14161d] p-3.5 rounded border border-[#222632] space-y-2">
              <label className="font-semibold text-xs text-zinc-300 block">
                Configured Plugin Directories:
              </label>
              <div className="space-y-1 font-mono text-[11px] text-zinc-400">
                {pluginPaths.map((p, idx) => (
                  <div key={idx} className="bg-[#1b1f28] p-1.5 rounded flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span className="truncate">{p}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add custom plugin folder path..."
                  value={newPathInput}
                  onChange={(e) => setNewPathInput(e.target.value)}
                  className="flex-1 bg-[#1b1f28] border border-[#303646] rounded px-2.5 py-1 text-xs text-zinc-200"
                />
                <button
                  onClick={handleAddPath}
                  className="px-3 py-1 rounded bg-[#202532] hover:bg-[#282d3c] border border-[#303648] text-xs text-zinc-200"
                >
                  + Add Folder
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Select a plugin from the list to inspect its microtonal bridge capabilities.
          </div>
        )}
      </div>
    </div>
  );
};
