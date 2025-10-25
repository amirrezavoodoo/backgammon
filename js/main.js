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

        // Account for some UI chrome (controls/messages) so board fits vertically
        const headerH = (document.querySelector('.hud') || { offsetHeight: 64 }).offsetHeight;
        const footerAllowance = 24; // safe margin

        const widthAllowance = 12; // small horizontal margin
        const availableW = Math.max(100, vw - widthAllowance);
        const availableH = Math.max(120, vh - headerH - footerAllowance);

        const scaleX = availableW / rect.width;
        // We will apply vertical constraints by capping board height rather than forcing a vertical scale
        // so triangles/points keep natural proportions. Compute a target max-height for the board and
        // adjust CSS variables that control point height.
        const targetBoardMaxH = Math.floor(availableH);
        board.style.maxHeight = targetBoardMaxH + 'px';

        // Compute scale primarily from width to avoid vertical squash/stretch of point shapes
        const MIN_SCALE = 0.48;
        const scale = Math.min(1, Math.max(MIN_SCALE, scaleX));
        document.documentElement.style.setProperty('--ui-scale', String(scale));

        // Adjust --point-h to fit two rows of points within the available board height.
        try {
            const rootStyles = getComputedStyle(document.documentElement);
            const boardPaddingStr = rootStyles.getPropertyValue('--board-padding').trim() || '12px';
            const boardPadding = parseFloat(boardPaddingStr);
            // reserve some space for bar/bearoffs, padding and a small gutter
            const reserved = boardPadding * 2 + 40; // extra gutter
            const perRow = Math.max(100, Math.floor((targetBoardMaxH - reserved) / 2));
            document.documentElement.style.setProperty('--point-h', perRow + 'px');
        } catch (e) {
            // ignore failures and keep CSS fallback
        }
    }

    const fitDeferred = () => requestAnimationFrame(fitBoardToViewport);
    window.addEventListener('resize', fitDeferred, { passive: true });
    window.addEventListener('orientationchange', fitDeferred);

    // After UI initial render
    setTimeout(fitDeferred, 300);
});
