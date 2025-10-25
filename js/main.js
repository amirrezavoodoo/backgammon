// Initialize game and UI
document.addEventListener('DOMContentLoaded', () => {
    // audio helper (available globally) — instantiate only if defined
    if (typeof AudioHelper === 'function') {
        try {
            const audioHelper = new AudioHelper();
            window.audioHelper = audioHelper;
        } catch (e) {
            // ignore audio init errors
            window.audioHelper = null;
        }
    } else {
        window.audioHelper = null;
    }

    const game = new BackgammonGame();
    const ui = new BackgammonUI(game);

    // Expose globals as requested
    window.game = game;
    window.ai = ui.ai;
    // --- Local Dice3D usage per user snippet ---
    // Create local dice instance (do not export globally) and a safe audio helper
    let dice = null;
    try {
        if (typeof window.Dice3D === 'function') dice = new window.Dice3D('dice3d');
    } catch (e) {
        console.warn('Dice3D init failed:', e);
        dice = null;
    }

    const audio = window.audioHelper || { playDice: () => {} };

    // Usage exactly as requested (demo):
    try {
        const roll = [4, 2];
        if (dice) dice.rollTo(roll[0]);
        audio.playDice({ values: roll });
    } catch (e) {
        console.warn('Dice demo usage failed:', e);
    }

    // Expose a small helper so UI can request dice animations when a roll occurs
    window.showDice3D = function(values = []) {
        if (!dice || !Array.isArray(values) || values.length === 0) return;
        // animate each value sequentially (if there are two, show both)
        values.slice(0, 4).forEach((v, i) => {
            setTimeout(() => {
                try { dice.rollTo(v); } catch (e) { /* ignore */ }
            }, i * 350);
        });
    };
});
