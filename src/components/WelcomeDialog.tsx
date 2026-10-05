import React, { useState } from 'react';
import {
  X,
  FilePlus,
  Radio,
  Music,
  Mic,
  Disc3,
  Layers,
  Sparkles,
} from 'lucide-react';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onNewEmpty: () => void;
  onRecordAudio: () => void;
}

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  isOpen,
  onClose,
  onNewEmpty,
  onRecordAudio,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('aether_daw_hide_welcome', 'true');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#141822] border border-[#2b3346] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs text-zinc-300">
        {/* Title Bar */}
        <div className="h-10 bg-[#1b212f] border-b border-[#283246] px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            <span>Welcome to AetherDAW</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-[#283246] text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content columns */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Start a New Project */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Start a new project
            </span>

            <button
              onClick={() => {
                onNewEmpty();
                handleDismiss();
              }}
              className="w-full p-3 rounded-lg bg-[#191f2c] hover:bg-[#222a3c] border border-[#273248] hover:border-cyan-500/60 text-left transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <FilePlus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white group-hover:text-cyan-300">Default (Empty)</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  An empty clean template to start your music from scratch...
                </div>
              </div>
            </button>

            <button
              onClick={() => {
                onRecordAudio();
                handleDismiss();
              }}
              className="w-full p-3 rounded-lg bg-[#191f2c] hover:bg-[#222a3c] border border-[#273248] hover:border-emerald-500/60 text-left transition-all flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-white group-hover:text-emerald-300">Record Audio</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Set audio inputs and start recording live in the Playlist.
                </div>
              </div>
            </button>
          </div>

          {/* Right: Architecture & Quick Info */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Production Ergonomics
            </span>

            <div className="bg-[#12151e] p-3 rounded-lg border border-[#242c3e] space-y-2 text-zinc-400 leading-relaxed text-[11px]">
              <div className="flex items-center gap-1.5 text-white font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>FL Studio Inspired Workflow</span>
              </div>
              <p>
                Press <code className="text-cyan-300 font-mono">F5</code> for Playlist, <code className="text-emerald-300 font-mono">F7</code> for Piano Roll, <code className="text-amber-300 font-mono">F6</code> for Channel Rack, and <code className="text-indigo-300 font-mono">F9</code> for Mixer.
              </p>
              <p>
                Click any channel button in the Channel Rack to open its interactive sound engine & plugin UI window.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 bg-[#12151e] border-t border-[#232b3c] px-4 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] text-zinc-400 hover:text-zinc-200">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-[#1a1f2c] border-[#293246] text-cyan-500 focus:ring-0"
            />
            <span>Do not show this in the future</span>
          </label>

          <button
            onClick={handleDismiss}
            className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
          >
            Start Producing
          </button>
        </div>
      </div>
    </div>
  );
};
