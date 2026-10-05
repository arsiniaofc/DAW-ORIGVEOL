import { TuningSystem, Note } from '../types/daw';
import { getFrequency } from '../core/microtonal';

// Minimal Web MIDI API type declarations
interface MidiMessageEventLike {
  data: Uint8Array | number[];
}

interface MidiPortLike {
  id: string;
  name?: string;
  manufacturer?: string;
  state: string;
}

interface MidiInputLike extends MidiPortLike {
  onmidimessage: ((event: MidiMessageEventLike) => void) | null;
}

interface MidiOutputLike extends MidiPortLike {
  send(data: number[] | Uint8Array, timestamp?: number): void;
}

interface MidiAccessLike {
  inputs: Map<string, MidiInputLike>;
  outputs: Map<string, MidiOutputLike>;
  onstatechange: (() => void) | null;
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer?: string;
  state: string;
  type: 'input' | 'output';
}

export type MicrotonalBridgeMode = 'mpe' | 'channel_pitchbend' | 'direct_hz' | 'quantized_12tet';

export interface PluginCompatibilityReport {
  pluginId: string;
  name: string;
  format: 'VST3' | 'VST2' | 'Native';
  mpeSupported: boolean;
  polyPitchSupported: boolean;
  recommendedMode: MicrotonalBridgeMode;
  canReproduceTuning: boolean;
  statusText: string;
}

export class MidiEngine {
  private midiAccess: MidiAccessLike | null = null;
  private inputs: Map<string, MidiInputLike> = new Map();
  private outputs: Map<string, MidiOutputLike> = new Map();
  private noteOnCallbacks: ((pitch: number, velocity: number) => void)[] = [];
  private noteOffCallbacks: ((pitch: number) => void)[] = [];
  private activeChannelAllocations: Map<number, number> = new Map(); // pitch -> channel (1-16)

  public async initialize(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !(navigator as any).requestMIDIAccess) {
      console.warn('Web MIDI API not available in this browser environment.');
      return false;
    }

    try {
      this.midiAccess = (await (navigator as any).requestMIDIAccess({ sysex: false })) as MidiAccessLike;
      this.refreshDevices();
      this.midiAccess.onstatechange = () => this.refreshDevices();
      return true;
    } catch (err) {
      console.warn('MIDI access request was denied or unavailable:', err);
      return false;
    }
  }

  private refreshDevices(): void {
    if (!this.midiAccess) return;
    this.inputs.clear();
    this.outputs.clear();

    this.midiAccess.inputs.forEach((input: MidiInputLike) => {
      this.inputs.set(input.id, input);
      input.onmidimessage = (event: MidiMessageEventLike) => this.handleMidiMessage(event);
    });

    this.midiAccess.outputs.forEach((output: MidiOutputLike) => {
      this.outputs.set(output.id, output);
    });
  }

  public getAvailableInputs(): MidiDevice[] {
    const list: MidiDevice[] = [];
    this.inputs.forEach((input: MidiInputLike) => {
      list.push({
        id: input.id,
        name: input.name || 'Unnamed MIDI Input',
        manufacturer: input.manufacturer,
        state: input.state,
        type: 'input',
      });
    });
    return list;
  }

  public getAvailableOutputs(): MidiDevice[] {
    const list: MidiDevice[] = [];
    this.outputs.forEach((output: MidiOutputLike) => {
      list.push({
        id: output.id,
        name: output.name || 'Unnamed MIDI Output',
        manufacturer: output.manufacturer,
        state: output.state,
        type: 'output',
      });
    });
    return list;
  }

  private handleMidiMessage(event: MidiMessageEventLike): void {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];

    if (status === 0x90 && velocity > 0) {
      this.noteOnCallbacks.forEach((cb) => cb(note, velocity));
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.noteOffCallbacks.forEach((cb) => cb(note));
    }
  }

  public onNoteOn(cb: (pitch: number, velocity: number) => void): () => void {
    this.noteOnCallbacks.push(cb);
    return () => {
      this.noteOnCallbacks = this.noteOnCallbacks.filter((c) => c !== cb);
    };
  }

  public onNoteOff(cb: (pitch: number) => void): () => void {
    this.noteOffCallbacks.push(cb);
    return () => {
      this.noteOffCallbacks = this.noteOffCallbacks.filter((c) => c !== cb);
    };
  }

  /**
   * Microtonal Bridge:
   * Converts a microtonal step in any N-TET into:
   * 1. Target exact frequency in Hz
   * 2. Nearest standard MIDI note (0-127)
   * 3. Pitch bend offset in cents (-100 to +100 cents)
   * 4. 14-bit MIDI pitch bend word (0 to 16383, center 8192)
   */
  public calculateMicrotonalMidiOffset(step: number, tuning: TuningSystem): {
    exactHz: number;
    nearest12TetNote: number;
    centsOffset: number;
    pitchBend14Bit: number;
  } {
    const exactHz = getFrequency(step, tuning);

    // Standard 12-TET A4 = 440 Hz -> note 69
    const exactMidiFloating = 69 + 12 * Math.log2(exactHz / 440);
    const nearest12TetNote = Math.round(exactMidiFloating);
    const centsOffset = (exactMidiFloating - nearest12TetNote) * 100;

    // Pitch bend range (assuming ±2 semitones = ±200 cents standard)
    // 8192 is center (0 bend), 16383 is +200 cents, 0 is -200 cents
    const semitonesOffset = centsOffset / 100;
    const bendNormalized = Math.max(-1, Math.min(1, semitonesOffset / 2));
    const pitchBend14Bit = Math.round(8192 + bendNormalized * 8191);

    return {
      exactHz,
      nearest12TetNote: Math.max(0, Math.min(127, nearest12TetNote)),
      centsOffset: Math.round(centsOffset * 10) / 10,
      pitchBend14Bit: Math.max(0, Math.min(16383, pitchBend14Bit)),
    };
  }

  /**
   * Inspects plugin capability and returns an honest compatibility report (Section 15)
   */
  public inspectPluginCompatibility(plugin: {
    id: string;
    name: string;
    format: 'VST3' | 'VST2' | 'Native';
    mpeSupported: boolean;
    polyPitchSupported: boolean;
    microtonalTuning: string;
  }, tuning: TuningSystem): PluginCompatibilityReport {
    if (plugin.format === 'Native') {
      return {
        pluginId: plugin.id,
        name: plugin.name,
        format: plugin.format,
        mpeSupported: true,
        polyPitchSupported: true,
        recommendedMode: 'direct_hz',
        canReproduceTuning: true,
        statusText: `Native DSP engine directly synthesizes exact microtonal frequencies for ${tuning.divisionsPerOctave}-TET without approximation.`,
      };
    }

    if (plugin.mpeSupported) {
      return {
        pluginId: plugin.id,
        name: plugin.name,
        format: plugin.format,
        mpeSupported: true,
        polyPitchSupported: true,
        recommendedMode: 'mpe',
        canReproduceTuning: true,
        statusText: `MPE Enabled: Polyphonic pitch expression sends precise microtonal pitch bends per note on dedicated channels.`,
      };
    }

    if (plugin.polyPitchSupported) {
      return {
        pluginId: plugin.id,
        name: plugin.name,
        format: plugin.format,
        mpeSupported: false,
        polyPitchSupported: true,
        recommendedMode: 'channel_pitchbend',
        canReproduceTuning: true,
        statusText: `Channel-Pitchbend Mode: Distributes polyphony across MIDI channels 1-16 with per-channel pitch bend.`,
      };
    }

    // Unsupported plugin
    return {
      pluginId: plugin.id,
      name: plugin.name,
      format: plugin.format,
      mpeSupported: false,
      polyPitchSupported: false,
      recommendedMode: 'quantized_12tet',
      canReproduceTuning: false,
      statusText: `⚠ This plugin cannot reproduce the current microtonal tuning (${tuning.divisionsPerOctave}-TET). Using Quantized 12-TET Compatibility Mode.`,
    };
  }
}

export const midiEngine = new MidiEngine();
