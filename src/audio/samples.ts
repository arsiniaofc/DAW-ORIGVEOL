/**
 * Generates high-quality offline procedural audio buffers for drums and microtonal textures
 * so the DAW works 100% offline without needing any external network assets.
 */

export function createProceduralAudioBuffer(
  ctx: AudioContext,
  sampleId: string
): AudioBuffer {
  const sampleRate = ctx.sampleRate;

  if (sampleId.includes('kick')) {
    // 808 / 909 Sub Kick
    const duration = sampleId.includes('909') ? 0.35 : 0.7;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const startFreq = sampleId.includes('909') ? 160 : 120;
    const endFreq = 42;
    const decayTime = duration * 0.8;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const progress = t / decayTime;
      const freq = endFreq + (startFreq - endFreq) * Math.exp(-progress * 8);
      const amp = Math.max(0, 1 - progress) * (1 - Math.exp(-t * 80));
      // Subtle click transient at start
      const click = t < 0.005 ? Math.sin(t * 2000 * Math.PI) * 0.5 : 0;
      const sample = (Math.sin(2 * Math.PI * freq * t) + click) * amp;
      left[i] = sample;
      right[i] = sample;
    }
    return buffer;
  }

  if (sampleId.includes('snare') || sampleId.includes('clap') || sampleId.includes('rim')) {
    // Noise + Tone Snare
    const duration = 0.35;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t * 25);
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12);
      const sample = (tone * 0.4 + noise * 0.6) * 0.9;
      left[i] = sample;
      right[i] = sample * 0.95; // subtle stereo width
    }
    return buffer;
  }

  if (sampleId.includes('hat') || sampleId.includes('ride') || sampleId.includes('crash')) {
    // Metallic Cymbals / Hats
    const duration = sampleId.includes('crash') ? 2.0 : sampleId.includes('ride') ? 1.0 : 0.15;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const decay = sampleId.includes('crash') ? 2.5 : sampleId.includes('open') ? 8 : 35;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Six metallic square wave oscillators
      const osc1 = Math.sin(2 * Math.PI * 2053 * t) > 0 ? 1 : -1;
      const osc2 = Math.sin(2 * Math.PI * 3450 * t) > 0 ? 1 : -1;
      const osc3 = Math.sin(2 * Math.PI * 4120 * t) > 0 ? 1 : -1;
      const osc4 = Math.sin(2 * Math.PI * 5340 * t) > 0 ? 1 : -1;
      const metallic = (osc1 + osc2 + osc3 + osc4) * 0.25;
      const noise = Math.random() * 2 - 1;
      const sample = (metallic * 0.6 + noise * 0.4) * Math.exp(-t * decay);
      left[i] = sample * 0.7;
      right[i] = sample * 0.75;
    }
    return buffer;
  }

  // Microtonal harmonic drone / ambient texture
  const duration = 3.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const f0 = 138.59; // C#3
  const ratio = sampleId.includes('19tet') ? Math.pow(2, 11 / 19) : Math.pow(2, 7 / 12); // Microtonal fifth

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.sin((t / duration) * Math.PI);
    const s1 = Math.sin(2 * Math.PI * f0 * t);
    const s2 = Math.sin(2 * Math.PI * f0 * ratio * t + 0.3) * 0.8;
    const s3 = Math.sin(2 * Math.PI * f0 * 2 * ratio * t + 0.7) * 0.4;
    const sample = (s1 + s2 + s3) * 0.3 * env;
    left[i] = sample;
    right[i] = sample * 0.9;
  }
  return buffer;
}
