import { RhythmStructure, SnapValue } from '../types/daw';

export const TICKS_PER_BEAT = 480; // Standard MIDI PPQ
export const SUBDIVISIONS_PER_BEAT = 4; // 16th note steps (120 ticks each)
export const TICKS_PER_STEP = TICKS_PER_BEAT / SUBDIVISIONS_PER_BEAT; // 120 ticks

export const PRESET_RHYTHMS: { name: string; groups: number[]; description: string }[] = [
  { name: 'Standard 4/4 [4, 4]', groups: [4, 4], description: '8 beats divided into two groups of 4 beats.' },
  { name: 'Compound Additive [4, 4, 3, 3]', groups: [4, 4, 3, 3], description: '14-beat irregular compound cycle (4+4+3+3).' },
  { name: 'Dave Brubeck Turkish [3, 2, 2, 3]', groups: [3, 2, 2, 3], description: '10-beat aksak rhythm (3+2+2+3).' },
  { name: 'Balkan 13/8 [5, 5, 3]', groups: [5, 5, 3], description: '13-beat asymmetric folk rhythm.' },
  { name: 'Flamenco Bulería [7, 5]', groups: [7, 5], description: '12-beat compás split into 7+5.' },
  { name: 'Waltz / Triple [3, 3]', groups: [3, 3], description: '6-beat compound triple meter.' },
  { name: 'Fast 7/8 [2, 2, 3]', groups: [2, 2, 3], description: '7-beat asymmetric dance meter.' },
  { name: 'Kalamatianos [3, 2, 2]', groups: [3, 2, 2], description: '7-beat Greek traditional groove.' },
  { name: 'Ultra-Compound [4, 3, 4, 3]', groups: [4, 3, 4, 3], description: '14-beat alternating syncopated cycle.' },
];

/**
 * Creates a rhythm structure from an array of group sizes.
 */
export function createRhythmStructure(groups: number[], name?: string): RhythmStructure {
  const safeGroups = groups.length > 0 ? groups.map((g) => Math.max(1, Math.min(16, g))) : [4, 4];
  const totalBeats = safeGroups.reduce((acc, val) => acc + val, 0);

  return {
    groups: safeGroups,
    totalBeats,
    subdivisionsPerBeat: SUBDIVISIONS_PER_BEAT,
    ticksPerBeat: TICKS_PER_BEAT,
    name: name || `[${safeGroups.join(', ')}]`,
  };
}

/**
 * Total ticks per measure (one full cycle of the compound rhythm structure).
 */
export function getTicksPerMeasure(rhythm: RhythmStructure): number {
  return rhythm.totalBeats * rhythm.ticksPerBeat;
}

/**
 * Information about a beat in the compound meter.
 */
export interface BeatInfo {
  beatIndexInMeasure: number;
  groupIndex: number;
  beatInGroup: number;
  groupSize: number;
  isGroupStart: boolean;
  isMeasureStart: boolean;
  tickInMeasure: number;
}

/**
 * Returns structural information for a given global tick.
 */
export function getTickRhythmInfo(tick: number, rhythm: RhythmStructure): {
  measureIndex: number;
  tickInMeasure: number;
  beatInfo: BeatInfo;
} {
  const ticksPerMeasure = getTicksPerMeasure(rhythm);
  const measureIndex = Math.max(0, Math.floor(tick / ticksPerMeasure));
  const tickInMeasure = ((tick % ticksPerMeasure) + ticksPerMeasure) % ticksPerMeasure;

  const beatIndexInMeasure = Math.floor(tickInMeasure / rhythm.ticksPerBeat);

  let accumulated = 0;
  let groupIndex = 0;
  let beatInGroup = 0;
  let groupSize = rhythm.groups[0] || 4;
  let isGroupStart = false;

  for (let i = 0; i < rhythm.groups.length; i++) {
    const size = rhythm.groups[i];
    if (beatIndexInMeasure < accumulated + size) {
      groupIndex = i;
      beatInGroup = beatIndexInMeasure - accumulated;
      groupSize = size;
      isGroupStart = beatInGroup === 0 && tickInMeasure % rhythm.ticksPerBeat === 0;
      break;
    }
    accumulated += size;
  }

  const isMeasureStart = tickInMeasure === 0;

  return {
    measureIndex,
    tickInMeasure,
    beatInfo: {
      beatIndexInMeasure,
      groupIndex,
      beatInGroup,
      groupSize,
      isGroupStart,
      isMeasureStart,
      tickInMeasure,
    },
  };
}

/**
 * Generates an array of all group boundary tick positions within a measure.
 */
export function getGroupBoundaryTicksInMeasure(rhythm: RhythmStructure): number[] {
  const boundaries: number[] = [0];
  let accumulatedBeats = 0;

  for (let i = 0; i < rhythm.groups.length; i++) {
    accumulatedBeats += rhythm.groups[i];
    boundaries.push(accumulatedBeats * rhythm.ticksPerBeat);
  }

  return boundaries;
}

/**
 * Snaps a tick to the current snap setting, fully respecting the compound rhythm groups!
 */
export function snapTick(tick: number, snap: SnapValue, rhythm: RhythmStructure): number {
  if (snap === 'none' || tick <= 0) return Math.max(0, tick);

  const ticksPerMeasure = getTicksPerMeasure(rhythm);
  const measureIdx = Math.floor(tick / ticksPerMeasure);
  const tickInMeasure = tick % ticksPerMeasure;

  if (snap === 'bar') {
    const measureProgress = tickInMeasure / ticksPerMeasure;
    return measureProgress > 0.5 ? (measureIdx + 1) * ticksPerMeasure : measureIdx * ticksPerMeasure;
  }

  if (snap === 'group') {
    // Find closest group boundary
    const groupTicks = getGroupBoundaryTicksInMeasure(rhythm);
    let closestGroupTick = groupTicks[0];
    let minDiff = 9999999;

    for (const gTick of groupTicks) {
      const diff = Math.abs(tickInMeasure - gTick);
      if (diff < minDiff) {
        minDiff = diff;
        closestGroupTick = gTick;
      }
    }
    return Math.max(0, measureIdx * ticksPerMeasure + closestGroupTick);
  }

  if (snap === 'beat') {
    const beatTicks = rhythm.ticksPerBeat;
    const roundedBeat = Math.round(tickInMeasure / beatTicks);
    return Math.max(0, measureIdx * ticksPerMeasure + roundedBeat * beatTicks);
  }

  let stepFractionTicks = TICKS_PER_STEP; // default 1/16th (120 ticks)
  if (snap === '1/2') stepFractionTicks = rhythm.ticksPerBeat / 2;
  else if (snap === '1/4') stepFractionTicks = rhythm.ticksPerBeat / 4;
  else if (snap === '1/8') stepFractionTicks = rhythm.ticksPerBeat / 8;
  else if (snap === 'step') stepFractionTicks = TICKS_PER_STEP;

  return Math.max(0, Math.round(tick / stepFractionTicks) * stepFractionTicks);
}
