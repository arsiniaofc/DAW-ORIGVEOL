import React, { useState, useEffect } from 'react';
import { Search, Play, Pause, Volume2, Music, Upload, Plus } from 'lucide-react';
import { Track } from '../types/daw';
import { audioEngine } from '../audio/engine';

interface SampleItem {
  id: string;
  name: string;
  duration: string;
  bpm: number | null;
  type: string;
  format: string;
}

interface SampleCategory {
  id: string;
  name: string;
  samples: SampleItem[];
}

interface SampleBrowserProps {
  tracks: Track[];
  onLoadSampleToTrack: (sampleId: string, sampleName: string, trackId: string) => void;
}

export const SampleBrowser: React.FC<SampleBrowserProps> = ({
  tracks,
  onLoadSampleToTrack,
}) => {
  const [categories, setCategories] = useState<SampleCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('drums-kicks');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || '');

  // Load sample bank list from backend
  useEffect(() => {
    fetch('/api/samples/list')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {
        // Fallback default sample list
      });
  }, []);

  const handlePlaySample = async (sample: SampleItem) => {
    setPlayingSampleId(sample.id);
    const ctx = await audioEngine.initAudio();
    const buffer = await audioEngine.getSampleBuffer(sample.id);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();

    source.onended = () => {
      setPlayingSampleId(null);
    };
  };

  const activeCategory = categories.find((c) => c.id === selectedCategory) || categories[0];

  const filteredSamples = (activeCategory?.samples || []).filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex bg-[#101217] select-none overflow-hidden text-xs">
      {/* Category Sidebar */}
      <div className="w-56 bg-[#14161d] border-r border-[#242833] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#242833] font-bold text-zinc-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Music className="w-4 h-4 text-emerald-400" />
            <span>Sample Library</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                selectedCategory === cat.id
                  ? 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-zinc-400 hover:bg-[#1b1f28] hover:text-zinc-200'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {cat.samples.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Samples List */}
      <div className="flex-1 flex flex-col bg-[#121419] overflow-hidden">
        {/* Search & Actions Bar */}
        <div className="h-12 bg-[#16181f] border-b border-[#242833] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 bg-[#1b1f28] border border-[#2b3040] rounded px-2.5 py-1.5 w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search samples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-xs">Load into:</span>
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className="bg-[#1b1f28] border border-[#303646] rounded px-2 py-1 text-xs text-zinc-200"
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Samples Table */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e222d]">
          {filteredSamples.map((sample) => {
            const isPlaying = playingSampleId === sample.id;

            return (
              <div
                key={sample.id}
                className="p-3 flex items-center justify-between hover:bg-[#181b24] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlaySample(sample)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isPlaying
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#202532] text-zinc-300 hover:bg-[#2b3244]'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>

                  <div>
                    <div className="font-semibold text-zinc-200">{sample.name}</div>
                    <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                      <span>{sample.format}</span>
                      <span>•</span>
                      <span>{sample.duration}</span>
                      {sample.bpm && <span>• {sample.bpm} BPM</span>}
                    </div>
                  </div>
                </div>

                {/* Simulated Waveform Preview Bar */}
                <div className="hidden sm:flex items-center gap-0.5 w-32 h-6 px-1 bg-[#0f1116] rounded border border-[#202430]">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = Math.sin(i * 0.4) * 50 + 40;
                    return (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`w-1 rounded-xs ${isPlaying ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                      />
                    );
                  })}
                </div>

                {/* Assign Button */}
                <button
                  onClick={() => onLoadSampleToTrack(sample.id, sample.name, selectedTrackId)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#202532] hover:bg-emerald-600 hover:text-white border border-[#2c3344] text-zinc-300 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Send to Track</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
