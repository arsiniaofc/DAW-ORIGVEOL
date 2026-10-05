import { TuningSystem } from '../types/daw';

export const TUNING_PRESETS: TuningSystem[] = [
  {
    name: '12-TET (Standard Western)',
    divisionsPerOctave: 12,
    referencePitchHz: 440,
    referenceNoteStep: 69, // A4
    description: 'Standard 12 equal divisions per octave. Equal temperament basis for Western music.',
  },
  {
    name: '19-TET (Extended Diatonic)',
    divisionsPerOctave: 19,
    referencePitchHz: 440,
    referenceNoteStep: 19 * 4 + 14, // A4
    description: 'Excellent thirds (very close to 5:4 pure major third), distinct sharps and flats (C# ≠ Db).',
  },
  {
    name: '24-TET (Quarter-Tone)',
    divisionsPerOctave: 24,
    referencePitchHz: 440,
    referenceNoteStep: 24 * 4 + 18, // A4
    description: 'Quarter-tone tuning. Adds 50-cent neutral intervals widely used in Middle Eastern and contemporary music.',
  },
  {
    name: '31-TET (Huygens / Extended Meantone)',
    divisionsPerOctave: 31,
    referencePitchHz: 440,
    referenceNoteStep: 31 * 4 + 23, // A4
    description: 'Celebrated by Christiaan Huygens. Virtually pure major thirds and septimal 7th harmonics (7:4).',
  },
  {
    name: '53-TET (Mercator / Pure Fifths & Thirds)',
    divisionsPerOctave: 53,
    referencePitchHz: 440,
    referenceNoteStep: 53 * 4 + 39, // A4
    description: 'Matches Turkish Makam & Indian Shruti traditions. Fifths are within 0.07 cents of pure 3:2.',
  },
  {
    name: '100-TET (Cent Grid / Ultra-Microtonal)',
    divisionsPerOctave: 100,
    referencePitchHz: 440,
    referenceNoteStep: 100 * 4 + 75,
    description: '12 cents per division. Experimental ultra-fine spectral continuum.',
  },
];

/**
 * Calculates the exact frequency in Hertz for any microtonal step.
 */
export function getFrequency(step: number, tuning: TuningSystem): number {
  const { divisionsPerOctave, referencePitchHz, referenceNoteStep } = tuning;
  const deltaSteps = step - referenceNoteStep;
  return referencePitchHz * Math.pow(2, deltaSteps / divisionsPerOctave);
}

/**
 * Converts a frequency to the nearest step in the current tuning system.
 */
export function frequencyToStep(freq: number, tuning: TuningSystem): number {
  const { divisionsPerOctave, referencePitchHz, referenceNoteStep } = tuning;
  return Math.round(referenceNoteStep + divisionsPerOctave * Math.log2(freq / referencePitchHz));
}

/**
 * Calculates cents offset relative to the base of the octave (0 to 1200 cents).
 */
export function getCentsInOctave(step: number, divisionsPerOctave: number): number {
  const stepInOctave = ((step % divisionsPerOctave) + divisionsPerOctave) % divisionsPerOctave;
  return Math.round((stepInOctave / divisionsPerOctave) * 1200);
}

/**
 * Generates an informative label for any step in any N-TET system.
 */
export function getStepLabel(step: number, tuning: TuningSystem): { name: string; octave: number; cents: number; hz: number } {
  const N = tuning.divisionsPerOctave;
  const octave = Math.floor(step / N);
  const stepInOctave = ((step % N) + N) % N;
  const cents = getCentsInOctave(step, N);
  const hz = Math.round(getFrequency(step, tuning) * 10) / 10;

  let name = '';

  if (N === 12) {
    const names12 = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    name = `${names12[stepInOctave]}${octave}`;
  } else if (N === 19) {
    // 19-TET has distinct enharmonics: C, C#, Db, D, D#, Eb, E, E#, F, F#, Gb, G, G#, Ab, A, A#, Bb, B, B#
    const names19 = ['C', 'C#', 'D♭', 'D', 'D#', 'E♭', 'E', 'E#', 'F', 'F#', 'G♭', 'G', 'G#', 'A♭', 'A', 'A#', 'B♭', 'B', 'B#'];
    name = `${names19[stepInOctave]}${octave}`;
  } else if (N === 24) {
    // 24-TET quarter-tone notation
    const base12 = ['C', 'C', 'C#', 'C#', 'D', 'D', 'D#', 'D#', 'E', 'E', 'F', 'F', 'F#', 'F#', 'G', 'G', 'G#', 'G#', 'A', 'A', 'A#', 'A#', 'B', 'B'];
    const isQuarter = stepInOctave % 2 === 1;
    name = `${base12[stepInOctave]}${isQuarter ? '+¼' : ''}${octave}`;
  } else {
    // General N-TET notation: e.g. §7 (441c)
    name = `§${stepInOctave} [${cents}c]`;
  }

  return { name, octave, cents, hz };
}

/**
 * Returns the default step range for the piano roll (typically 5 to 7 octaves).
 */
export function getDefaultPitchRange(tuning: TuningSystem): { minStep: number; maxStep: number; centerStep: number } {
  const N = tuning.divisionsPerOctave;
  // 5 octaves range centered on Octave 3-4
  const minStep = N * 2; // e.g. Octave 2
  const maxStep = N * 7; // e.g. Octave 7
  const centerStep = tuning.referenceNoteStep;
  return { minStep, maxStep, centerStep };
}
