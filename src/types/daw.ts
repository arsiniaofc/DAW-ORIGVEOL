export type SnapValue = 'bar' | 'group' | 'beat' | 'step' | '1/2' | '1/4' | '1/8' | 'none';

export interface TuningSystem {
  name: string;
  divisionsPerOctave: number; // e.g. 12, 19, 24, 31, 53
  referencePitchHz: number; // e.g. 440 Hz
  referenceNoteStep: number; // Base step for reference frequency (e.g. 69 in 12-TET)
  description?: string;
}

export interface RhythmStructure {
  groups: number[]; // e.g. [4, 4, 3, 3] or [3, 2, 2, 3]
  totalBeats: number; // sum of groups
  subdivisionsPerBeat: number; // typically 4 (16th notes)
  ticksPerBeat: number; // e.g. 480 PPQ
  name?: string;
}

export interface Scale {
  id: string;
  name: string;
  root: number; // 0 to divisionsPerOctave - 1
  steps: number[]; // e.g. [0, 3, 5, 8, 11, 14, 16] relative to root
  density: number; // 0 to 1
  consonance: number; // 0 to 100%
  tension: number; // 0 to 100%
  algorithm: 'euclidean' | 'harmonic_entropy' | 'golden_ratio' | 'euler_lattice' | 'manual';
}

export interface Note {
  id: string;
  trackId?: string; // Optional track association for multi-track patterns / Channel Rack steps
  pitch: number; // Microtonal step integer (0 to maxSteps)
  startTick: number;
  durationTicks: number;
  velocity: number; // 0 - 127
  pan?: number; // -1 to +1
  mpePressure?: number; // 0 to 1
  mpeTimbre?: number; // 0 to 1
  selected?: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  color: string;
  notes: Note[];
  lengthBeats: number;
}

export interface Clip {
  id: string;
  patternId: string;
  trackId: string;
  startTick: number;
  durationTicks: number;
  offsetTick?: number;
  muted?: boolean;
  selected?: boolean;
}

export interface AutomationPoint {
  id: string;
  tick: number;
  value: number; // 0 to 1
  tension: number; // -1 to 1 (0 = linear, >0 = smooth exponential, <0 = logarithmic)
}

export interface AutomationLane {
  id: string;
  parameter: 'volume' | 'pan' | 'cutoff' | 'resonance' | 'pitch';
  points: AutomationPoint[];
  enabled: boolean;
}

export interface AudioEffect {
  id: string;
  type: 'eq' | 'delay' | 'reverb' | 'distortion' | 'compressor';
  enabled: boolean;
  params: Record<string, number>;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  type: 'synth' | 'sampler' | 'drum' | 'audio' | 'vst-bridge';
  instrumentId: string;
  instrumentParams: Record<string, any>;
  volume: number; // 0 to 1.2
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  armed: boolean;
  mixerChannel: number;
  automationLanes: AutomationLane[];
  audioUrl?: string;
  audioDurationSeconds?: number;
}

export interface MixerChannel {
  id: number; // 0 = Master, 1-8 = Inserts, 9-10 = Sends
  name: string;
  volume: number; // 0 to 1.25
  pan: number; // -1 to 1
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  sendLevels: Record<number, number>; // channelId -> level
  peakL: number;
  peakR: number;
}

export interface PluginRecord {
  id: string;
  name: string;
  vendor: string;
  version: string;
  type: 'instrument' | 'effect';
  format: 'VST3' | 'VST2' | 'Native';
  category: string;
  path: string;
  mpeSupported: boolean;
  polyPitchSupported: boolean;
  microtonalTuning: 'native' | 'mpe-bridge' | 'ch-pitchbend' | 'unsupported';
  status: 'valid' | 'warning' | 'error';
  errorMessage?: string;
  latencySamples: number;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tuning: TuningSystem;
  rhythm: RhythmStructure;
  scale: Scale;
  snapToScale: boolean;
  snapGrid: SnapValue;
  tracks: Track[];
  patterns: Pattern[];
  clips: Clip[];
  mixer: MixerChannel[];
  masterVolume: number;
  version: string;
  created: string;
  modified: string;
}

export interface HistoryState {
  project: Project;
  activePatternId: string;
  activeTrackId: string;
  description: string;
}

export type PianoRollTool = 'select' | 'draw' | 'erase' | 'cut' | 'duplicate';

export interface WindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minWidth?: number;
  minHeight?: number;
}

export interface PluginInstanceState {
  instanceId: string;
  pluginId: string;
  trackId: string;
  hasNativeEditor: boolean;
  nativeEditorOpen: boolean;
  editorMode: 'native' | 'generic';
  hostBypassed: boolean;
  pluginBypassed: boolean;
  presetName: string;
  nativeDimensions: { width: number; height: number };
  windowHandle?: string | null;
}
