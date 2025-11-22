class SoundManager {
    ctx: AudioContext | null = null;
    enabled: boolean = false;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    play(type: 'ui' | 'jump' | 'melee' | 'shoot_phys' | 'shoot_magic' | 'cast' | 'ult' | 'hit' | 'empty', pitchMod: number = 1.0) {
        if (!this.enabled || !this.ctx) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        switch (type) {
            case 'ui':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'jump':
                osc.type = 'square';
                osc.frequency.setValueAtTime(150 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(300 * pitchMod, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'melee': // New: Heavy swing sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(150 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(50 * pitchMod, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'shoot_phys': // New: Gunshot/mechanical fire
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400 * pitchMod, now);
                osc.frequency.exponentialRampToValueAtTime(100 * pitchMod, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'shoot_magic': // New: Magic missile sound
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600 * pitchMod, now);
                osc.frequency.linearRampToValueAtTime(300 * pitchMod, now + 0.15);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'cast': // New: Skill activation
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(300 * pitchMod, now);
                osc.frequency.linearRampToValueAtTime(600 * pitchMod, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'empty': // New: Out of ammo/resource click
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.setValueAtTime(400, now + 0.05);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            case 'ult':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(800, now + 1.0);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 1.5);
                const lfo = this.ctx.createOscillator();
                lfo.frequency.value = 20;
                lfo.connect(gain.gain);
                lfo.start(now);
                lfo.stop(now + 1.5);
                osc.start(now);
                osc.stop(now + 1.5);
                break;
            case 'hit':
                osc.type = 'square';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
        }
    }
}

export const soundManager = new SoundManager();