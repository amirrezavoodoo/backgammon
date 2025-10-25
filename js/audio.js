// Minimal AudioHelper stub — safe fallback if no real audio assets are provided
class AudioHelper {
    constructor() {
        try {
            this.diceAudio = null; // placeholder, user can set src later
        } catch (e) {
            this.diceAudio = null;
        }
    }
    playDice() {
        if (this.diceAudio && typeof this.diceAudio.play === 'function') {
            try { this.diceAudio.currentTime = 0; this.diceAudio.play(); } catch (e) { /* ignore */ }
        }
    }
}

window.AudioHelper = AudioHelper;
