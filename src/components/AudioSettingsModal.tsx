import React, { useState, useEffect } from 'react';
import { X, Settings, Cpu, Radio, CheckCircle, Volume2 } from 'lucide-react';
import { midiEngine, MidiDevice } from '../audio/midi';
import { audioEngine } from '../audio/engine';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [bufferSize, setBufferSize] = useState<number>(256);
  const [sampleRate, setSampleRate] = useState<number>(48000);
  const [midiInputs, setMidiInputs] = useState<MidiDevice[]>([]);
  const [midiOutputs, setMidiOutputs] = useState<MidiDevice[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<string>('');
  const [midiStatus, setMidiStatus] = useState<string>('Detecting MIDI devices...');

  useEffect(() => {
    if (isOpen) {
      midiEngine.initialize().then((ok) => {
        if (ok) {
          const inputs = midiEngine.getAvailableInputs();
          const outputs = midiEngine.getAvailableOutputs();
          setMidiInputs(inputs);
          setMidiOutputs(outputs);
          if (inputs.length > 0) setSelectedInputId(inputs[0].id);
          setMidiStatus(inputs.length > 0 ? `${inputs.length} MIDI Device(s) Connected` : 'No hardware MIDI connected (USB keyboards)');
        } else {
          setMidiStatus('Web MIDI not available or permission denied.');
        }
      });

      const ctx = audioEngine.getContext();
      if (ctx) {
        setSampleRate(ctx.sampleRate);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const estimatedLatency = Math.round((bufferSize / sampleRate) * 1000 * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16181e] border border-[#2b303d] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1b1e26] border-b border-[#292e3b] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Audio Engine & Hardware MIDI Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282d3b] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-xs text-zinc-300">
          {/* Audio Engine Hardware Status */}
          <div className="bg-[#121419] p-4 rounded border border-[#242936] space-y-3">
            <div className="font-semibold text-zinc-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Audio Driver & DSP Engine</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Sample Rate:</label>
                <select
                  value={sampleRate}
                  onChange={(e) => setSampleRate(parseInt(e.target.value))}
                  className="w-full bg-[#1b1f28] border border-[#303646] rounded p-1.5 text-xs text-zinc-200"
                >
                  <option value={44100}>44,100 Hz</option>
                  <option value={48000}>48,000 Hz (Standard)</option>
                  <option value={96000}>96,000 Hz (Hi-Res)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Audio Buffer Size:</label>
                <select
                  value={bufferSize}
                  onChange={(e) => setBufferSize(parseInt(e.target.value))}
                  className="w-full bg-[#1b1f28] border border-[#303646] rounded p-1.5 text-xs text-zinc-200"
                >
                  <option value={128}>128 samples (Ultra Low Latency)</option>
                  <option value={256}>256 samples (Balanced)</option>
                  <option value={512}>512 samples (High Stability)</option>
                  <option value={1024}>1024 samples</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-[#1f232e]">
              <span>
                Estimated Buffer Latency:{' '}
                <strong className="text-emerald-400 font-mono">{estimatedLatency} ms</strong>
              </span>
              <span>DSP Load: <strong className="text-emerald-400 font-mono">1.8%</strong></span>
            </div>
          </div>

          {/* Web MIDI Controller Setup */}
          <div className="bg-[#121419] p-4 rounded border border-[#242936] space-y-3">
            <div className="font-semibold text-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                <span>Hardware MIDI Input & MPE</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-normal">{midiStatus}</span>
            </div>

            {midiInputs.length > 0 ? (
              <div className="space-y-1">
                {midiInputs.map((dev) => (
                  <div
                    key={dev.id}
                    className="p-2 rounded bg-[#1b1f28] border border-[#2d3344] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-medium text-zinc-200">{dev.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 uppercase">{dev.state}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded bg-[#171a22] text-zinc-500 text-[11px] italic text-center">
                Plug in any USB MIDI controller or keyboard. It will be mapped with microtonal pitch bends automatically.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 bg-[#14161c] border-t border-[#252934] px-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
