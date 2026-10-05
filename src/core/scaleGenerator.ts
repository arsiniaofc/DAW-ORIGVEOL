import { Scale, TuningSystem } from '../types/daw';
import { getFrequency } from './microtonal';

export interface ScaleGenParams {
  root: number;
  noteCount: number;
  density: number; // 0 to 1
  symmetry: boolean;
  consonanceTarget: number; // 0 to 100
  tensionTarget: number; // 0 to 100
  minInterval: number;
  maxInterval: number;
  algorithm: 'euclidean' | 'harmonic_entropy' | 'golden_ratio' | 'euler_lattice';
}

/**
 * Standard Björklund Euclidean rhythm / scale distribution algorithm.
 * Evenly spaces K pulses within N microtonal steps.
 */
function generateEuclideanSteps(k: number, n: number): number[] {
  if (k <= 0 || n <= 0) return [0];
  if (k >= n) return Array.from({ length: n }, (_, i) => i);

  let pattern: number[][] = [];
  for (let i = 0; i < n; i++) {
    pattern.push([i < k ? 1 : 0]);
  }

  let countZeroes = n - k;
  let countOnes = k;

  while (countZeroes > 0) {
    const minCount = Math.min(countOnes, countZeroes);
    for (let i = 0; i < minCount; i++) {
      pattern[i] = pattern[i].concat(pattern[pattern.length - 1 - i]);
    }
    pattern.splice(pattern.length - minCount, minCount);
    if (countOnes <= countZeroes) {
      countZeroes -= countOnes;
    } else {
      countOnes -= countZeroes;
      countZeroes = 0;
    }
  }

  const flattened: number[] = [];
  pattern.forEach((sub) => flattened.push(...sub));

  const steps: number[] = [];
  flattened.forEach((val, idx) => {
    if (val === 1) steps.push(idx);
  });

  return steps.length > 0 ? steps : [0];
}

/**
 * Golden ratio modular progression: step = round(i * phi * N) mod N
 */
function generateGoldenRatioSteps(k: number, n: number): number[] {
  const phi = (Math.sqrt(5) - 1) / 2; // ~0.6180339887
  const set = new Set<number>();
  set.add(0);

  let current = 0;
  for (let i = 1; i < k; i++) {
    current = (current + Math.round(phi * n)) % n;
    set.add(current);
  }

  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Harmonic Entropy based scale selection:
 * Prioritizes intervals that approximate pure low-order ratios (3:2, 4:3, 5:4, 6:5, 7:4, 8:5).
 */
function generateHarmonicEntropySteps(k: number, n: number, tuning: TuningSystem): number[] {
  const pureRatios = [3 / 2, 4 / 3, 5 / 4, 6 / 5, 5 / 3, 7 / 4, 9 / 8, 7 / 5, 8 / 5, 11 / 8];
  const stepScores: { step: number; score: number }[] = [];

  for (let step = 1; step < n; step++) {
    const ratio = Math.pow(2, step / n);
    // Find closest pure ratio
    let minErr = 999;
    for (const pure of pureRatios) {
      const err = Math.abs(Math.log2(ratio) - Math.log2(pure));
      if (err < minErr) minErr = err;
    }
    // Score is higher if interval is consonant (low harmonic error)
    stepScores.push({ step, score: 1 / (minErr + 0.02) });
  }

  // Sort best intervals
  stepScores.sort((a, b) => b.score - a.score);

  const steps = [0];
  for (let i = 0; i < Math.min(k - 1, stepScores.length); i++) {
    steps.push(stepScores[i].step);
  }

  return steps.sort((a, b) => a - b);
}

/**
 * Euler prime lattice (factors of 2, 3, 5, 7) mapped into N-TET
 */
function generateEulerLatticeSteps(k: number, n: number): number[] {
  const stepsSet = new Set<number>();
  stepsSet.add(0);

  // Approximate pure fifth (3:2) and pure third (5:4) in N-TET
  const fifthStep = Math.round(n * Math.log2(3 / 2));
  const thirdStep = Math.round(n * Math.log2(5 / 4));
  const seventhStep = Math.round(n * Math.log2(7 / 4));

  const generators = [fifthStep, thirdStep, seventhStep];

  for (let cycle = 0; stepsSet.size < k && cycle < 20; cycle++) {
    for (const gen of generators) {
      if (stepsSet.size >= k) break;
      const stepToAdd = ((gen * (cycle + 1)) % n + n) % n;
      stepsSet.add(stepToAdd);
    }
  }

  return Array.from(stepsSet).sort((a, b) => a - b);
}

/**
 * Calculates consonant/tension rating of a set of scale steps.
 */
export function evaluateScaleAcoustics(steps: number[], tuning: TuningSystem): { consonance: number; tension: number } {
  const N = tuning.divisionsPerOctave;
  let totalConsonance = 0;
  let totalTension = 0;
  let count = 0;

  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const diff = Math.abs(steps[j] - steps[i]);
      const cents = (diff / N) * 1200;
      // High consonance around unisons, octaves (1200c), fifths (700c), fourths (500c), thirds (400c, 300c)
      const fifthDist = Math.abs(cents - 702);
      const fourthDist = Math.abs(cents - 498);
      const majorThirdDist = Math.abs(cents - 386);

      if (fifthDist < 40) totalConsonance += 100 - fifthDist * 2;
      else if (fourthDist < 40) totalConsonance += 90 - fourthDist * 2;
      else if (majorThirdDist < 40) totalConsonance += 85 - majorThirdDist * 2;
      else if (cents > 80 && cents < 160) totalTension += 90; // Minor second / rough dissonance
      else if (cents > 550 && cents < 650) totalTension += 80; // Tritone / tension

      count++;
    }
  }

  const consonance = count > 0 ? Math.min(100, Math.max(10, Math.round(totalConsonance / count + 35))) : 50;
  const tension = count > 0 ? Math.min(100, Math.max(5, Math.round(totalTension / count + 15))) : 40;

  return { consonance, tension };
}

/**
 * Main procedural scale generator.
 */
export function generateProceduralScale(params: ScaleGenParams, tuning: TuningSystem): Scale {
  const N = tuning.divisionsPerOctave;
  const k = Math.min(N, Math.max(3, params.noteCount));

  let rawSteps: number[] = [0];

  switch (params.algorithm) {
    case 'euclidean':
      rawSteps = generateEuclideanSteps(k, N);
      break;
    case 'golden_ratio':
      rawSteps = generateGoldenRatioSteps(k, N);
      break;
    case 'harmonic_entropy':
      rawSteps = generateHarmonicEntropySteps(k, N, tuning);
      break;
    case 'euler_lattice':
      rawSteps = generateEulerLatticeSteps(k, N);
      break;
  }

  // Filter or enforce minInterval & maxInterval
  const filteredSteps: number[] = [0];
  for (let i = 1; i < rawSteps.length; i++) {
    const prev = filteredSteps[filteredSteps.length - 1];
    const diff = rawSteps[i] - prev;
    if (diff >= params.minInterval && diff <= params.maxInterval) {
      filteredSteps.push(rawSteps[i]);
    }
  }

  let finalSteps = filteredSteps.length >= 3 ? filteredSteps : rawSteps;

  if (params.symmetry) {
    // Mirror the interval structure around half-octave
    const half = Math.floor(N / 2);
    const symmetricSet = new Set<number>(finalSteps);
    finalSteps.forEach((s) => {
      symmetricSet.add((N - s) % N);
    });
    finalSteps = Array.from(symmetricSet).sort((a, b) => a - b);
  }

  const { consonance, tension } = evaluateScaleAcoustics(finalSteps, tuning);

  const algorithmNames: Record<string, string> = {
    euclidean: 'Euclidean Maximally-Even',
    harmonic_entropy: 'Harmonic Minimal Entropy',
    golden_ratio: 'Golden Section (φ)',
    euler_lattice: 'Euler Prime Tonnetz',
  };

  return {
    id: `scale-proc-${Date.now().toString(36)}`,
    name: `Procedural ${algorithmNames[params.algorithm]} (${finalSteps.length} Notes in ${N}-TET)`,
    root: params.root % N,
    steps: finalSteps,
    density: finalSteps.length / N,
    consonance,
    tension,
    algorithm: params.algorithm,
  };
}

/**
 * Snaps a given pitch step to the nearest active scale degree.
 */
export function snapPitchToScale(pitch: number, scale: Scale, divisionsPerOctave: number): number {
  if (!scale || !scale.steps || scale.steps.length === 0) return pitch;

  const N = divisionsPerOctave;
  const octave = Math.floor(pitch / N);
  const stepInOctave = ((pitch % N) + N) % N;

  // Convert scale relative steps to absolute positions in octave
  const scalePositions = scale.steps.map((s) => (s + scale.root) % N);

  // Find the closest scale degree
  let closest = scalePositions[0];
  let minDiff = 9999;

  for (const pos of scalePositions) {
    const diff = Math.min(Math.abs(stepInOctave - pos), Math.abs(stepInOctave - (pos + N)), Math.abs(stepInOctave - (pos - N)));
    if (diff < minDiff) {
      minDiff = diff;
      closest = pos;
    }
  }

  return octave * N + closest;
}

/**
 * Checks if a step in an octave is part of the scale.
 */
export function isStepInScale(stepInOctave: number, scale: Scale, divisionsPerOctave: number): boolean {
  if (!scale || !scale.steps) return true;
  const normalizedStep = ((stepInOctave % divisionsPerOctave) + divisionsPerOctave) % divisionsPerOctave;
  const scalePositions = scale.steps.map((s) => ((s + scale.root) % divisionsPerOctave + divisionsPerOctave) % divisionsPerOctave);
  return scalePositions.includes(normalizedStep);
}
