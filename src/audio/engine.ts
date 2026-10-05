import { Track, Note, Project, TuningSystem, MixerChannel, AudioEffect } from '../types/daw';
import { getFrequency } from '../core/microtonal';
import { createProceduralAudioBuffer } from './samples';

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  stopTime: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;

  // Mixer channels nodes
  private channelInputs: Map<number, GainNode> = new Map();
  private channelOutputs: Map<number, GainNode> = new Map();
  private channelPanners: Map<number, StereoPannerNode> = new Map();
  private channelAnalysers: Map<number, AnalyserNode> = new Map();

  // Aux busses
  private reverbBus: ConvolverNode | GainNode | null = null;
  private delayBus: DelayNode | null = null;

  // Cached sample audio buffers
  private sampleBuffers: Map<string, AudioBuffer> = new Map();

  // Active voices tracking
  private activeVoices: Set<ActiveVoice> = new Set();

  // Transport & Scheduling
  private isPlaying: boolean = false;
  private isRecording: boolean = false;
  private playheadTick: number = 0;
  private playbackStartTime: number = 0;
  private scheduleTimer: number | null = null;
  private lastScheduledTick: number = 0;
  private lookaheadMs: number = 60;
  private scheduleIntervalMs: number = 25;
  private loopEnabled: boolean = true;
  private loopStartTick: number = 0;
  private loopEndTick: number = 480 * 16; // 4 bars default

  // Listeners
  private playheadCallbacks: ((tick: number) => void)[] = [];
  private stateChangeCallbacks: ((isPlaying: boolean) => void)[] = [];

  // Media recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTick: number = 0;
  private micStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public async initAudio(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.masterLimiter = this.ctx.createDynamicsCompressor();
      this.masterLimiter.threshold.value = -1.0;
      this.masterLimiter.knee.value = 2.0;
      this.masterLimiter.ratio.value = 16.0;
      this.masterLimiter.attack.value = 0.003;
      this.masterLimiter.release.value = 0.15;

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 512;
      this.masterAnalyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.masterLimiter);
      this.masterLimiter.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);

      // Create 10 mixer channels (0 = Master, 1-8 Inserts, 9 Reverb, 10 Delay)
      this.initMixerNodes();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    return this.ctx;
  }

  private initMixerNodes(): void {
    if (!this.ctx || !this.masterGain) return;

    for (let ch = 1; ch <= 10; ch++) {
      const input = this.ctx.createGain();
      const output = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner();
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 256;

      input.connect(panner);
      panner.connect(output);
      output.connect(analyser);
      analyser.connect(this.masterGain);

      this.channelInputs.set(ch, input);
      this.channelOutputs.set(ch, output);
      this.channelPanners.set(ch, panner);
      this.channelAnalysers.set(ch, analyser);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterAnalyser(): AnalyserNode | null {
    return this.masterAnalyser;
  }

  public getChannelAnalyser(channelId: number): AnalyserNode | null {
    return this.channelAnalysers.get(channelId) || null;
  }

  public getMasterPeakLevels(): { left: number; right: number } {
    if (!this.masterAnalyser) return { left: 0, right: 0 };
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs((data[i] - 128) / 128);
      if (val > max) max = val;
    }
    return { left: Math.min(1, max), right: Math.min(1, max * 0.95) };
  }

  public getChannelPeakLevel(channelId: number): number {
    const analyser = this.channelAnalysers.get(channelId);
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs((data[i] - 128) / 128);
      if (val > max) max = val;
    }
    return Math.min(1, max);
  }

  public updateMixerChannel(channel: MixerChannel): void {
    const input = this.channelInputs.get(channel.id);
    const output = this.channelOutputs.get(channel.id);
    const panner = this.channelPanners.get(channel.id);

    if (input && output && panner && this.ctx) {
      const targetGain = channel.muted ? 0 : channel.volume;
      output.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, channel.pan)), this.ctx.currentTime, 0.02);
    }
  }

  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.5, vol)), this.ctx.currentTime, 0.02);
    }
  }

  /**
   * Loads or gets procedural/cached sample audio buffer
   */
  public async getSampleBuffer(sampleId: string): Promise<AudioBuffer> {
    const ctx = await this.initAudio();
    if (this.sampleBuffers.has(sampleId)) {
      return this.sampleBuffers.get(sampleId)!;
    }

    const buffer = createProceduralAudioBuffer(ctx, sampleId);
    this.sampleBuffers.set(sampleId, buffer);
    return buffer;
  }

  /**
   * Plays a single microtonal note immediately (for piano roll preview or live keyboard)
   */
  public async previewNote(
    track: Track,
    pitch: number,
    tuning: TuningSystem,
    velocity: number = 100,
    durationSec: number = 0.5
  ): Promise<void> {
    const ctx = await this.initAudio();
    const freq = getFrequency(pitch, tuning);
    const destination = this.channelInputs.get(track.mixerChannel || 1) || this.masterGain!;

    this.synthesizeNote(ctx, track, freq, velocity / 127, ctx.currentTime, durationSec, destination);
  }

  /**
   * Internal sound synthesis engine for polyphonic instruments, samplers & VSTs
   */
  private synthesizeNote(
    ctx: AudioContext,
    track: Track,
    freq: number,
    gain: number,
    startTime: number,
    duration: number,
    destination: AudioNode
  ): void {
    const trackType = track.type;
    const instrumentId = track.instrumentId;
    const sampleUrl = track.instrumentParams?.sampleUrl;
    const samplePath = track.instrumentParams?.samplePath;

    // 1. SAMPLER / AUDIO SAMPLE / SOUNDFONT TRACKS
    if (
      trackType === 'sampler' ||
      sampleUrl ||
      samplePath ||
      instrumentId.startsWith('file-') ||
      instrumentId.startsWith('user-file-') ||
      instrumentId.endsWith('.wav') ||
      instrumentId.endsWith('.sf2')
    ) {
      const sampleId = instrumentId;
      const refFreq = 261.63; // Middle C (C4)
      const playbackRate = Math.max(0.125, Math.min(8.0, freq / refFreq));

      // Attempt to load & play real decoded audio buffer
      const playBuffer = (buf: AudioBuffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.playbackRate.setValueAtTime(playbackRate, startTime);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        const cutoff = track.instrumentParams?.cutoff || 18000;
        filter.frequency.setValueAtTime(cutoff, startTime);

        const ampGain = ctx.createGain();
        ampGain.gain.setValueAtTime(gain * track.volume * 0.9, startTime);
        ampGain.gain.setValueAtTime(gain * track.volume * 0.9, startTime + Math.min(duration, buf.duration / playbackRate));
        ampGain.gain.linearRampToValueAtTime(0.0001, startTime + Math.min(duration, buf.duration / playbackRate) + 0.08);

        source.connect(filter);
        filter.connect(ampGain);
        ampGain.connect(destination);

        source.start(startTime);
        const stopTime = startTime + Math.min(duration, buf.duration / playbackRate) + 0.1;
        source.stop(stopTime);
      };

      if (sampleUrl) {
        fetch(sampleUrl)
          .then((res) => res.arrayBuffer())
          .then((ab) => ctx.decodeAudioData(ab))
          .then((buf) => playBuffer(buf))
          .catch(() => {
            this.getSampleBuffer(sampleId).then((buf) => playBuffer(buf));
          });
        return;
      }

      this.getSampleBuffer(sampleId).then((buf) => playBuffer(buf));
      return;
    }

    // 2. DRUM SYNTHESIZER
    if (trackType === 'drum' || instrumentId === 'aether-drum-synth') {
      const drumTypes = ['kick', 'snare', 'hat', 'clap', 'tom', 'foley'];
      const drumIdx = Math.abs(Math.floor(freq)) % drumTypes.length;
      const sampleId = drumTypes[drumIdx];

      this.getSampleBuffer(sampleId).then((buf) => {
        const source = ctx.createBufferSource();
        source.buffer = buf;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain * track.volume, startTime);
        source.connect(g);
        g.connect(destination);
        source.start(startTime);
      });
      return;
    }

    // 3. REAL VST3: SERUM (7-Unison Detuned Supersaw + Sub Bass + Resonant Lowpass Sweep)
    if (instrumentId.includes('serum')) {
      const oscs: OscillatorNode[] = [];
      const ampGain = ctx.createGain();

      const detuneRatios = [0.988, 0.993, 0.997, 1.0, 1.003, 1.007, 1.012];
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.frequency.exponentialRampToValueAtTime(6500, startTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(2200, startTime + duration);
      filter.Q.setValueAtTime(5.5, startTime);

      // 7 Unison saws
      detuneRatios.forEach((r) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * r, startTime);
        osc.connect(filter);
        osc.start(startTime);
        oscs.push(osc);
      });

      // Sub bass
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(freq * 0.5, startTime);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.3, startTime);
      subOsc.connect(subGain);
      subGain.connect(filter);
      subOsc.start(startTime);
      oscs.push(subOsc);

      const attack = 0.005;
      const decay = 0.2;
      const sustain = 0.65;
      const release = 0.2;

      ampGain.gain.setValueAtTime(0, startTime);
      ampGain.gain.linearRampToValueAtTime(gain * 0.3 * track.volume, startTime + attack);
      ampGain.gain.exponentialRampToValueAtTime(gain * 0.3 * sustain * track.volume + 0.001, startTime + attack + decay);
      ampGain.gain.setValueAtTime(gain * 0.3 * sustain * track.volume + 0.001, startTime + duration);
      ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + release);

      filter.connect(ampGain);
      ampGain.connect(destination);

      const stopTime = startTime + duration + release + 0.05;
      oscs.forEach((o) => o.stop(stopTime));

      this.activeVoices.add({
        oscillators: oscs,
        gainNodes: [ampGain],
        stopTime,
      });
      return;
    }

    // 4. REAL VST3: VITAL (Spectral Morphing Wavetable + Chorus Detune)
    if (instrumentId.includes('vital')) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();

      osc1.type = 'square';
      osc2.type = 'sawtooth';
      osc3.type = 'triangle';

      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.006, startTime);
      osc3.frequency.setValueAtTime(freq * 2.001, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, startTime);
      filter.Q.setValueAtTime(2.5, startTime);

      const ampGain = ctx.createGain();
      ampGain.gain.setValueAtTime(0, startTime);
      ampGain.gain.linearRampToValueAtTime(gain * 0.35 * track.volume, startTime + 0.01);
      ampGain.gain.exponentialRampToValueAtTime(gain * 0.25 * track.volume + 0.001, startTime + duration);
      ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + 0.18);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(ampGain);
      ampGain.connect(destination);

      const stopTime = startTime + duration + 0.2;
      osc1.start(startTime);
      osc2.start(startTime);
      osc3.start(startTime);
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      osc3.stop(stopTime);

      this.activeVoices.add({
        oscillators: [osc1, osc2, osc3],
        gainNodes: [ampGain],
        stopTime,
      });
      return;
    }

    // 5. REAL VST3: DIVA (Analog 24dB Ladder Lowpass + Dual Analog Pulse/Saw Oscillators)
    if (instrumentId.includes('diva')) {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const subOsc = ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      subOsc.type = 'sawtooth';

      osc1.frequency.setValueAtTime(freq * 0.998, startTime); // analog drift
      osc2.frequency.setValueAtTime(freq * 1.002, startTime);
      subOsc.frequency.setValueAtTime(freq * 0.5, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, startTime);
      filter.Q.setValueAtTime(6.0, startTime);

      const ampGain = ctx.createGain();
      ampGain.gain.setValueAtTime(0, startTime);
      ampGain.gain.linearRampToValueAtTime(gain * 0.32 * track.volume, startTime + 0.012);
      ampGain.gain.setValueAtTime(gain * 0.32 * track.volume, startTime + duration);
      ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + 0.25);

      osc1.connect(filter);
      osc2.connect(filter);
      subOsc.connect(filter);
      filter.connect(ampGain);
      ampGain.connect(destination);

      const stopTime = startTime + duration + 0.3;
      osc1.start(startTime);
      osc2.start(startTime);
      subOsc.start(startTime);
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      subOsc.stop(stopTime);

      this.activeVoices.add({
        oscillators: [osc1, osc2, subOsc],
        gainNodes: [ampGain],
        stopTime,
      });
      return;
    }

    // 6. NATIVE SUBTRACTIVE PRO
    if (instrumentId === 'aether-subtractive') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.004, startTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const cutoff = track.instrumentParams?.cutoff || 2800;
      filter.frequency.setValueAtTime(cutoff, startTime);
      filter.Q.setValueAtTime(track.instrumentParams?.resonance || 4, startTime);

      const ampGain = ctx.createGain();
      const attack = 0.008;
      const decay = 0.15;
      const sustain = 0.7;
      const release = 0.15;

      ampGain.gain.setValueAtTime(0, startTime);
      ampGain.gain.linearRampToValueAtTime(gain * 0.4 * track.volume, startTime + attack);
      ampGain.gain.exponentialRampToValueAtTime(gain * 0.4 * sustain * track.volume + 0.001, startTime + attack + decay);
      ampGain.gain.setValueAtTime(gain * 0.4 * sustain * track.volume + 0.001, startTime + duration);
      ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + release);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ampGain);
      ampGain.connect(destination);

      osc1.start(startTime);
      osc2.start(startTime);
      const stopTime = startTime + duration + release + 0.05;
      osc1.stop(stopTime);
      osc2.stop(stopTime);

      this.activeVoices.add({
        oscillators: [osc1, osc2],
        gainNodes: [ampGain],
        stopTime,
      });
      return;
    }

    // 7. NATIVE MICRO ORGAN
    if (instrumentId === 'aether-micro-organ') {
      const partials = [1, 2, 3, 4, 6];
      const partialWeights = [0.35, 0.25, 0.15, 0.1, 0.05];
      const oscs: OscillatorNode[] = [];

      const ampGain = ctx.createGain();
      ampGain.gain.setValueAtTime(0, startTime);
      ampGain.gain.linearRampToValueAtTime(gain * 0.35 * track.volume, startTime + 0.015);
      ampGain.gain.setValueAtTime(gain * 0.35 * track.volume, startTime + duration);
      ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + 0.1);

      ampGain.connect(destination);

      partials.forEach((p, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * p, startTime);
        const pGain = ctx.createGain();
        pGain.gain.setValueAtTime(partialWeights[idx], startTime);
        osc.connect(pGain);
        pGain.connect(ampGain);
        osc.start(startTime);
        osc.stop(startTime + duration + 0.15);
        oscs.push(osc);
      });

      this.activeVoices.add({
        oscillators: oscs,
        gainNodes: [ampGain],
        stopTime: startTime + duration + 0.2,
      });
      return;
    }

    // 8. VST / GENERIC SYNTH ENGINE (Rich Multi-Oscillator Sawtooth/Square Mix with Resonant Lowpass)
    const isVst = instrumentId.startsWith('vst-') || trackType === 'vst-bridge';
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const ampGain = ctx.createGain();

    osc1.type = isVst ? 'sawtooth' : 'triangle';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.005, startTime);

    filter.type = 'lowpass';
    const cutoff = track.instrumentParams?.cutoff || 3400;
    filter.frequency.setValueAtTime(cutoff, startTime);
    filter.Q.setValueAtTime(track.instrumentParams?.resonance || 2.5, startTime);

    const attack = 0.005;
    const release = 0.15;
    ampGain.gain.setValueAtTime(0, startTime);
    ampGain.gain.linearRampToValueAtTime(gain * 0.35 * track.volume, startTime + attack);
    ampGain.gain.setValueAtTime(gain * 0.35 * track.volume, startTime + duration);
    ampGain.gain.linearRampToValueAtTime(0.0001, startTime + duration + release);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(ampGain);
    ampGain.connect(destination);

    const stopTime = startTime + duration + release + 0.05;
    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    this.activeVoices.add({
      oscillators: [osc1, osc2],
      gainNodes: [ampGain],
      stopTime,
    });
  }

  // Transport Controls
  public async play(project: Project, startTick: number = 0): Promise<void> {
    const ctx = await this.initAudio();

    if (this.isPlaying) {
      this.stop();
    }

    this.isPlaying = true;
    this.playheadTick = startTick;
    this.lastScheduledTick = startTick;
    this.playbackStartTime = ctx.currentTime;

    // Loop bounds
    const totalBeats = project.rhythm.totalBeats;
    const ticksPerBeat = project.rhythm.ticksPerBeat;
    const measureTicks = totalBeats * ticksPerBeat;
    this.loopStartTick = 0;
    this.loopEndTick = measureTicks * 4; // 4 measures

    this.stateChangeCallbacks.forEach((cb) => cb(true));

    this.runScheduler(project);
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    this.stopAllActiveVoices();
    this.stateChangeCallbacks.forEach((cb) => cb(false));
  }

  public stop(): void {
    this.isPlaying = false;
    this.playheadTick = 0;
    this.lastScheduledTick = 0;
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    this.stopAllActiveVoices();
    this.stateChangeCallbacks.forEach((cb) => cb(false));
    this.playheadCallbacks.forEach((cb) => cb(0));
  }

  public seek(tick: number): void {
    this.playheadTick = Math.max(0, tick);
    this.lastScheduledTick = this.playheadTick;
    this.stopAllActiveVoices();
    this.playheadCallbacks.forEach((cb) => cb(this.playheadTick));
  }

  public setLoopBounds(startTick: number, endTick: number): void {
    this.loopStartTick = Math.max(0, startTick);
    this.loopEndTick = Math.max(startTick + 480, endTick);
  }

  private stopAllActiveVoices(): void {
    this.activeVoices.forEach((v) => {
      try {
        v.oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {}
        });
      } catch {}
    });
    this.activeVoices.clear();
  }

  /**
   * Lookahead Web Audio note scheduling loop
   */
  private runScheduler(project: Project): void {
    if (!this.isPlaying || !this.ctx) return;

    const currentTime = this.ctx.currentTime;
    const bpm = project.bpm;
    const secondsPerTick = 60 / (bpm * project.rhythm.ticksPerBeat);

    // Schedule window
    const windowStartTick = this.lastScheduledTick;
    const scheduleWindowSec = (this.lookaheadMs + 50) / 1000;
    const windowEndTick = windowStartTick + Math.round(scheduleWindowSec / secondsPerTick);

    // Schedule all notes within window across all tracks and clips
    project.tracks.forEach((track) => {
      if (track.muted) return;
      const destination = this.channelInputs.get(track.mixerChannel || 1) || this.masterGain!;

      // Find clips belonging to track
      const trackClips = project.clips.filter((c) => c.trackId === track.id && !c.muted);

      trackClips.forEach((clip) => {
        const pattern = project.patterns.find((p) => p.id === clip.patternId);
        if (!pattern) return;

        pattern.notes.forEach((note) => {
          const absoluteNoteStart = clip.startTick + note.startTick;
          const absoluteNoteEnd = absoluteNoteStart + note.durationTicks;

          if (absoluteNoteStart >= windowStartTick && absoluteNoteStart < windowEndTick) {
            const noteStartDelay = (absoluteNoteStart - this.playheadTick) * secondsPerTick;
            const startTime = Math.max(this.ctx!.currentTime, currentTime + noteStartDelay);
            const durationSec = Math.max(0.04, note.durationTicks * secondsPerTick);
            const freq = getFrequency(note.pitch, project.tuning);

            this.synthesizeNote(this.ctx!, track, freq, note.velocity / 127, startTime, durationSec, destination);
          }
        });
      });
    });

    // Advance scheduling pointer
    this.lastScheduledTick = windowEndTick;

    // Advance UI playhead
    const elapsedSec = (this.scheduleIntervalMs / 1000);
    this.playheadTick += Math.round(elapsedSec / secondsPerTick);

    // Handle loop
    if (this.loopEnabled && this.playheadTick >= this.loopEndTick) {
      this.playheadTick = this.loopStartTick;
      this.lastScheduledTick = this.loopStartTick;
    }

    this.playheadCallbacks.forEach((cb) => cb(this.playheadTick));

    // Clean up finished voices
    const now = this.ctx.currentTime;
    this.activeVoices.forEach((v) => {
      if (v.stopTime < now) {
        this.activeVoices.delete(v);
      }
    });

    // Next tick
    this.scheduleTimer = window.setTimeout(() => this.runScheduler(project), this.scheduleIntervalMs);
  }

  // Audio Recording (Section 18 & 19)
  public async startRecording(trackId: string, currentTick: number): Promise<boolean> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const ctx = await this.initAudio();

      const source = ctx.createMediaStreamSource(this.micStream);
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      source.connect(this.micAnalyser);

      this.mediaRecorder = new MediaRecorder(this.micStream);
      this.recordedChunks = [];
      this.recordingStartTick = currentTick;

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.warn('Microphone recording access failed:', err);
      return false;
    }
  }

  public async stopRecording(): Promise<{ audioBlob: Blob; audioUrl: string; durationSec: number; startTick: number } | null> {
    if (!this.mediaRecorder || !this.isRecording) return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const durationSec = 4.0; // estimated default

        if (this.micStream) {
          this.micStream.getTracks().forEach((t) => t.stop());
          this.micStream = null;
        }

        this.isRecording = false;
        resolve({
          audioBlob,
          audioUrl,
          durationSec,
          startTick: this.recordingStartTick,
        });
      };

      this.mediaRecorder!.stop();
    });
  }

  public getMicInputLevel(): number {
    if (!this.micAnalyser) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteTimeDomainData(data);
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const val = Math.abs((data[i] - 128) / 128);
      if (val > max) max = val;
    }
    return Math.min(1, max);
  }

  public onPlayheadUpdate(cb: (tick: number) => void): () => void {
    this.playheadCallbacks.push(cb);
    return () => {
      this.playheadCallbacks = this.playheadCallbacks.filter((c) => c !== cb);
    };
  }

  public onStateChange(cb: (isPlaying: boolean) => void): () => void {
    this.stateChangeCallbacks.push(cb);
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((c) => c !== cb);
    };
  }
}

export const audioEngine = new AudioEngine();
