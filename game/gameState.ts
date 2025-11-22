import { Platform, Popup } from "../types";
import { Player } from "./classes/Player";
import { Projectile } from "./classes/Projectile";
import { Particle } from "./classes/Particle";
import { INITIAL_PLATFORMS } from "../constants";

// This acts as the central mutable state for the game engine
export class GameState {
    players: Player[] = [];
    projectiles: Projectile[] = [];
    particles: Particle[] = [];
    popups: Popup[] = [];
    platforms: Platform[] = [];
    spikeState = { active: false, timer: 0 };
    globalTime = 0;
    
    // Track last time a message was shown to prevent spam
    lastPopupTimes: Record<string, number> = {};
    
    constructor() {
        this.resetMap();
    }

    resetMap() {
        // Clone initial platforms
        this.platforms = JSON.parse(JSON.stringify(INITIAL_PLATFORMS));
    }

    addPopup(x: number, y: number, text: string, color: string) {
        const now = Date.now();
        // Debounce: If same message shown in last 1000ms, skip
        if (this.lastPopupTimes[text] && now - this.lastPopupTimes[text] < 1000) {
            return;
        }
        this.lastPopupTimes[text] = now;
        this.popups.push({x, y, text, color, life: 40});
    }

    spawnFlashyParticles(x: number, y: number, color: string, type: string) {
        let count = type === 'nova' || type === 'death' ? 40 : 15;
        for(let i=0; i<count; i++) {
            this.particles.push(new Particle(x, y, color, type === 'death' ? 'nova' : type));
        }
    }
}

export const gameStateInstance = new GameState();