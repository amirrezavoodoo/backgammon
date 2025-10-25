document.addEventListener('DOMContentLoaded', () => {
    // Audio helper (optional)
    if (typeof AudioHelper === 'function') {
        try { window.audioHelper = new AudioHelper(); } catch (e) { window.audioHelper = null; }
    } else {
        window.audioHelper = null;
    }

    const game = new BackgammonGame();
    const ui = new BackgammonUI(game);

    window.game = game;
    window.ai = ui.ai;

    // Dice3D safe init
    let dice3dInstance = null;
    try {
        const canvasId = 'dice3d';
        const canvas = document.getElementById(canvasId);
        if (canvas && typeof window.Dice3D === 'function') {
            dice3dInstance = new window.Dice3D(canvasId);
        }
    } catch (e) {
        console.warn('Dice3D init failed:', e);
        dice3dInstance = null;
    }

    window.showDice3D = function(values = []) {
        if (!dice3dInstance || !Array.isArray(values)) return;
        values.slice(0, 4).forEach((v, i) => {
            setTimeout(() => {
                try { dice3dInstance.rollTo(v); } catch (e) {}
            }, i * 350);
        });
    };

    // Fit board to viewport by scaling app-shell
    function fitBoardToViewport() {
        const board = document.getElementById('board');
        if (!board) return;

        // reset scale to measure natural size
        document.documentElement.style.setProperty('--ui-scale', '1');

        // force layout and read size
        const rect = board.getBoundingClientRect();

        const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

        const widthAllowance = 12;
        const heightAllowance = 24;

        const scaleX = (vw - widthAllowance) / rect.width;
        const scaleY = (vh - heightAllowance) / rect.height;

        const scale = Math.min(1, Math.max(0.6, Math.min(scaleX, scaleY)));
        document.documentElement.style.setProperty('--ui-scale', String(scale));
    }

    const fitDeferred = () => requestAnimationFrame(fitBoardToViewport);
    window.addEventListener('resize', fitDeferred, { passive: true });
    window.addEventListener('orientationchange', fitDeferred);

    // After UI initial render
    setTimeout(fitDeferred, 300);
});
