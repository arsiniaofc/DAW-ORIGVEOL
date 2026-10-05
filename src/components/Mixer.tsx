import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sliders, Plus, Trash2, Power, Eye, Activity } from 'lucide-react';
import { MixerChannel, AudioEffect } from '../types/daw';
import { audioEngine } from '../audio/engine';

interface MixerProps {
  mixerChannels: MixerChannel[];
  activeChannelId: number;
  onSelectChannel: (channelId: number) => void;
  onUpdateChannel: (channel: MixerChannel) => void;
}

export const Mixer: React.FC<MixerProps> = ({
  mixerChannels,
  activeChannelId,
  onSelectChannel,
  onUpdateChannel,
}) => {
  const [levels, setLevels] = useState<Record<number, number>>({});
  const selectedChannel = mixerChannels.find((c) => c.id === activeChannelId) || mixerChannels[0];

  // EQ sliders state for selected channel
  const [eqLow, setEqLow] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqHigh, setEqHigh] = useState(0);

  // Poll peak meters
  useEffect(() => {
    let animId: number;
    const pollMeters = () => {
      const updated: Record<number, number> = {};
      mixerChannels.forEach((ch) => {
        if (ch.id === 0) {
          const m = audioEngine.getMasterPeakLevels();
          updated[0] = Math.max(m.left, m.right);
        } else {
          updated[ch.id] = audioEngine.getChannelPeakLevel(ch.id);
        }
      });
      setLevels(updated);
      animId = requestAnimationFrame(pollMeters);
    };
    animId = requestAnimationFrame(pollMeters);
    return () => cancelAnimationFrame(animId);
  }, [mixerChannels]);

  const handleFaderChange = (channel: MixerChannel, val: number) => {
    const updated = { ...channel, volume: val };
    onUpdateChannel(updated);
    audioEngine.updateMixerChannel(updated);
  };

  const handlePanChange = (channel: MixerChannel, val: number) => {
    const updated = { ...channel, pan: val };
    onUpdateChannel(updated);
    audioEngine.updateMixerChannel(updated);
  };

  const handleToggleMute = (channel: MixerChannel) => {
    const updated = { ...channel, muted: !channel.muted };
    onUpdateChannel(updated);
    audioEngine.updateMixerChannel(updated);
  };

  const handleToggleSolo = (channel: MixerChannel) => {
    const updated = { ...channel, solo: !channel.solo };
    onUpdateChannel(updated);
    audioEngine.updateMixerChannel(updated);
  };

  const handleAddEffectToSlot = (slotIdx: number, type: AudioEffect['type']) => {
    const newEffect: AudioEffect = {
      id: `fx-${slotIdx}-${Date.now().toString(36)}`,
      type,
      enabled: true,
      params: type === 'delay' ? { time: 0.3, feedback: 0.4 } : type === 'reverb' ? { decay: 2.0 } : {},
    };
    const updatedEffects = [...selectedChannel.effects];
    updatedEffects[slotIdx] = newEffect;

    const updated = {
      ...selectedChannel,
      effects: updatedEffects.filter(Boolean),
    };
    onUpdateChannel(updated);
  };

  const handleToggleEffect = (fxId: string) => {
    const updated = {
      ...selectedChannel,
      effects: selectedChannel.effects.map((fx) =>
        fx.id === fxId ? { ...fx, enabled: !fx.enabled } : fx
      ),
    };
    onUpdateChannel(updated);
  };

  const handleRemoveEffect = (fxId: string) => {
    const updated = {
      ...selectedChannel,
      effects: selectedChannel.effects.filter((fx) => fx.id !== fxId),
    };
    onUpdateChannel(updated);
  };

  return (
    <div className="flex-1 flex bg-[#0c0e14] select-none overflow-hidden text-xs font-sans text-zinc-300">
      {/* Mixer Channels Strips (Screenshot 5: C, Master, Insert 1..16) */}
      <div className="flex-1 flex overflow-x-auto p-2 gap-1 border-r border-[#202534] bg-[#0c0e14]">
        {mixerChannels.map((channel) => {
          const isSelected = channel.id === activeChannelId;
          const peak = levels[channel.id] || 0;
          const isMaster = channel.id === 0;

          return (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel.id)}
              className={`w-14 shrink-0 flex flex-col items-center bg-[#13161f] border rounded-sm p-1 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-cyan-400 bg-[#191f2c] shadow-xs'
                  : isMaster
                  ? 'border-[#2d364c] bg-[#161a25]'
                  : 'border-[#1f2534] hover:bg-[#161a24]'
              }`}
            >
              {/* Channel Label */}
              <div className="w-full text-center font-bold text-[10px] truncate text-zinc-200 mb-0.5">
                {isMaster ? 'Master' : channel.name}
              </div>
              <div className="text-[9px] font-mono text-zinc-500 mb-1">
                {isMaster ? 'M' : channel.id}
              </div>

              {/* Pan Knob Slider */}
              <div className="w-full px-0.5 mb-1.5">
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={channel.pan}
                  onChange={(e) => handlePanChange(channel, parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#262d3e] rounded accent-cyan-400 cursor-pointer"
                  title={`Pan: ${Math.round(channel.pan * 100)}%`}
                />
              </div>

              {/* Fader & LED Meter Column (FL Studio Style) */}
              <div className="flex-1 w-full flex justify-center gap-1 py-1">
                {/* Vertical Fader Slider */}
                <div className="h-full flex items-center">
                  <input
                    type="range"
                    min={0}
                    max={1.25}
                    step={0.01}
                    value={channel.volume}
                    onChange={(e) => handleFaderChange(channel, parseFloat(e.target.value))}
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    className="h-32 w-2.5 accent-cyan-400 cursor-pointer bg-transparent"
                  />
                </div>

                {/* Real-time LED Peak Meter */}
                <div className="w-2 h-32 bg-[#090b10] border border-[#1c2230] rounded-xs overflow-hidden flex flex-col justify-end p-0.5">
                  <div
                    className={`w-full transition-all duration-75 rounded-xs ${
                      peak > 0.85 ? 'bg-rose-500' : peak > 0.6 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ height: `${Math.min(100, peak * 100)}%` }}
                  />
                </div>
              </div>

              {/* Volume dB Indicator */}
              <span className="text-[9px] font-mono text-zinc-400 my-0.5">
                {Math.round(channel.volume * 100)}%
              </span>

              {/* Mute & Solo Buttons */}
              <div className="flex items-center gap-0.5 w-full pt-1 border-t border-[#1e2330]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMute(channel);
                  }}
                  className={`flex-1 py-0.5 rounded text-[9px] font-bold ${
                    channel.muted ? 'bg-rose-900 text-rose-300' : 'bg-[#1e2432] text-zinc-400 hover:text-white'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSolo(channel);
                  }}
                  className={`flex-1 py-0.5 rounded text-[9px] font-bold ${
                    channel.solo ? 'bg-amber-600 text-white' : 'bg-[#1e2432] text-zinc-400 hover:text-white'
                  }`}
                >
                  S
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Channel Inspector / Insert FX Slots (Screenshot 5 exact replica) */}
      <div className="w-72 bg-[#10131c] p-2.5 flex flex-col shrink-0 overflow-y-auto border-l border-[#1f2536]">
        {/* Channel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#222838] mb-2">
          <div>
            <span className="text-[10px] text-zinc-500 font-mono">Mixer Inspector</span>
            <div className="font-bold text-xs text-cyan-300">
              {selectedChannel.name} (Ch {selectedChannel.id})
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 bg-[#161a25] px-1.5 py-0.5 rounded border border-[#273044]">
            Out 1 - Out 2
          </div>
        </div>

        {/* 10 Insert Effect Slots (Slot 1 .. Slot 10 as in Screenshot 5) */}
        <div className="flex-1 space-y-1">
          {Array.from({ length: 10 }).map((_, slotIdx) => {
            const slotNum = slotIdx + 1;
            const fx = selectedChannel.effects[slotIdx];

            return (
              <div
                key={slotNum}
                className="h-6 bg-[#161924] border border-[#222736] rounded px-2 flex items-center justify-between text-[11px] group hover:border-cyan-500/50"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-zinc-500 text-[10px] font-mono">▸ Slot {slotNum}</span>
                  {fx && (
                    <span className="font-semibold text-white truncate capitalize">
                      {fx.type.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {fx ? (
                    <>
                      <button
                        onClick={() => handleToggleEffect(fx.id)}
                        className={`p-0.5 ${fx.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}
                        title="Bypass effect"
                      >
                        <Power className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveEffect(fx.id)}
                        className="text-zinc-500 hover:text-rose-400 p-0.5"
                        title="Remove effect"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </>
                  ) : (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddEffectToSlot(slotIdx, e.target.value as any);
                          e.target.value = '';
                        }
                      }}
                      className="bg-transparent text-[10px] text-zinc-500 hover:text-cyan-300 focus:outline-none cursor-pointer"
                    >
                      <option value="">(none)</option>
                      <option value="eq">Parametric EQ</option>
                      <option value="delay">Stereo Delay</option>
                      <option value="reverb">Reverb</option>
                      <option value="compressor">Compressor</option>
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3-Band Parametric Equalizer Visualizer (as shown in Screenshot 5 bottom right) */}
        <div className="mt-2 pt-2 border-t border-[#222838] bg-[#0c0e14] p-2 rounded border border-[#1f2536]">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 mb-1">
            <span>Equalizer Curve</span>
            <span className="font-mono text-cyan-400">3-Band EQ</span>
          </div>

          {/* Graphical EQ Curve Preview */}
          <div className="h-14 bg-[#12151e] rounded border border-[#202738] relative flex items-center justify-center overflow-hidden">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 40">
              <path
                d={`M 0 20 Q 25 ${20 - eqLow * 2}, 50 ${20 - eqMid * 2} T 100 ${20 - eqHigh * 2}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* 3 EQ Sliders */}
          <div className="flex justify-between gap-2 mt-2">
            <div className="flex flex-col items-center flex-1">
              <span className="text-[9px] text-zinc-500">LOW</span>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={eqLow}
                onChange={(e) => setEqLow(parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400"
              />
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[9px] text-zinc-500">MID</span>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={eqMid}
                onChange={(e) => setEqMid(parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400"
              />
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="text-[9px] text-zinc-500">HIGH</span>
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={eqHigh}
                onChange={(e) => setEqHigh(parseFloat(e.target.value))}
                className="w-full h-1 accent-cyan-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
