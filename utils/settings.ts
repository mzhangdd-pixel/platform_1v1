import { soundManager } from "./soundManager";

export const Settings = {
    noCooldown: false,
    nightMode: false,
    flashyMode: false,
    audioEnabled: false,

    load() {
        const saved = localStorage.getItem('brawl_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.noCooldown = parsed.noCooldown || false;
            this.nightMode = parsed.nightMode || false;
            this.flashyMode = parsed.flashyMode || false;
            this.audioEnabled = parsed.audioEnabled || false;
        }
        this.apply();
    },

    save() {
        localStorage.setItem('brawl_settings', JSON.stringify({
            noCooldown: this.noCooldown,
            nightMode: this.nightMode,
            flashyMode: this.flashyMode,
            audioEnabled: this.audioEnabled
        }));
    },

    apply() {
        // Apply dark mode to DOM
        if (this.nightMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
        soundManager.enabled = this.audioEnabled;
    }
};