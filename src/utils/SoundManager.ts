export class SoundManager {
    private AudioContext: typeof window.AudioContext;
    private context: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    constructor() {
        this.AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.init();
    }

    private init() {
        if (!this.context) {
            this.context = new this.AudioContext();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.3; // Low volume default
            this.masterGain.connect(this.context.destination);
        }
    }

    public playTone(frequency: number, type: OscillatorType, duration: number) {
        if (!this.context || !this.masterGain) this.init();
        if (this.context?.state === 'suspended') this.context.resume();

        const osc = this.context!.createOscillator();
        const gain = this.context!.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.context!.currentTime);

        gain.gain.setValueAtTime(0.3, this.context!.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context!.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start();
        osc.stop(this.context!.currentTime + duration);
    }

    public playEat() {
        this.playTone(600, 'sine', 0.1);
        setTimeout(() => this.playTone(800, 'sine', 0.1), 50);
    }

    public playGameOver() {
        this.playTone(300, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(250, 'sawtooth', 0.5), 400);
        setTimeout(() => this.playTone(200, 'sawtooth', 1.0), 800);
    }

    public playLevelUp() {
        this.playTone(400, 'square', 0.1);
        setTimeout(() => this.playTone(600, 'square', 0.1), 100);
        setTimeout(() => this.playTone(800, 'square', 0.2), 200);
    }

    public playShoot() {
        this.playTone(800, 'square', 0.05);
        setTimeout(() => this.playTone(400, 'square', 0.05), 50);
    }

    public playExplosion() {
        this.playTone(100, 'sawtooth', 0.2);
    }
}

export const soundManager = new SoundManager();
