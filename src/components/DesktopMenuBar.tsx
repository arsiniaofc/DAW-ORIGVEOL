import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Share2,
  Trash2,
  Undo,
  Redo,
  Scissors,
  Copy,
  Plus,
  Layers,
  Sliders,
  Settings,
  HelpCircle,
  FolderDown,
  RefreshCw,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { Project } from '../types/daw';

interface DesktopMenuBarProps {
  project: Project;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onCollectFiles: () => void;
  onOpenSettings: (initialTab?: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleView: (view: 'playlist' | 'piano-roll' | 'channel-rack' | 'mixer' | 'browser') => void;
  onOpenTuningModal: () => void;
  onOpenRhythmModal: () => void;
  onOpenScaleModal: () => void;
  onAddTrack: () => void;
  activeViews: {
    playlist: boolean;
    pianoRoll: boolean;
    channelRack: boolean;
    mixer: boolean;
    browser: boolean;
  };
}

export const DesktopMenuBar: React.FC<DesktopMenuBarProps> = ({
  project,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportProject,
  onCollectFiles,
  onOpenSettings,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleView,
  onOpenTuningModal,
  onOpenRhythmModal,
  onOpenScaleModal,
  onAddTrack,
  activeViews,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuHover = (menu: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  return (
    <div
      ref={menuBarRef}
      className="h-6 bg-[#161a23] border-b border-[#242938] px-2 flex items-center justify-between select-none text-[11px] font-sans shrink-0 z-50 text-zinc-300"
    >
      <div className="flex items-center gap-0.5">
        {/* Brand / Logo */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 mr-1 font-bold text-white tracking-wider text-xs">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>AETHER<span className="text-cyan-400">DAW</span></span>
        </div>

        {/* FILE Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('file')}
            onMouseEnter={() => handleMenuHover('file')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'file' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 mt-0.5 w-56 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onNewProject(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] hover:text-white flex items-center justify-between"
              >
                <span>New Project (Clean Empty)</span>
                <span className="text-[10px] text-zinc-500">Ctrl+N</span>
              </button>
              <button
                onClick={() => { onOpenProject(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] hover:text-white flex items-center justify-between"
              >
                <span>Open Project (.experimental)</span>
                <span className="text-[10px] text-zinc-500">Ctrl+O</span>
              </button>
              <div className="border-t border-[#2a3449] my-1"></div>
              <button
                onClick={() => { onSaveProject(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] hover:text-white flex items-center justify-between"
              >
                <span>Save Project</span>
                <span className="text-[10px] text-zinc-500">Ctrl+S</span>
              </button>
              <button
                onClick={() => { onExportProject(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] hover:text-white flex items-center justify-between"
              >
                <span>Export JSON Project</span>
                <span className="text-[10px] text-zinc-500">Ctrl+E</span>
              </button>
              <div className="border-t border-[#2a3449] my-1"></div>
              <button
                onClick={() => { onCollectFiles(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] text-emerald-400 flex items-center gap-2 font-medium"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Collect Project Files...</span>
              </button>
              <button
                onClick={() => { onOpenSettings('files'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] hover:text-white"
              >
                <span>Files & Library Settings...</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'edit' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 mt-0.5 w-52 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onUndo(); setActiveMenu(null); }}
                disabled={!canUndo}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] disabled:opacity-40 flex items-center justify-between"
              >
                <span>Undo</span>
                <span className="text-[10px] text-zinc-500">Ctrl+Z</span>
              </button>
              <button
                onClick={() => { onRedo(); setActiveMenu(null); }}
                disabled={!canRedo}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] disabled:opacity-40 flex items-center justify-between"
              >
                <span>Redo</span>
                <span className="text-[10px] text-zinc-500">Ctrl+Y</span>
              </button>
              <div className="border-t border-[#2a3449] my-1"></div>
              <div className="px-3 py-1 text-[10px] text-zinc-500 font-mono">Piano Roll & Playlist shortcuts active</div>
            </div>
          )}
        </div>

        {/* ADD Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('add')}
            onMouseEnter={() => handleMenuHover('add')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'add' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            Add
          </button>
          {activeMenu === 'add' && (
            <div className="absolute left-0 mt-0.5 w-56 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onAddTrack(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] text-emerald-300 font-semibold flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Channel / Instrument VST...</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('view')}
            onMouseEnter={() => handleMenuHover('view')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'view' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute left-0 mt-0.5 w-52 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onToggleView('playlist'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Playlist / Arranger</span>
                <span className="text-[10px] text-cyan-400">{activeViews.playlist ? '●' : ''} F5</span>
              </button>
              <button
                onClick={() => { onToggleView('piano-roll'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Piano Roll ({project.tuning.divisionsPerOctave}-TET)</span>
                <span className="text-[10px] text-emerald-400">{activeViews.pianoRoll ? '●' : ''} F7</span>
              </button>
              <button
                onClick={() => { onToggleView('channel-rack'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Channel Rack (Step Sequencer)</span>
                <span className="text-[10px] text-amber-400">{activeViews.channelRack ? '●' : ''} F6</span>
              </button>
              <button
                onClick={() => { onToggleView('mixer'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Mixer</span>
                <span className="text-[10px] text-amber-400">{activeViews.mixer ? '●' : ''} F9</span>
              </button>
              <button
                onClick={() => { onToggleView('browser'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Browser Sidebar</span>
                <span className="text-[10px] text-zinc-400">{activeViews.browser ? '●' : ''} Alt+F8</span>
              </button>
            </div>
          )}
        </div>

        {/* OPTIONS Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('options')}
            onMouseEnter={() => handleMenuHover('options')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'options' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            Options
          </button>
          {activeMenu === 'options' && (
            <div className="absolute left-0 mt-0.5 w-60 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onOpenSettings('audio'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Audio Settings...</span>
                <span className="text-[10px] text-zinc-500">F10</span>
              </button>
              <button
                onClick={() => { onOpenSettings('midi'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>MIDI & MPE Settings...</span>
              </button>
              <button
                onClick={() => { onOpenSettings('plugins'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>Plugin Manager & VST Paths...</span>
              </button>
              <button
                onClick={() => { onOpenSettings('flstudio'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between text-cyan-300"
              >
                <span>FL Studio Library Folders...</span>
              </button>
              <button
                onClick={() => { onOpenSettings('files'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] flex items-center justify-between"
              >
                <span>File & Directory Paths...</span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('tools')}
            onMouseEnter={() => handleMenuHover('tools')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'tools' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            Tools
          </button>
          {activeMenu === 'tools' && (
            <div className="absolute left-0 mt-0.5 w-60 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onOpenScaleModal(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] text-emerald-400 flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Procedural Scale Generator...</span>
              </button>
              <button
                onClick={() => { onOpenTuningModal(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] text-indigo-400 flex items-center gap-2"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Microtonal Tuning Editor (N-TET)...</span>
              </button>
              <button
                onClick={() => { onOpenRhythmModal(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449] text-cyan-400 flex items-center gap-2"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Rhythm Structure Editor [4,4,3,3]...</span>
              </button>
            </div>
          )}
        </div>

        {/* HELP Menu */}
        <div className="relative">
          <button
            onClick={() => handleMenuClick('help')}
            onMouseEnter={() => handleMenuHover('help')}
            className={`px-2 py-0.5 rounded-sm hover:bg-[#252c3d] hover:text-white uppercase font-semibold tracking-wide ${
              activeMenu === 'help' ? 'bg-[#252c3d] text-white' : ''
            }`}
          >
            Help
          </button>
          {activeMenu === 'help' && (
            <div className="absolute left-0 mt-0.5 w-52 bg-[#1a1f2c] border border-[#2e374b] rounded shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => { onOpenSettings('about'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449]"
              >
                About AetherDAW Desktop
              </button>
              <button
                onClick={() => { onOpenSettings('shortcuts'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#2a3449]"
              >
                Keyboard Shortcuts Reference
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Project Info & Status */}
      <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
        <span>{project.name}</span>
        <span className="text-zinc-600">|</span>
        <span className="text-cyan-400">{project.tuning.divisionsPerOctave}-TET</span>
        <span className="text-zinc-600">|</span>
        <span className="text-emerald-400">[{project.rhythm.groups.join('+')}]</span>
      </div>
    </div>
  );
};
