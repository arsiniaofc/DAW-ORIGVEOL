import React, { useState, useEffect, useCallback } from 'react';
import {
  Project,
  Track,
  Pattern,
  Clip,
  Note,
  TuningSystem,
  RhythmStructure,
  Scale,
  SnapValue,
  PluginRecord,
  MixerChannel,
  WindowState,
} from './types/daw';
import { createDefaultProject } from './core/defaultProject';
import { editorCore } from './core/editorCore';
import { audioEngine } from './audio/engine';
import { midiEngine } from './audio/midi';

// Icons
import { Layers, Piano, Sliders, Radio } from 'lucide-react';

// Components
import { DesktopMenuBar } from './components/DesktopMenuBar';
import { TransportBar } from './components/TransportBar';
import { BrowserSidebar } from './components/BrowserSidebar';
import { ChannelRack } from './components/ChannelRack';
import { PlaylistView } from './components/PlaylistView';
import { PianoRoll } from './components/PianoRoll';
import { Mixer } from './components/Mixer';
import { PluginWindow } from './components/PluginWindow';
import { FloatingWindow } from './components/FloatingWindow';
import { AddTrackModal } from './components/AddTrackModal';
import { SettingsModal } from './components/SettingsModal';
import { RhythmStructureModal } from './components/RhythmStructureModal';
import { TuningModal } from './components/TuningModal';
import { ScaleGeneratorModal } from './components/ScaleGeneratorModal';
import { CollectProjectModal } from './components/CollectProjectModal';
import { WelcomeDialog } from './components/WelcomeDialog';

interface DAWWindows {
  playlist: WindowState;
  channelRack: WindowState;
  pianoRoll: WindowState;
  mixer: WindowState;
}

export default function App() {
  // CLEAN DEFAULT: Initial state is clean empty project (user requested: "limpe o projeto padrão, ele deve vir sem algo ja feito")
  const [project, setProject] = useState<Project>(() => {
    return createDefaultProject();
  });

  // Window Visibility & Layout States (True FL Studio MDI draggable/resizable window architecture)
  const [showBrowser, setShowBrowser] = useState<boolean>(true);
  const [activeWindowId, setActiveWindowId] = useState<string>('channelRack');
  const [maxZIndex, setMaxZIndex] = useState<number>(35);

  const [windows, setWindows] = useState<DAWWindows>({
    playlist: {
      id: 'playlist',
      title: 'Playlist - Arranger',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      x: 10,
      y: 10,
      width: 860,
      height: 440,
      zIndex: 10,
      minWidth: 420,
      minHeight: 220,
    },
    channelRack: {
      id: 'channelRack',
      title: 'Channel rack',
      isOpen: true,
      isMinimized: false,
      isMaximized: false,
      x: 35,
      y: 35,
      width: 580,
      height: 380,
      zIndex: 30,
      minWidth: 400,
      minHeight: 220,
    },
    pianoRoll: {
      id: 'pianoRoll',
      title: 'Piano roll',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      x: 75,
      y: 65,
      width: 860,
      height: 480,
      zIndex: 20,
      minWidth: 440,
      minHeight: 260,
    },
    mixer: {
      id: 'mixer',
      title: 'Mixer - Master',
      isOpen: false,
      isMinimized: false,
      isMaximized: false,
      x: 110,
      y: 95,
      width: 820,
      height: 430,
      zIndex: 20,
      minWidth: 480,
      minHeight: 280,
    },
  });

  const bringToFront = (id: keyof DAWWindows) => {
    setActiveWindowId(id);
    setMaxZIndex((prevZ) => {
      const nextZ = prevZ + 1;
      setWindows((w) => ({
        ...w,
        [id]: { ...w[id], zIndex: nextZ },
      }));
      return nextZ;
    });
  };

  const updateWindowState = (id: keyof DAWWindows, partial: Partial<WindowState>) => {
    setWindows((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...partial },
    }));
  };

  const toggleWindow = (id: keyof DAWWindows) => {
    setWindows((prev) => {
      const win = prev[id];
      const willOpen = !win.isOpen;
      const nextZ = maxZIndex + 1;
      setMaxZIndex(nextZ);
      return {
        ...prev,
        [id]: {
          ...win,
          isOpen: willOpen,
          isMinimized: false,
          zIndex: willOpen ? nextZ : win.zIndex,
        },
      };
    });
    if (!windows[id].isOpen) {
      setActiveWindowId(id);
    }
  };

  // Active Selections
  const [activeTrackId, setActiveTrackId] = useState<string>(project.tracks[0]?.id || 'track-1');
  const [activePatternId, setActivePatternId] = useState<string>(project.patterns[0]?.id || 'pat-1');
  const [activeMixerChannelId, setActiveMixerChannelId] = useState<number>(1);

  // Plugin UI Window State
  const [openPluginTrackId, setOpenPluginTrackId] = useState<string | null>(null);

  // Playback & Transport State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<'pat' | 'song'>('song');
  const [playheadTick, setPlayheadTick] = useState<number>(0);

  // Modals
  const [isAddTrackModalOpen, setIsAddTrackModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('files');
  const [isRhythmModalOpen, setIsRhythmModalOpen] = useState(false);
  const [isTuningModalOpen, setIsTuningModalOpen] = useState(false);
  const [isScaleModalOpen, setIsScaleModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => {
    return localStorage.getItem('aether_daw_hide_welcome') !== 'true';
  });

  // Undo / Redo history tracking
  const [historyCounter, setHistoryCounter] = useState(0);

  // Record history snapshot
  const recordHistory = useCallback(
    (description: string) => {
      editorCore.recordSnapshot(project);
      setHistoryCounter((c) => c + 1);
    },
    [project]
  );

  const handleUndo = () => {
    const prev = editorCore.undo(project);
    if (prev) {
      setProject(prev);
      setHistoryCounter((c) => c + 1);
    }
  };

  const handleRedo = () => {
    const next = editorCore.redo(project);
    if (next) {
      setProject(next);
      setHistoryCounter((c) => c + 1);
    }
  };

  // Audio Engine & MIDI initialization
  useEffect(() => {
    const unsubPlayhead = audioEngine.onPlayheadUpdate((tick) => {
      setPlayheadTick(tick);
    });

    const unsubState = audioEngine.onStateChange((playing) => {
      setIsPlaying(playing);
    });

    const unsubNoteOn = midiEngine.onNoteOn((noteNumber, vel) => {
      const activeTrack = project.tracks.find((t) => t.id === activeTrackId);
      if (activeTrack) {
        audioEngine.previewNote(activeTrack, noteNumber, project.tuning, vel, 0.4);
      }
    });

    return () => {
      unsubPlayhead();
      unsubState();
      unsubNoteOn();
    };
  }, [activeTrackId, project.tuning, project.tracks]);

  // Global Keyboard Shortcuts (FL Studio style F5, F6, F7, F9, Space, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        toggleWindow('playlist');
      } else if (e.key === 'F6') {
        e.preventDefault();
        toggleWindow('channelRack');
      } else if (e.key === 'F7') {
        e.preventDefault();
        toggleWindow('pianoRoll');
      } else if (e.key === 'F9') {
        e.preventDefault();
        toggleWindow('mixer');
      } else if (e.key === 'F8' && e.altKey) {
        e.preventDefault();
        setShowBrowser((v) => !v);
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          audioEngine.pause();
        } else {
          audioEngine.play(project, playheadTick);
        }
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveProject();
      } else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playheadTick, project, windows, maxZIndex]);

  // Window Toggles
  const handleToggleView = (view: 'playlist' | 'piano-roll' | 'channel-rack' | 'mixer' | 'browser') => {
    if (view === 'playlist') toggleWindow('playlist');
    if (view === 'piano-roll') toggleWindow('pianoRoll');
    if (view === 'channel-rack') toggleWindow('channelRack');
    if (view === 'mixer') toggleWindow('mixer');
    if (view === 'browser') setShowBrowser((v) => !v);
  };

  // Transport handlers
  const handlePlay = () => {
    audioEngine.play(project, playheadTick);
  };

  const handlePause = () => {
    audioEngine.pause();
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleTogglePlayMode = () => {
    setPlayMode((m) => (m === 'pat' ? 'song' : 'pat'));
  };

  const handleRecordToggle = async () => {
    if (!isRecording) {
      const ok = await audioEngine.startRecording(activeTrackId, playheadTick);
      if (ok) {
        setIsRecording(true);
        if (!isPlaying) handlePlay();
      }
    } else {
      const recorded = await audioEngine.stopRecording();
      setIsRecording(false);

      if (recorded) {
        const newTrack: Track = {
          id: `track-rec-${Date.now().toString(36)}`,
          name: `Recording ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          color: '#e11d48',
          type: 'audio',
          instrumentId: 'audio-clip-player',
          instrumentParams: {},
          volume: 0.9,
          pan: 0,
          muted: false,
          solo: false,
          armed: false,
          mixerChannel: Math.min(16, project.tracks.length + 1),
          automationLanes: [],
          audioUrl: recorded.audioUrl,
          audioDurationSeconds: recorded.durationSec,
        };

        const newPattern: Pattern = {
          id: `pat-rec-${Date.now().toString(36)}`,
          name: newTrack.name,
          color: '#e11d48',
          notes: [],
          lengthBeats: Math.ceil(recorded.durationSec * (project.bpm / 60)),
        };

        const newClip: Clip = {
          id: `clip-rec-${Date.now().toString(36)}`,
          patternId: newPattern.id,
          trackId: newTrack.id,
          startTick: recorded.startTick,
          durationTicks: Math.round(recorded.durationSec * (project.bpm / 60) * project.rhythm.ticksPerBeat),
        };

        recordHistory('Add Recorded Audio');
        setProject((prev) => ({
          ...prev,
          tracks: [...prev.tracks, newTrack],
          patterns: [...prev.patterns, newPattern],
          clips: [...prev.clips, newClip],
        }));
      }
    }
  };

  // Add Track / Instrument (with modal)
  const handleAddTrackWithInstrument = (item: {
    name: string;
    type: 'synth' | 'drum' | 'sampler' | 'audio' | 'vst-bridge';
    instrumentId: string;
    color: string;
    format: 'Native' | 'VST3' | 'VST2';
    vendor?: string;
  }) => {
    const newId = `track-${Date.now().toString(36)}`;
    const nextMixerChannel = Math.min(16, project.tracks.length + 1);

    const newTrack: Track = {
      id: newId,
      name: item.name,
      color: item.color,
      type: item.type,
      instrumentId: item.instrumentId,
      instrumentParams: { cutoff: 2800, resonance: 3.5, modRatio: 2.0, modIndex: 80 },
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      mixerChannel: nextMixerChannel,
      automationLanes: [],
    };

    const newPattern: Pattern = {
      id: `pat-${Date.now().toString(36)}`,
      name: `${item.name} Pattern`,
      color: item.color,
      notes: [],
      lengthBeats: project.rhythm.totalBeats,
    };

    recordHistory(`Add Track (${item.name})`);
    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
      patterns: [...prev.patterns, newPattern],
    }));

    setActiveTrackId(newId);
    setActivePatternId(newPattern.id);
    // Automatically open its plugin UI window so user can configure parameters immediately!
    setOpenPluginTrackId(newId);
  };

  const handleUpdateTrack = (updatedTrack: Track) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === updatedTrack.id ? updatedTrack : t)),
    }));
  };

  const handleRemoveTrack = (trackId: string) => {
    if (project.tracks.length <= 1) return;
    recordHistory('Remove Track');
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
      clips: prev.clips.filter((c) => c.trackId !== trackId),
    }));
    if (activeTrackId === trackId) {
      setActiveTrackId(project.tracks[0]?.id || 'track-1');
    }
  };

  const handleCloneTrack = (trackId: string) => {
    const srcTrack = project.tracks.find((t) => t.id === trackId);
    if (!srcTrack) return;

    recordHistory(`Clone Track ${srcTrack.name}`);
    const newTrackId = `track-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const clonedTrack: Track = {
      ...srcTrack,
      id: newTrackId,
      name: `${srcTrack.name} #2`,
      mixerChannel: Math.min(16, (srcTrack.mixerChannel % 16) + 1),
    };

    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, clonedTrack],
    }));
    setActiveTrackId(newTrackId);
  };

  const handleReplaceInstrument = (trackId: string, instrumentId: string, name: string) => {
    recordHistory(`Replace instrument on ${name}`);
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              instrumentId,
              name,
              type: instrumentId.startsWith('vst-') ? 'vst-bridge' : instrumentId.includes('drum') ? 'drum' : 'synth',
            }
          : t
      ),
    }));
  };

  const handleInsertTrack = (beforeTrackId: string) => {
    recordHistory('Insert Track');
    const newTrackId = `track-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newTrack: Track = {
      id: newTrackId,
      name: 'Sampler',
      color: '#38bdf8',
      type: 'sampler',
      instrumentId: 'aether-polyfm',
      instrumentParams: { cutoff: 2400, resonance: 2.0, modRatio: 2.0, modIndex: 50 },
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      mixerChannel: Math.min(16, project.tracks.length + 1),
      automationLanes: [],
    };

    setProject((prev) => {
      const idx = prev.tracks.findIndex((t) => t.id === beforeTrackId);
      const newTracks = [...prev.tracks];
      if (idx !== -1) {
        newTracks.splice(idx, 0, newTrack);
      } else {
        newTracks.push(newTrack);
      }
      return { ...prev, tracks: newTracks };
    });
    setActiveTrackId(newTrackId);
  };

  // Browser Drag and Drop Handlers (Rule: drag sample/soundfont/plugin to Channel Rack or Playlist)
  const handleDropOnTrack = (trackId: string, item: any) => {
    if (!item) return;
    const cleanName = item.label ? item.label.replace(/\.[^/.]+$/, '') : 'Sample';

    if (item.type === 'sample' || item.type === 'soundfont') {
      recordHistory(`Load ${cleanName} on track`);
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                name: cleanName,
                type: item.type === 'soundfont' ? 'synth' : 'sampler',
                instrumentId: item.id,
                instrumentParams: {
                  ...t.instrumentParams,
                  samplePath: item.meta?.path,
                  sampleUrl: item.meta?.url,
                },
              }
            : t
        ),
      }));
    } else if (item.type === 'plugin') {
      handleReplaceInstrument(
        trackId,
        item.meta?.instrumentId || item.id,
        item.label.replace(/\.(vst3|native)$/i, '')
      );
    }
  };

  const handleDropToCreateTrack = (item: any) => {
    if (!item) return;
    const cleanName = item.label ? item.label.replace(/\.[^/.]+$/, '') : 'Channel';
    recordHistory(`Add track (${cleanName})`);

    const newId = `track-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const isSf2 = item.type === 'soundfont';
    const isSample = item.type === 'sample';

    const newTrack: Track = {
      id: newId,
      name: cleanName,
      color: item.meta?.color || (isSf2 ? '#a855f7' : isSample ? '#38bdf8' : '#10b981'),
      type: isSf2 ? 'synth' : isSample ? 'sampler' : (item.meta?.trackType || 'synth'),
      instrumentId: item.meta?.instrumentId || item.id,
      instrumentParams: {
        cutoff: 2400,
        resonance: 2.0,
        modRatio: 2.0,
        modIndex: 50,
        samplePath: item.meta?.path,
        sampleUrl: item.meta?.url,
      },
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      armed: false,
      mixerChannel: Math.min(16, project.tracks.length + 1),
      automationLanes: [],
    };

    const newPattern: Pattern = {
      id: `pat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      name: `${cleanName} Pattern`,
      color: newTrack.color,
      notes: [],
      lengthBeats: project.rhythm.totalBeats,
    };

    setProject((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
      patterns: [...prev.patterns, newPattern],
    }));

    setActiveTrackId(newId);
    setActivePatternId(newPattern.id);
    setOpenPluginTrackId(newId);
  };

  const handleDropItemOnLane = (trackId: string, dropTick: number, item: any) => {
    if (!item) return;
    recordHistory(`Place clip from ${item.label || 'browser'}`);

    const existingTrack = project.tracks.find((t) => t.id === trackId);
    let targetPatternId = activePatternId;

    if (existingTrack) {
      let pat = project.patterns.find((p) => p.name.includes(existingTrack.name));
      if (!pat) {
        pat = {
          id: `pat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
          name: `${existingTrack.name} Pattern`,
          color: existingTrack.color,
          notes: [],
          lengthBeats: project.rhythm.totalBeats,
        };
        setProject((prev) => ({ ...prev, patterns: [...prev.patterns, pat!] }));
      }
      targetPatternId = pat.id;
    }

    const ticksPerMeasure = project.rhythm.totalBeats * project.rhythm.ticksPerBeat;
    const newClip: Clip = {
      id: `clip-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      patternId: targetPatternId,
      trackId,
      startTick: dropTick,
      durationTicks: ticksPerMeasure,
      selected: false,
    };

    setProject((prev) => ({
      ...prev,
      clips: [...prev.clips, newClip],
    }));
  };

  // Pattern operations
  const handleAddPattern = () => {
    const num = project.patterns.length + 1;
    const newPat: Pattern = {
      id: `pat-${Date.now().toString(36)}`,
      name: `Pattern ${num}`,
      color: '#38bdf8',
      notes: [],
      lengthBeats: project.rhythm.totalBeats,
    };
    recordHistory('Add Pattern');
    setProject((prev) => ({
      ...prev,
      patterns: [...prev.patterns, newPat],
    }));
    setActivePatternId(newPat.id);
  };

  const handleUpdatePatternNotes = (notes: Note[]) => {
    setProject((prev) => ({
      ...prev,
      patterns: prev.patterns.map((p) => (p.id === activePatternId ? { ...p, notes } : p)),
    }));
  };

  // Cross-track duplicate
  const handleDuplicateNotesToTrack = (notes: Note[], targetTrackId: string) => {
    const targetTrack = project.tracks.find((t) => t.id === targetTrackId);
    if (!targetTrack) return;

    let targetPattern = project.patterns.find((p) => p.name.includes(targetTrack.name));
    if (!targetPattern) {
      targetPattern = {
        id: `pat-dup-${Date.now().toString(36)}`,
        name: `${targetTrack.name} Pattern`,
        color: targetTrack.color,
        notes: [],
        lengthBeats: project.rhythm.totalBeats,
      };
      setProject((prev) => ({
        ...prev,
        patterns: [...prev.patterns, targetPattern!],
      }));
    }

    const duplicatedNotes = editorCore.duplicateNotes(notes);
    setProject((prev) => ({
      ...prev,
      patterns: prev.patterns.map((p) =>
        p.id === targetPattern!.id ? { ...p, notes: [...p.notes, ...duplicatedNotes] } : p
      ),
    }));
  };

  // Update track plugin parameters from Plugin Window
  const handleUpdateTrackParams = (trackId: string, params: Record<string, any>) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, instrumentParams: params } : t)),
    }));
  };

  // Project serialization
  const handleNewProject = () => {
    if (window.confirm('Create new clean empty project?')) {
      const fresh = createDefaultProject();
      setProject(fresh);
      setActiveTrackId(fresh.tracks[0].id);
      setActivePatternId(fresh.patterns[0].id);
      setOpenPluginTrackId(null);
    }
  };

  const handleSaveProject = () => {
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.experimental`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.experimental,.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target?.result as string);
          setProject(loaded);
          setActiveTrackId(loaded.tracks[0]?.id || 'track-1');
          setActivePatternId(loaded.patterns[0]?.id || 'pat-1');
        } catch {
          alert('Invalid project file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const activeTrack = project.tracks.find((t) => t.id === activeTrackId) || project.tracks[0];
  const activePattern = project.patterns.find((p) => p.id === activePatternId) || project.patterns[0];
  const pluginTrack = project.tracks.find((t) => t.id === openPluginTrackId);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0f1118] text-[#cfd4e2] overflow-hidden select-none font-sans">
      {/* 1. Desktop Top Menu Bar (FILE, EDIT, ADD, PATTERNS, VIEW, OPTIONS, TOOLS, HELP) */}
      <DesktopMenuBar
        project={project}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onExportProject={handleSaveProject}
        onCollectFiles={() => setIsCollectModalOpen(true)}
        onOpenSettings={(tab) => {
          setSettingsInitialTab(tab || 'files');
          setIsSettingsModalOpen(true);
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={editorCore.canUndo()}
        canRedo={editorCore.canRedo()}
        onToggleView={handleToggleView}
        onOpenTuningModal={() => setIsTuningModalOpen(true)}
        onOpenRhythmModal={() => setIsRhythmModalOpen(true)}
        onOpenScaleModal={() => setIsScaleModalOpen(true)}
        onAddTrack={() => setIsAddTrackModalOpen(true)}
        activeViews={{
          playlist: windows.playlist.isOpen,
          pianoRoll: windows.pianoRoll.isOpen,
          channelRack: windows.channelRack.isOpen,
          mixer: windows.mixer.isOpen,
          browser: showBrowser,
        }}
      />

      {/* 2. FL Studio Style Transport Bar (PAT/SONG, BPM, Time/Position, Snap, Window Toggle Icons) */}
      <TransportBar
        project={project}
        isPlaying={isPlaying}
        isRecording={isRecording}
        playMode={playMode}
        playheadTick={playheadTick}
        onTogglePlayMode={handleTogglePlayMode}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onRecordToggle={handleRecordToggle}
        onUpdateBpm={(bpm) => setProject((prev) => ({ ...prev, bpm }))}
        onUpdateSnap={(snapGrid) => setProject((prev) => ({ ...prev, snapGrid }))}
        onToggleView={handleToggleView}
        onSaveProject={handleSaveProject}
        onSelectPattern={setActivePatternId}
        onAddPattern={handleAddPattern}
        activePatternId={activePatternId}
        activeViews={{
          playlist: windows.playlist.isOpen,
          pianoRoll: windows.pianoRoll.isOpen,
          channelRack: windows.channelRack.isOpen,
          mixer: windows.mixer.isOpen,
          browser: showBrowser,
        }}
      />

      {/* 3. Main Multi-Window Workstation Workspace (True FL Studio MDI Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: FL Studio Style Tree Browser Sidebar */}
        <BrowserSidebar
          project={project}
          isOpen={showBrowser}
          onClose={() => setShowBrowser(false)}
          onAddTrackFromBrowser={handleAddTrackWithInstrument}
          onOpenPluginUI={(trackId) => setOpenPluginTrackId(trackId)}
        />

        {/* Central Workspace Desktop Canvas */}
        <div className="flex-1 overflow-hidden relative bg-[#0b0e14] select-none">
          {/* Subtle background desktop watermark/grid */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e2638_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

          {/* 1. Main Arranger / Playlist Window (F5) */}
          {windows.playlist.isOpen && (
            <FloatingWindow
              windowState={windows.playlist}
              isActive={activeWindowId === 'playlist'}
              onUpdateState={(partial) => updateWindowState('playlist', partial)}
              onFocus={() => bringToFront('playlist')}
              onClose={() => updateWindowState('playlist', { isOpen: false })}
              headerIcon={<Layers className="w-3.5 h-3.5 text-cyan-400" />}
            >
              <PlaylistView
                project={project}
                activeTrackId={activeTrackId}
                activePatternId={activePatternId}
                playheadTick={playheadTick}
                onSelectTrack={setActiveTrackId}
                onSelectPattern={setActivePatternId}
                onUpdateClips={(clips) => setProject((prev) => ({ ...prev, clips }))}
                onUpdateTrack={handleUpdateTrack}
                onAddTrack={() => setIsAddTrackModalOpen(true)}
                onRemoveTrack={handleRemoveTrack}
                onRecordHistory={recordHistory}
                onOpenPianoRoll={(patId) => {
                  setActivePatternId(patId);
                  if (!windows.pianoRoll.isOpen) {
                    toggleWindow('pianoRoll');
                  } else {
                    bringToFront('pianoRoll');
                  }
                }}
                onDropItemOnLane={handleDropItemOnLane}
              />
            </FloatingWindow>
          )}

          {/* 2. Floating Channel Rack Window (F6) */}
          {windows.channelRack.isOpen && (
            <FloatingWindow
              windowState={windows.channelRack}
              isActive={activeWindowId === 'channelRack'}
              onUpdateState={(partial) => updateWindowState('channelRack', partial)}
              onFocus={() => bringToFront('channelRack')}
              onClose={() => updateWindowState('channelRack', { isOpen: false })}
              headerIcon={<Sliders className="w-3.5 h-3.5 text-amber-400" />}
            >
              <ChannelRack
                project={project}
                activePattern={activePattern}
                activeTrackId={activeTrackId}
                isOpen={windows.channelRack.isOpen}
                onClose={() => updateWindowState('channelRack', { isOpen: false })}
                onSelectTrack={setActiveTrackId}
                onUpdateTrack={handleUpdateTrack}
                onUpdatePatternNotes={handleUpdatePatternNotes}
                onOpenPluginUI={(tId) => setOpenPluginTrackId(tId)}
                onAddTrack={() => setIsAddTrackModalOpen(true)}
                onRecordHistory={recordHistory}
                embedded={true}
                onOpenPianoRoll={(tId) => {
                  setActiveTrackId(tId);
                  if (!windows.pianoRoll.isOpen) {
                    toggleWindow('pianoRoll');
                  } else {
                    bringToFront('pianoRoll');
                  }
                }}
                onCloneTrack={handleCloneTrack}
                onDeleteTrack={handleRemoveTrack}
                onReplaceInstrument={handleReplaceInstrument}
                onInsertTrack={handleInsertTrack}
                onDropOnTrack={handleDropOnTrack}
                onDropToCreateTrack={handleDropToCreateTrack}
              />
            </FloatingWindow>
          )}

          {/* 3. Floating Piano Roll Window (F7) */}
          {windows.pianoRoll.isOpen && (
            <FloatingWindow
              windowState={{
                ...windows.pianoRoll,
                title: `Piano Roll - ${activeTrack.name} (${project.tuning.divisionsPerOctave}-TET)`,
              }}
              isActive={activeWindowId === 'pianoRoll'}
              onUpdateState={(partial) => updateWindowState('pianoRoll', partial)}
              onFocus={() => bringToFront('pianoRoll')}
              onClose={() => updateWindowState('pianoRoll', { isOpen: false })}
              headerIcon={<Piano className="w-3.5 h-3.5 text-emerald-400" />}
            >
              <PianoRoll
                project={project}
                activeTrack={activeTrack}
                activePattern={activePattern}
                playheadTick={playheadTick}
                onUpdatePatternNotes={handleUpdatePatternNotes}
                onDuplicateNotesToTrack={handleDuplicateNotesToTrack}
                onRecordHistory={recordHistory}
              />
            </FloatingWindow>
          )}

          {/* 4. Floating Mixer Window (F9) */}
          {windows.mixer.isOpen && (
            <FloatingWindow
              windowState={windows.mixer}
              isActive={activeWindowId === 'mixer'}
              onUpdateState={(partial) => updateWindowState('mixer', partial)}
              onFocus={() => bringToFront('mixer')}
              onClose={() => updateWindowState('mixer', { isOpen: false })}
              headerIcon={<Radio className="w-3.5 h-3.5 text-indigo-400" />}
            >
              <Mixer
                mixerChannels={project.mixer}
                activeChannelId={activeMixerChannelId}
                onSelectChannel={setActiveMixerChannelId}
                onUpdateChannel={(channel) =>
                  setProject((prev) => ({
                    ...prev,
                    mixer: prev.mixer.map((ch) => (ch.id === channel.id ? channel : ch)),
                  }))
                }
              />
            </FloatingWindow>
          )}

          {/* Bottom Desktop Taskbar / Dock Strip (Quick access to open & minimized windows) */}
          <div className="absolute bottom-2 left-4 z-40 flex items-center gap-1.5 bg-[#141824]/90 backdrop-blur-md px-2 py-1 rounded-md border border-[#273248] shadow-lg text-[10px]">
            <span className="text-zinc-500 font-mono text-[9px] mr-1">WINDOWS:</span>

            {/* Playlist Button */}
            <button
              onClick={() => {
                if (!windows.playlist.isOpen) toggleWindow('playlist');
                else bringToFront('playlist');
              }}
              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 border transition-colors ${
                windows.playlist.isOpen
                  ? activeWindowId === 'playlist'
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-[#1e2536] text-zinc-300 border-[#2b354c]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>Playlist (F5)</span>
            </button>

            {/* Channel Rack Button */}
            <button
              onClick={() => {
                if (!windows.channelRack.isOpen) toggleWindow('channelRack');
                else bringToFront('channelRack');
              }}
              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 border transition-colors ${
                windows.channelRack.isOpen
                  ? activeWindowId === 'channelRack'
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-[#1e2536] text-zinc-300 border-[#2b354c]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Channel Rack (F6)</span>
            </button>

            {/* Piano Roll Button */}
            <button
              onClick={() => {
                if (!windows.pianoRoll.isOpen) toggleWindow('pianoRoll');
                else bringToFront('pianoRoll');
              }}
              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 border transition-colors ${
                windows.pianoRoll.isOpen
                  ? activeWindowId === 'pianoRoll'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-[#1e2536] text-zinc-300 border-[#2b354c]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Piano className="w-3 h-3 text-emerald-400" />
              <span>Piano Roll (F7)</span>
            </button>

            {/* Mixer Button */}
            <button
              onClick={() => {
                if (!windows.mixer.isOpen) toggleWindow('mixer');
                else bringToFront('mixer');
              }}
              className={`px-2 py-0.5 rounded font-medium flex items-center gap-1 border transition-colors ${
                windows.mixer.isOpen
                  ? activeWindowId === 'mixer'
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-[#1e2536] text-zinc-300 border-[#2b354c]'
                  : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
              }`}
            >
              <Radio className="w-3 h-3 text-indigo-400" />
              <span>Mixer (F9)</span>
            </button>

            {/* Plugin Window Indicator if open */}
            {pluginTrack && openPluginTrackId && (
              <button
                onClick={() => {}}
                className="px-2 py-0.5 rounded font-medium flex items-center gap-1 border bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pluginTrack.color }} />
                <span>{pluginTrack.name} (Plugin)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Interactive Plugin / Instrument UI Window (as requested: "ele deve abrir a UI dos plugins, pra configurar e etc") */}
      {pluginTrack && (
        <PluginWindow
          track={pluginTrack}
          tuning={project.tuning}
          isOpen={Boolean(openPluginTrackId)}
          onClose={() => setOpenPluginTrackId(null)}
          onUpdateTrackParams={handleUpdateTrackParams}
        />
      )}

      {/* 5. Add Track / VST Selection Modal */}
      <AddTrackModal
        isOpen={isAddTrackModalOpen}
        tuning={project.tuning}
        onClose={() => setIsAddTrackModalOpen(false)}
        onSelectInstrument={handleAddTrackWithInstrument}
      />

      {/* 6. Comprehensive Settings / Library Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        initialTab={settingsInitialTab}
        tuning={project.tuning}
        onClose={() => setIsSettingsModalOpen(false)}
        onUpdateTuning={(newT) => setProject((prev) => ({ ...prev, tuning: newT }))}
      />

      {/* 7. Rhythm Structure Editor Modal */}
      <RhythmStructureModal
        currentRhythm={project.rhythm}
        isOpen={isRhythmModalOpen}
        onClose={() => setIsRhythmModalOpen(false)}
        onApplyRhythm={(newRhythm) => setProject((prev) => ({ ...prev, rhythm: newRhythm }))}
      />

      {/* 8. Microtonal Tuning Modal */}
      <TuningModal
        currentTuning={project.tuning}
        isOpen={isTuningModalOpen}
        onClose={() => setIsTuningModalOpen(false)}
        onApplyTuning={(newTuning) => setProject((prev) => ({ ...prev, tuning: newTuning }))}
      />

      {/* 9. Procedural Scale Generator Modal */}
      <ScaleGeneratorModal
        currentScale={project.scale}
        tuning={project.tuning}
        isOpen={isScaleModalOpen}
        onClose={() => setIsScaleModalOpen(false)}
        onApplyScale={(newScale, enableSnap) =>
          setProject((prev) => ({ ...prev, scale: newScale, snapToScale: enableSnap }))
        }
      />

      {/* 10. Collect Project Files Modal */}
      <CollectProjectModal
        project={project}
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
      />

      {/* 11. Welcome Dialog (Screenshot 1) */}
      <WelcomeDialog
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onNewEmpty={handleNewProject}
        onRecordAudio={handleRecordToggle}
      />
    </div>
  );
}
