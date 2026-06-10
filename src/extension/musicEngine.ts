export type MusicMood = 'map' | 'battle' | 'encounter' | 'evolution' | 'victory' | 'danger';

type Track = {
  label: string;
  bpm: number;
  wave: OscillatorType;
  melody: number[];
  bass: number[];
};

const REST = 0;

const TRACKS: Record<MusicMood, Track> = {
  map: {
    label: 'Map march',
    bpm: 132,
    wave: 'square',
    melody: [72, 76, 79, 76, 74, 76, 81, 79, 72, 76, 79, 84, 83, 79, 76, 74],
    bass: [48, REST, 55, REST, 50, REST, 57, REST],
  },
  battle: {
    label: 'Battle pulse',
    bpm: 176,
    wave: 'sawtooth',
    melody: [67, 67, 70, 67, 72, 70, 67, 65, 67, 67, 75, 74, 72, 70, 69, 70],
    bass: [43, 43, 50, 43, 46, 46, 53, 46],
  },
  encounter: {
    label: 'Encounter bounce',
    bpm: 146,
    wave: 'square',
    melody: [76, REST, 79, 81, 79, REST, 76, 74, 72, REST, 74, 76, 79, 76, 74, REST],
    bass: [48, 55, 52, 55],
  },
  evolution: {
    label: 'Evolution rise',
    bpm: 118,
    wave: 'triangle',
    melody: [60, 64, 67, 72, 64, 67, 72, 76, 67, 72, 76, 79, 72, 76, 79, 84],
    bass: [48, REST, 52, REST, 55, REST, 60, REST],
  },
  victory: {
    label: 'Victory fanfare',
    bpm: 150,
    wave: 'square',
    melody: [72, 76, 79, 84, 79, 84, 88, REST, 86, 84, 81, 84, 79, REST, 76, REST],
    bass: [48, 55, 60, 55],
  },
  danger: {
    label: 'Danger low HP',
    bpm: 162,
    wave: 'square',
    melody: [67, REST, 66, REST, 67, REST, 63, REST, 67, 66, 63, 66, 67, REST, 70, REST],
    bass: [43, REST, 42, REST],
  },
};

function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

class CompanionMusicEngine {
  private context: AudioContext | null = null;
  private timer: number | null = null;
  private step = 0;
  private mood: MusicMood = 'map';
  private gain: GainNode | null = null;
  private volume = 0.16;

  get label(): string {
    return TRACKS[this.mood].label;
  }

  setMood(mood: MusicMood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    this.step = 0;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(0.5, volume));
    if (this.gain) this.gain.gain.value = this.volume;
  }

  async start(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = this.volume;
      this.gain.connect(this.context.destination);
    }
    await this.context.resume();
    if (this.timer !== null) return;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 115);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private play(note: number, duration: number, gain: number, wave: OscillatorType): void {
    if (!this.context || !this.gain || note === REST) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.value = midiToHz(note);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.gain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private tick(): void {
    const track = TRACKS[this.mood];
    const beat = 60 / track.bpm;
    const melodyNote = track.melody[this.step % track.melody.length];
    const bassNote = track.bass[this.step % track.bass.length];
    this.play(melodyNote, beat * 0.72, 0.055, track.wave);
    if (this.step % 2 === 0) this.play(bassNote, beat * 1.2, 0.038, 'triangle');
    this.step += 1;
  }
}

export const companionMusic = new CompanionMusicEngine();

export function getMusicLabel(mood: MusicMood): string {
  return TRACKS[mood].label;
}
