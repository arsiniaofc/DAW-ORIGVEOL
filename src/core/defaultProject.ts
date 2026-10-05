import { Project, TuningSystem, RhythmStructure, Scale, MixerChannel } from '../types/daw';
import { TUNING_PRESETS } from './microtonal';
import { createRhythmStructure } from './rhythm';
import { generateProceduralScale } from './scaleGenerator';

export function createDefaultProject(): Project {
  // Standard or microtonal starting tuning (19-TET or 12-TET selectable, default 19-TET for experimental focus)
  const tuning: TuningSystem = TUNING_PRESETS[1]; // 19-TET
  // [4, 4] or [4, 4, 3, 3] rhythm structure
  const rhythm: RhythmStructure = createRhythmStructure([4, 4], '[4, 4]');

  // Clean scale
  const scale: Scale = generateProceduralScale(
    {
      root: 0,
      noteCount: 7,
      density: 7 / 19,
      symmetry: false,
      consonanceTarget: 75,
      tensionTarget: 35,
      minInterval: 2,
      maxInterval: 4,
      algorithm: 'euclidean',
    },
    tuning
  );

  // 16 Mixer Insert channels + Master + 2 Aux sends (just like in FL Studio screenshot 5)
  const mixer: MixerChannel[] = [
    { id: 0, name: 'Master', volume: 0.85, pan: 0, muted: false, solo: false, effects: [], sendLevels: {}, peakL: 0, peakR: 0 },
  ];

  for (let i = 1; i <= 16; i++) {
    mixer.push({
      id: i,
      name: `Insert ${i}`,
      volume: 0.8,
      pan: 0,
      muted: false,
      solo: false,
      effects: [],
      sendLevels: { 17: 0, 18: 0 },
      peakL: 0,
      peakR: 0,
    });
  }

  // Aux Sends
  mixer.push({ id: 17, name: 'Send 1 (Verb)', volume: 0.7, pan: 0, muted: false, solo: false, effects: [], sendLevels: {}, peakL: 0, peakR: 0 });
  mixer.push({ id: 18, name: 'Send 2 (Delay)', volume: 0.7, pan: 0, muted: false, solo: false, effects: [], sendLevels: {}, peakL: 0, peakR: 0 });

  return {
    id: `project-${Date.now().toString(36)}`,
    name: 'Untitled Project',
    bpm: 140,
    tuning,
    rhythm,
    scale,
    snapToScale: false,
    snapGrid: 'beat',
    masterVolume: 0.85,
    // CLEAN DEFAULT: 1 empty Sampler track, NO pre-placed notes or clips!
    tracks: [
      {
        id: 'track-1',
        name: 'Sampler',
        color: '#38bdf8', // light blue
        type: 'sampler',
        instrumentId: 'aether-polyfm',
        instrumentParams: { cutoff: 2400, resonance: 2.0, modRatio: 2.0, modIndex: 50 },
        volume: 0.8,
        pan: 0,
        muted: false,
        solo: false,
        armed: false,
        mixerChannel: 1,
        automationLanes: [],
      },
    ],
    patterns: [
      {
        id: 'pat-1',
        name: 'Pattern 1',
        color: '#38bdf8',
        notes: [], // Clean empty notes!
        lengthBeats: 8,
      },
    ],
    clips: [], // Clean empty timeline clips!
    mixer,
    version: '1.0.0-clean',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  };
}
