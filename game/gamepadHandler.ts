import { gameStateInstance } from "./gameState";
import { CANVAS_W, CANVAS_H } from "../constants";
import { Player } from "./classes/Player";
import { soundManager } from "../utils/soundManager";

export class GamepadHandler {
    controllers: { p1: number | null, p2: number | null } = { p1: null, p2: null };
    deadzone = 0.15;
    active = true;
    
    menuCooldown: { p1: number, p2: number } = { p1: 0, p2: 0 };
    isPairingMode = false;
    pairingStep = 1; 
    
    onStatusChange: (() => void) | null = null;
    onPairingUpdate: ((step: number, p1: number | null, p2: number | null) => void) | null = null;
    onMenuMove: ((player: 'p1' | 'p2', direction: number) => void) | null = null;
    onMenuSelect: ((player: 'p1' | 'p2') => void) | null = null;

    constructor() {
        window.addEventListener("gamepadconnected", (e) => this.onConnect(e as GamepadEvent));
        window.addEventListener("gamepaddisconnected", (e) => this.onDisconnect(e as GamepadEvent));
    }

    onConnect(e: GamepadEvent) {
        gameStateInstance.addPopup(CANVAS_W/2, 50, `🎮 Gamepad ${e.gamepad.index} Detected`, "#0071e3");
        if (this.controllers.p1 === null) this.controllers.p1 = e.gamepad.index;
        else if (this.controllers.p2 === null) this.controllers.p2 = e.gamepad.index;
        if (this.onStatusChange) this.onStatusChange();
    }

    onDisconnect(e: GamepadEvent) {
        if (this.controllers.p1 === e.gamepad.index) this.controllers.p1 = null;
        if (this.controllers.p2 === e.gamepad.index) this.controllers.p2 = null;
        gameStateInstance.addPopup(CANVAS_W/2, 50, `🚫 Gamepad Disconnected`, "#ff3b30");
        if (this.onStatusChange) this.onStatusChange();
    }

    startPairing() {
        this.isPairingMode = true;
        this.pairingStep = 1;
        this.controllers = { p1: null, p2: null };
        if (this.onPairingUpdate) this.onPairingUpdate(1, null, null);
    }

    stopPairing() {
        this.isPairingMode = false;
        if (this.onStatusChange) this.onStatusChange();
    }

    update(menuMode: boolean = false) {
        const pads = navigator.getGamepads();
        if (!pads) return;

        // PAIRING LOGIC
        if (this.isPairingMode) {
            for (let i = 0; i < pads.length; i++) {
                const gp = pads[i];
                if (gp && gp.buttons[6].pressed && gp.buttons[7].pressed) {
                    if (this.pairingStep === 1) {
                        this.controllers.p1 = gp.index;
                        gameStateInstance.addPopup(CANVAS_W/2, CANVAS_H/2, "P1 LINKED!", "#ff3b30");
                        this.pairingStep = 2;
                        if (this.onPairingUpdate) this.onPairingUpdate(2, this.controllers.p1, null);
                        // Debounce
                        this.isPairingMode = false;
                        setTimeout(() => { 
                            this.isPairingMode = true; 
                        }, 1000); 
                    } else if (this.pairingStep === 2 && gp.index !== this.controllers.p1) {
                        this.controllers.p2 = gp.index;
                        gameStateInstance.addPopup(CANVAS_W/2, CANVAS_H/2, "P2 LINKED!", "#007aff");
                        this.pairingStep = 3;
                        if (this.onPairingUpdate) this.onPairingUpdate(3, this.controllers.p1, this.controllers.p2);
                    }
                }
            }
            return;
        }

        // MENU LOGIC
        if (menuMode) {
            this.handleMenuInput(pads, 'p1', this.controllers.p1);
            this.handleMenuInput(pads, 'p2', this.controllers.p2);
            return;
        }

        // GAMEPLAY LOGIC handled inside players via direct check or passed input
        // But we can also push inputs here if we want pure separation
    }

    handleMenuInput(pads: (Gamepad | null)[], playerKey: 'p1' | 'p2', padIndex: number | null) {
        if (padIndex === null || !pads[padIndex]) return;
        
        const gp = pads[padIndex];
        if (this.menuCooldown[playerKey] > 0) {
            this.menuCooldown[playerKey]--;
        } else {
            const axisX = Math.abs(gp!.axes[2]) > 0.5 ? gp!.axes[2] : (Math.abs(gp!.axes[0]) > 0.5 ? gp!.axes[0] : 0);
            
            if (Math.abs(axisX) > 0.5) {
                if (this.onMenuMove) this.onMenuMove(playerKey, axisX > 0 ? 1 : -1);
                this.menuCooldown[playerKey] = 15;
                soundManager.play('ui', 1.2);
            }
        }

        if (gp!.buttons[0].pressed) {
             if (this.menuCooldown[playerKey] === 0) {
                 if (this.onMenuSelect) this.onMenuSelect(playerKey);
                 this.menuCooldown[playerKey] = 30;
             }
        }
    }

    getPlayerInput(playerId: 1 | 2) {
        const pads = navigator.getGamepads();
        const idx = playerId === 1 ? this.controllers.p1 : this.controllers.p2;
        if (idx === null || !pads[idx]) return null;
        return pads[idx];
    }
}

export const gamepadHandler = new GamepadHandler();