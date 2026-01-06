/**
 * SoundManager - Optimized Audio System for Games
 * Fixes: setTimeout lag, audio context suspension, volume control
 */

class SoundManagerClass {
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized = false;
    private _volume: number = 0.3;
    private _muted: boolean = false;

    constructor() {
        // Load saved preferences
        const savedVolume = localStorage.getItem('game_volume');
        const savedMuted = localStorage.getItem('game_muted');
        if (savedVolume) this._volume = parseFloat(savedVolume);
        if (savedMuted) this._muted = savedMuted === 'true';
    }

    private async ensureContext(): Promise<boolean> {
        if (!this.isInitialized) {
            try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                this.context = new AudioContextClass();
                this.masterGain = this.context.createGain();
                this.masterGain.gain.value = this._muted ? 0 : this._volume;
                this.masterGain.connect(this.context.destination);
                this.isInitialized = true;
            } catch (e) {
                console.warn('AudioContext not available');
                return false;
            }
        }

        // Resume if suspended (mobile browsers)
        if (this.context?.state === 'suspended') {
            await this.context.resume();
        }

        return true;
    }

    // Volume control with persistence
    get volume(): number {
        return this._volume;
    }

    set volume(value: number) {
        this._volume = Math.max(0, Math.min(1, value));
        localStorage.setItem('game_volume', this._volume.toString());
        if (this.masterGain && !this._muted) {
            this.masterGain.gain.setValueAtTime(this._volume, this.context!.currentTime);
        }
    }

    get muted(): boolean {
        return this._muted;
    }

    set muted(value: boolean) {
        this._muted = value;
        localStorage.setItem('game_muted', value.toString());
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(value ? 0 : this._volume, this.context!.currentTime);
        }
    }

    toggleMute(): boolean {
        this.muted = !this._muted;
        return this._muted;
    }

    /**
     * Play a tone using AudioContext scheduling (no setTimeout!)
     */
    public async playTone(
        frequency: number,
        type: OscillatorType = 'sine',
        duration: number = 0.1,
        delay: number = 0
    ): Promise<void> {
        if (this._muted) return;

        const ready = await this.ensureContext();
        if (!ready || !this.context || !this.masterGain) return;

        const startTime = this.context.currentTime + delay;
        const endTime = startTime + duration;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Envelope to avoid clicks
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(startTime);
        oscillator.stop(endTime + 0.1);

        // Cleanup
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
        };
    }

    /**
     * Play multiple notes in sequence (no setTimeout!)
     */
    public async playSequence(notes: Array<{ freq: number, type?: OscillatorType, dur?: number }>, gap: number = 0.05): Promise<void> {
        let delay = 0;
        for (const note of notes) {
            await this.playTone(note.freq, note.type || 'sine', note.dur || 0.1, delay);
            delay += (note.dur || 0.1) + gap;
        }
    }

    // ===== Game-specific sounds =====

    public playEat(): void {
        this.playSequence([
            { freq: 600, dur: 0.08 },
            { freq: 800, dur: 0.08 }
        ], 0.02);
    }

    public playGameOver(): void {
        this.playSequence([
            { freq: 300, type: 'sawtooth', dur: 0.3 },
            { freq: 250, type: 'sawtooth', dur: 0.3 },
            { freq: 200, type: 'sawtooth', dur: 0.5 }
        ], 0.1);
    }

    public playLevelUp(): void {
        this.playSequence([
            { freq: 400, type: 'square', dur: 0.08 },
            { freq: 600, type: 'square', dur: 0.08 },
            { freq: 800, type: 'square', dur: 0.15 }
        ], 0.02);
    }

    public playShoot(): void {
        this.playTone(800, 'square', 0.04);
        this.playTone(400, 'square', 0.04, 0.03);
    }

    public playExplosion(): void {
        this.playTone(100, 'sawtooth', 0.15);
        this.playTone(80, 'sawtooth', 0.2, 0.1);
    }

    public playHit(): void {
        this.playTone(200, 'square', 0.08);
    }

    public playSuccess(): void {
        this.playSequence([
            { freq: 523, dur: 0.1 },  // C5
            { freq: 659, dur: 0.1 },  // E5
            { freq: 784, dur: 0.15 }  // G5
        ], 0.02);
    }

    public playError(): void {
        this.playSequence([
            { freq: 200, type: 'sawtooth', dur: 0.15 },
            { freq: 150, type: 'sawtooth', dur: 0.2 }
        ], 0.05);
    }

    public playClick(): void {
        this.playTone(1000, 'sine', 0.03);
    }

    public playCard(): void {
        this.playTone(500, 'triangle', 0.05);
    }

    public playWin(): void {
        this.playSequence([
            { freq: 523, dur: 0.1 },
            { freq: 659, dur: 0.1 },
            { freq: 784, dur: 0.1 },
            { freq: 1047, dur: 0.3 }
        ], 0.03);
    }

    public playLose(): void {
        this.playSequence([
            { freq: 392, type: 'sawtooth', dur: 0.2 },
            { freq: 349, type: 'sawtooth', dur: 0.2 },
            { freq: 330, type: 'sawtooth', dur: 0.4 }
        ], 0.1);
    }

    // Haptic feedback (if available)
    public vibrate(pattern: number | number[] = 50): void {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
}

export const soundManager = new SoundManagerClass();
export type { SoundManagerClass };
