import { Note, Clip, Project, SnapValue, TuningSystem, RhythmStructure, Scale } from '../types/daw';
import { snapTick } from './rhythm';
import { snapPitchToScale } from './scaleGenerator';

export interface ClipboardData {
  type: 'notes' | 'clips';
  sourceTrackId: string;
  notes?: Note[];
  clips?: Clip[];
  minStartTick: number;
}

export class EditorCore {
  private clipboard: ClipboardData | null = null;
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  private maxHistory: number = 50;

  // History / Undo-Redo
  public recordSnapshot(project: Project): void {
    // Deep clone state
    const snapshot = JSON.parse(JSON.stringify(project));
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // clear redo on new action
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(currentProject: Project): Project | null {
    if (this.undoStack.length === 0) return null;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(currentProject)));
    return previous;
  }

  public redo(currentProject: Project): Project | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(currentProject)));
    return next;
  }

  // Clipboard operations for Notes
  public copyNotes(notes: Note[], sourceTrackId: string): void {
    if (notes.length === 0) return;
    const minStart = Math.min(...notes.map((n) => n.startTick));
    this.clipboard = {
      type: 'notes',
      sourceTrackId,
      notes: JSON.parse(JSON.stringify(notes)),
      minStartTick: minStart,
    };
  }

  public getClipboard(): ClipboardData | null {
    return this.clipboard;
  }

  public hasNotesInClipboard(): boolean {
    return this.clipboard !== null && this.clipboard.type === 'notes' && (this.clipboard.notes?.length || 0) > 0;
  }

  /**
   * Paste notes with mode:
   * - 'original': maintains original tick position
   * - 'cursor': starts at playhead tick
   * - 'relative': offset relative to a target tick
   */
  public pasteNotes(
    mode: 'original' | 'cursor' | 'relative',
    cursorTick: number = 0,
    targetTrackId?: string
  ): Note[] {
    if (!this.clipboard || this.clipboard.type !== 'notes' || !this.clipboard.notes) {
      return [];
    }

    const { notes, minStartTick } = this.clipboard;
    const baseOffset = mode === 'original' ? 0 : cursorTick - minStartTick;

    return notes.map((note) => {
      const newStart = Math.max(0, note.startTick + (mode === 'original' ? 0 : baseOffset));
      return {
        ...note,
        id: `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
        startTick: newStart,
        selected: true,
      };
    });
  }

  /**
   * Duplicates selected notes into another track or same track
   */
  public duplicateNotes(notes: Note[], offsetTicks: number = 0): Note[] {
    return notes.map((note) => ({
      ...note,
      id: `note-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      startTick: Math.max(0, note.startTick + offsetTicks),
      selected: true,
    }));
  }

  // Note Transformations (Microtonal-aware)
  public transposeOctave(notes: Note[], octaves: number, tuning: TuningSystem): Note[] {
    const deltaSteps = octaves * tuning.divisionsPerOctave;
    return notes.map((n) => ({
      ...n,
      pitch: Math.max(0, n.pitch + deltaSteps),
    }));
  }

  public transposeSteps(notes: Note[], steps: number): Note[] {
    return notes.map((n) => ({
      ...n,
      pitch: Math.max(0, n.pitch + steps),
    }));
  }

  public quantizeNotes(notes: Note[], snap: SnapValue, rhythm: RhythmStructure): Note[] {
    return notes.map((n) => {
      const snappedStart = snapTick(n.startTick, snap, rhythm);
      return {
        ...n,
        startTick: snappedStart,
      };
    });
  }

  public stretchNotes(notes: Note[], factor: number): Note[] {
    if (notes.length === 0 || factor <= 0) return notes;
    const minStart = Math.min(...notes.map((n) => n.startTick));

    return notes.map((n) => {
      const relativeStart = n.startTick - minStart;
      const newRelativeStart = Math.round(relativeStart * factor);
      const newDuration = Math.max(15, Math.round(n.durationTicks * factor));
      return {
        ...n,
        startTick: minStart + newRelativeStart,
        durationTicks: newDuration,
      };
    });
  }

  public reverseNotes(notes: Note[]): Note[] {
    if (notes.length <= 1) return notes;
    const minStart = Math.min(...notes.map((n) => n.startTick));
    const maxEnd = Math.max(...notes.map((n) => n.startTick + n.durationTicks));

    return notes.map((n) => {
      const originalEnd = n.startTick + n.durationTicks;
      const reversedStart = minStart + (maxEnd - originalEnd);
      return {
        ...n,
        startTick: Math.max(0, reversedStart),
      };
    });
  }

  public randomizeNotes(
    notes: Note[],
    options: { pitch?: boolean; velocity?: boolean; timing?: boolean },
    tuning: TuningSystem,
    scale?: Scale
  ): Note[] {
    const N = tuning.divisionsPerOctave;

    return notes.map((n) => {
      let pitch = n.pitch;
      let velocity = n.velocity;
      let startTick = n.startTick;

      if (options.pitch) {
        // Random step offset within -3 to +3 steps
        const offset = Math.floor(Math.random() * 7) - 3;
        pitch = Math.max(0, pitch + offset);
        if (scale) {
          pitch = snapPitchToScale(pitch, scale, N);
        }
      }

      if (options.velocity) {
        // Humanize velocity ±15
        const velOffset = Math.floor(Math.random() * 31) - 15;
        velocity = Math.min(127, Math.max(10, velocity + velOffset));
      }

      if (options.timing) {
        // Subtle micro-timing swing/jitter ±15 ticks
        const timeOffset = Math.floor(Math.random() * 31) - 15;
        startTick = Math.max(0, startTick + timeOffset);
      }

      return { ...n, pitch, velocity, startTick };
    });
  }

  public adjustVelocity(notes: Note[], delta: number): Note[] {
    return notes.map((n) => ({
      ...n,
      velocity: Math.min(127, Math.max(1, n.velocity + delta)),
    }));
  }

  public adjustDuration(notes: Note[], deltaTicks: number): Note[] {
    return notes.map((n) => ({
      ...n,
      durationTicks: Math.max(30, n.durationTicks + deltaTicks),
    }));
  }
}

export const editorCore = new EditorCore();
