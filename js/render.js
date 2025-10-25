class BackgammonUI {
    constructor(game) {
        this.game = game;
    this.ai = new BackgammonGrandmasterAI(game, 'grandmaster'); // AI set to max difficulty
        this.setupBoard();
        this.attachEventListeners();
        this.render();
        setTimeout(() => this.startGame(), 1000);
    }

    startGame() {
        console.log('🚀 بازی شروع شد!');
        this.initialRoll();
    }

    async initialRoll() {
        await this.determineFirstPlayer();
    }

    async determineFirstPlayer() {
        while (true) {
            const blackRoll = Math.floor(Math.random() * 6) + 1;
            this.showMessage(`سیاه رول زد: ${blackRoll}`, 'info');
            this.game.dice = {
                values: [blackRoll],
                remaining: [{ value: blackRoll, id: 1, used: false }],
                rolled: false
            };
            this.render();
            await new Promise(r => setTimeout(r, 1200));

            const whiteRoll = Math.floor(Math.random() * 6) + 1;
            this.showMessage(`سفید رول زد: ${whiteRoll}`, 'info');
            this.game.dice = {
                values: [blackRoll, whiteRoll],
                remaining: [
                    { value: blackRoll, id: 1, used: false },
                    { value: whiteRoll, id: 2, used: false }
                ],
                rolled: true
            };
            this.render();
            await new Promise(r => setTimeout(r, 900));

            console.log(`🎲 Initial rolls — black: ${blackRoll}, white: ${whiteRoll}`);
            if (blackRoll === whiteRoll) {
                this.showMessage('مساوی شد — دوباره رول بزنید', 'warning');
                await new Promise(r => setTimeout(r, 800));
                continue;
            }

            this.game.dice = {
                values: [blackRoll, whiteRoll],
                remaining: [
                    { value: blackRoll, id: 1, used: false },
                    { value: whiteRoll, id: 2, used: false }
                ],
                rolled: true
            };
            this.game.currentPlayer = blackRoll > whiteRoll ? 'black' : 'white';
            this.render();

            if (this.game.currentPlayer === this.game.aiPlayer) {
                setTimeout(() => this.aiPlayTurn(), 600);
            }
            break;
        }
    }

    setupBoard() {
        const topRow = document.getElementById('topRow');
        const bottomRow = document.getElementById('bottomRow');
        const topRow2 = document.getElementById('topRow2');
        const bottomRow2 = document.getElementById('bottomRow2');

        for (let i = 12; i < 18; i++) {
            const point = document.createElement('div');
            point.className = 'point top';
            point.dataset.point = i;
            topRow.appendChild(point);
        }

        for (let i = 11; i >= 6; i--) {
            const point = document.createElement('div');
            point.className = 'point bottom';
            point.dataset.point = i;
            bottomRow.appendChild(point);
        }

        for (let i = 18; i < 24; i++) {
            const point = document.createElement('div');
            point.className = 'point top';
            point.dataset.point = i;
            topRow2.appendChild(point);
        }

        for (let i = 5; i >= 0; i--) {
            const point = document.createElement('div');
            point.className = 'point bottom';
            point.dataset.point = i;
            bottomRow2.appendChild(point);
        }
    }

    attachEventListeners() {
        document.querySelectorAll('.point').forEach(point => {
            point.addEventListener('click', e => this.handlePointClick(e));
        });
        document.getElementById('bar').addEventListener('click', () => this.handleBarClick());
        document.getElementById('bearOffWhite').addEventListener('click', () => this.handleBearOffClick('white'));
        document.getElementById('bearOffBlack').addEventListener('click', () => this.handleBearOffClick('black'));
        document.getElementById('rollButton').addEventListener('click', () => this.handleRollDice());
        document.getElementById('undoButton').addEventListener('click', () => this.handleUndo());
    }

    handlePointClick(e) {
        if (this.game.currentPlayer === this.game.aiPlayer) return;
        const pointIndex = parseInt(e.currentTarget.dataset.point);
        const point = this.game.board[pointIndex];
        if (this.game.selectedPoint === null) {
            if (point.color === this.game.currentPlayer && point.count > 0) {
                this.selectPoint(pointIndex);
            }
        } else {
            this.executeMove(pointIndex);
        }
    }

    handleBarClick() {
        if (this.game.currentPlayer === this.game.aiPlayer) return;
        if (this.game.bar[this.game.currentPlayer] > 0) this.selectPoint(-1);
    }

    handleBearOffClick(player) {
        if (this.game.currentPlayer === this.game.aiPlayer) return;
        if (player === this.game.currentPlayer && this.game.selectedPoint !== null) {
            this.executeMove(-1);
        }
    }

    selectPoint(pointIndex) {
        this.game.selectedPoint = pointIndex;
        this.game.possibleMoves = this.calculatePossibleMoves(pointIndex);
        this.render();
    }

    calculatePossibleMoves(from) {
        const moves = [];
        const player = this.game.currentPlayer;
        for (const die of this.game.dice.remaining) {
            if (die.used) continue;
            if (from === -1) {
                if (this.game.canMoveFromBar(player, die.value)) {
                    const to = player === 'white' ? 24 - die.value : die.value - 1;
                    moves.push({ to, steps: die.value, dieId: die.id });
                }
            } else {
                const result = this.game.canMove(from, die.value, player);
                if (result.canMove) {
                    moves.push({
                        to: result.destination,
                        steps: die.value,
                        dieId: die.id,
                        isBearOff: result.isBearOff
                    });
                }
            }
        }
        return moves;
    }

    executeMove(targetPoint, dieId = null) {
        const move = dieId
            ? this.game.possibleMoves.find(m => m.to === targetPoint && m.dieId === dieId)
            : this.game.possibleMoves.find(m => m.to === targetPoint);
        if (move) {
            // Animate visual movement first, then commit the game state and re-render
            this.animateAndCommitMove(this.game.selectedPoint, move.to, this.game.currentPlayer, move.steps, move.dieId || null)
                .then(() => {
                    // after animation and commit
                    this.game.selectedPoint = null;
                    this.game.possibleMoves = [];
                    const winner = this.game.checkWinner();
                    if (winner) {
                        this.showMessage(`🏆 ${winner === 'white' ? 'سفید' : 'سیاه'} برنده شد!`, 'success');
                    } else if (this.game.dice.remaining.every(d => d.used)) {
                        this.game.endTurn();
                        this.showMessage(`نوبت ${this.game.currentPlayer === 'white' ? 'سفید' : 'سیاه'}`, 'info');
                    }
                    this.render();
                    this.checkAndTriggerAI();
                })
                .catch(() => {
                    // fallback: commit immediately if animation failed
                    this.game.makeMove(this.game.selectedPoint, move.steps, this.game.currentPlayer, move.dieId || null);
                    this.game.selectedPoint = null;
                    this.game.possibleMoves = [];
                    this.render();
                    this.checkAndTriggerAI();
                });
        } else {
            this.game.selectedPoint = null;
            this.game.possibleMoves = [];
            this.render();
        }
    }

    // Animate a checker from a source index (or -1 for bar) to a destination index (or -1 for bear-off)
    // Returns a Promise that resolves after animation completes and the game state has been updated.
    animateAndCommitMove(fromIndex, toIndex, player, steps, dieId = null) {
        return new Promise((resolve, reject) => {
            try {
                const boardEl = document.getElementById('board');
                if (!boardEl) {
                    // no board element, commit immediately
                    this.game.makeMove(fromIndex, steps, player, dieId);
                    resolve();
                    return;
                }

                // Helper to find source DOM checker element
                const findSourceChecker = () => {
                    if (fromIndex === -1) {
                        const barEl = document.getElementById('bar');
                        const list = barEl ? Array.from(barEl.querySelectorAll(`.checker.${player}`)) : [];
                        return list[list.length - 1] || barEl && barEl.querySelector('.checker');
                    }
                    const fromEl = document.querySelector(`[data-point="${fromIndex}"]`);
                    if (!fromEl) return null;
                    const list = Array.from(fromEl.querySelectorAll('.checker'));
                    return list[list.length - 1] || null;
                };

                const sourceChecker = findSourceChecker();

                // Destination element center
                const getDestCenter = () => {
                    if (toIndex === -1) {
                        const bear = document.getElementById(player === 'white' ? 'bearOffWhite' : 'bearOffBlack');
                        if (!bear) return null;
                        const rect = bear.getBoundingClientRect();
                        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    }
                    const destEl = document.querySelector(`[data-point="${toIndex}"]`);
                    if (!destEl) return null;
                    const rect = destEl.getBoundingClientRect();
                    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                };

                const destCenter = getDestCenter();
                if (!destCenter) {
                    // can't compute dest; commit immediately
                    this.game.makeMove(fromIndex, steps, player, dieId);
                    resolve();
                    return;
                }

                // If no source checker element found, fallback to immediate commit
                if (!sourceChecker) {
                    this.game.makeMove(fromIndex, steps, player, dieId);
                    resolve();
                    return;
                }

                // Also handle capturing opponent single checker visually (if present)
                let opponentClone = null;
                const destPoint = (toIndex >= 0 && toIndex < 24) ? this.game.board[toIndex] : null;
                if (destPoint && destPoint.color && destPoint.color !== player && destPoint.count === 1) {
                    // find opponent element
                    const destEl = document.querySelector(`[data-point="${toIndex}"]`);
                    if (destEl) {
                        const oppList = Array.from(destEl.querySelectorAll('.checker'));
                        const oppEl = oppList[oppList.length - 1];
                        if (oppEl) {
                            // create opponent clone to fly to bar
                            const oppRect = oppEl.getBoundingClientRect();
                            const boardRect = boardEl.getBoundingClientRect();
                            opponentClone = oppEl.cloneNode(true);
                            opponentClone.style.position = 'absolute';
                            opponentClone.style.left = (oppRect.left - boardRect.left) + 'px';
                            opponentClone.style.top = (oppRect.top - boardRect.top) + 'px';
                            opponentClone.style.margin = '0';
                            opponentClone.classList.add('animating');
                            boardEl.appendChild(opponentClone);
                            // remove original immediately to avoid duplicates
                            oppEl.remove();
                        }
                    }
                }

                // Create a flying clone of the source checker
                const srcRect = sourceChecker.getBoundingClientRect();
                const boardRect = boardEl.getBoundingClientRect();
                const clone = sourceChecker.cloneNode(true);
                clone.style.position = 'absolute';
                clone.style.left = (srcRect.left - boardRect.left) + 'px';
                clone.style.top = (srcRect.top - boardRect.top) + 'px';
                clone.style.margin = '0';
                clone.style.pointerEvents = 'none';
                clone.classList.add('animating');
                boardEl.appendChild(clone);

                // Remove the original from source to avoid flicker
                sourceChecker.remove();

                // compute translation to dest center (relative to board)
                const srcCenter = { x: srcRect.left + srcRect.width / 2, y: srcRect.top + srcRect.height / 2 };
                const dx = destCenter.x - srcCenter.x;
                const dy = destCenter.y - srcCenter.y;

                // trigger transition
                requestAnimationFrame(() => {
                    clone.style.transform = `translate(${dx}px, ${dy}px)`;
                    if (opponentClone) {
                        // fly opponent towards bar center
                        const barEl = document.getElementById('bar');
                        const barRect = barEl.getBoundingClientRect();
                        const oppSrcCenter = oppRect ? { x: oppRect.left + oppRect.width / 2, y: oppRect.top + oppRect.height / 2 } : null;
                        const barCenter = { x: barRect.left + barRect.width / 2, y: barRect.top + barRect.height / 2 };
                        const odx = barCenter.x - (oppSrcCenter.x);
                        const ody = barCenter.y - (oppSrcCenter.y);
                        opponentClone.style.transform = `translate(${odx}px, ${ody}px) scale(0.8)`;
                    }
                });

                // wait for transition end (or timeout)
                let finished = false;
                const cleanup = () => {
                    if (clone && clone.parentElement) clone.remove();
                    if (opponentClone && opponentClone.parentElement) opponentClone.remove();
                    // commit game state
                    try {
                        this.game.makeMove(fromIndex, steps, player, dieId);
                    } catch (e) {
                        console.error('Error committing move after animation', e);
                    }
                    finished = true;
                    resolve();
                };

                const onTransitionEnd = (ev) => {
                    if (ev.target === clone) {
                        clone.removeEventListener('transitionend', onTransitionEnd);
                        cleanup();
                    }
                };

                clone.addEventListener('transitionend', onTransitionEnd);

                // safety timeout in case transitionend doesn't fire
                setTimeout(() => {
                    if (!finished) cleanup();
                }, 1100);

            } catch (err) {
                console.error('animateAndCommitMove error', err);
                reject(err);
            }
        });
    }

    handleRollDice() {
        if (this.game.currentPlayer === this.game.aiPlayer) return;
        if (!this.game.dice.rolled) {
            this.game.rollDice();
            if (window.audioHelper && typeof window.audioHelper.playDice === 'function')
                window.audioHelper.playDice();

            // Button visual feedback
            const rollBtn = document.getElementById('rollButton');
            if (rollBtn) {
                rollBtn.classList.add('rolling');
                setTimeout(() => rollBtn.classList.remove('rolling'), 900);
            }

            // trigger 3D dice animation (if available)
            if (typeof window.showDice3D === 'function') window.showDice3D(this.game.dice.values);

            const board = document.getElementById('board');
            board.classList.add('shaking');
            setTimeout(() => board.classList.remove('shaking'), 700);

            this.render();
            this.showMessage(
                `${this.game.currentPlayer === 'white' ? 'سفید' : 'سیاه'}: ${this.game.dice.values.join(', ')}`,
                'success'
            );

            if (!this.game.hasMovesLeft(this.game.currentPlayer)) {
                setTimeout(() => {
                    this.game.endTurn();
                    this.render();
                    this.showMessage('حرکتی ممکن نیست - نوبت بعدی', 'warning');
                    this.checkAndTriggerAI();
                }, 1500);
            }
        }
    }

    handleUndo() {
        if (this.game.currentPlayer === this.game.aiPlayer) return;
        if (this.game.undo()) {
            this.showMessage('↩️ حرکت برگشت داده شد', 'info');
            this.render();
            const undoBtn = document.getElementById('undoButton');
            if (undoBtn) {
                undoBtn.classList.add('undoing');
                setTimeout(() => undoBtn.classList.remove('undoing'), 800);
            }
        }
    }

    render() {
        this.renderPoints();
        this.renderBar();
        this.renderBearOff();
        this.renderDiceUI();
        this.updateButtons();
        // Board highlight for current player
        const boardEl = document.getElementById('board');
        if (boardEl) {
            boardEl.classList.toggle('current-player-white', this.game.currentPlayer === 'white');
            boardEl.classList.toggle('current-player-black', this.game.currentPlayer === 'black');
        }
    }

    renderDiceUI() {
        const left = document.getElementById('diceLeft');
        const right = document.getElementById('diceRight');
        const middle = document.getElementById('diceMiddle');
        if (!left || !right || !middle) return;

        // Clear only dice slots (don't remove roll button)
        left.innerHTML = '';
        right.innerHTML = '';

        // If no dice rolled yet, show nothing
        if (!this.game.dice || !this.game.dice.values || this.game.dice.values.length === 0) return;

        const values = this.game.dice.values.slice(0, 4);

        // Strategy:
        // - 1 die: show in middle-right
        // - 2 dice: one left, one right
        // - 4 dice (doubles): two left, two right stacked

        const createDieEl = (v, idx) => {
            const die = document.createElement('div');
            die.className = 'dice';
            die.textContent = v;
            die.dataset.id = this.game.dice.remaining && this.game.dice.remaining[idx] ? this.game.dice.remaining[idx].id : idx + 1;
            if (this.game.dice.remaining && this.game.dice.remaining[idx] && this.game.dice.remaining[idx].used) die.classList.add('used');
            return die;
        };

        if (values.length === 1) {
            right.appendChild(createDieEl(values[0], 0));
        } else if (values.length === 2) {
            left.appendChild(createDieEl(values[0], 0));
            right.appendChild(createDieEl(values[1], 1));
        } else if (values.length === 4) {
            // doubles: show two stacked on each side
            const leftTop = createDieEl(values[0], 0);
            const leftBottom = createDieEl(values[1], 1);
            const rightTop = createDieEl(values[2], 2);
            const rightBottom = createDieEl(values[3], 3);
            left.appendChild(leftTop);
            left.appendChild(leftBottom);
            right.appendChild(rightTop);
            right.appendChild(rightBottom);
        } else {
            // fallback: put first two
            left.appendChild(createDieEl(values[0], 0));
            right.appendChild(createDieEl(values[1] || values[0], 1));
        }
    }

    renderPoints() {
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            const pointEl = document.querySelector(`[data-point="${i}"]`);
            pointEl.innerHTML = '';

            const movesHere = this.game.possibleMoves.filter(m => m.to === i);
            const isPossible = movesHere.length > 0;
            pointEl.classList.toggle('possible', isPossible);
            pointEl.classList.toggle('selected-highlight', this.game.selectedPoint === i);

            for (let j = 0; j < point.count; j++) {
                const checker = document.createElement('div');
                checker.className = `checker ${point.color}`;
                if (j === 5) checker.textContent = `+${point.count - 5}`;
                const isTop = pointEl.classList.contains('top');
                if (isTop) checker.style.top = `${j * 42}px`;
                else checker.style.bottom = `${j * 42}px`;
                pointEl.appendChild(checker);
            }

            movesHere.forEach(m => {
                const badge = document.createElement('div');
                badge.className = 'move-badge';
                badge.dataset.dieId = m.dieId;
                badge.style.position = 'absolute';
                badge.style.right = '4px';
                badge.style.top = '4px';
                badge.style.background = 'rgba(0,0,0,0.6)';
                badge.style.color = 'white';
                badge.style.padding = '2px 4px';
                badge.style.borderRadius = '6px';
                badge.style.fontSize = '12px';
                badge.style.cursor = 'pointer';
                badge.addEventListener('click', e => {
                    e.stopPropagation();
                    const dieId = parseInt(e.currentTarget.dataset.dieId, 10);
                    this.executeMove(i, dieId);
                });
                pointEl.appendChild(badge);
            });
        }
    }

    renderBar() {
        const barEl = document.getElementById('bar');
        barEl.innerHTML = '';
        const whiteCount = this.game.bar.white;
        const blackCount = this.game.bar.black;

        if (whiteCount > 0) {
            const w = document.createElement('div');
            w.className = 'checker white';
            w.textContent = whiteCount > 1 ? whiteCount : '';
            barEl.appendChild(w);
        }
        if (blackCount > 0) {
            const b = document.createElement('div');
            b.className = 'checker black';
            b.textContent = blackCount > 1 ? blackCount : '';
            barEl.appendChild(b);
        }

        const possible = this.game.possibleMoves.some(m => m.to >= 0);
        barEl.classList.toggle('has-checkers-possible', this.game.selectedPoint === -1 && possible);
        barEl.classList.toggle('selected', this.game.selectedPoint === -1);
    }

    renderBearOff() {
        const whiteEl = document.getElementById('bearOffWhite');
        const blackEl = document.getElementById('bearOffBlack');
        if (!whiteEl || !blackEl) return;


        // Helper to build stack of checkers with label and orientation
        const buildStack = (el, color, count) => {
            el.innerHTML = '';

            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = color === 'black' ? '⚫ Black' : '⚪ White';

            const stack = document.createElement('div');
            stack.className = 'stack';

            // Add checkers: for black we append from top (stack grows downward)
            // for white we append from bottom (stack grows upward) by using order in CSS.
            const visible = Math.min(count, 12); // allow more visible in tall column
            for (let i = 0; i < visible; i++) {
                const ck = document.createElement('div');
                ck.className = `checker ${color}`;
                // optional tiny size variation
                ck.style.transform = `scale(${1 - (i * 0.01)})`;
                stack.appendChild(ck);
            }

            if (count > visible) {
                const badge = document.createElement('div');
                badge.className = 'count-badge';
                badge.textContent = `+${count - visible}`;
                // place badge near the stack start
                stack.appendChild(badge);
            }

            const totalLabel = document.createElement('div');
            totalLabel.className = 'count-badge';
            totalLabel.textContent = `${count}/15`;

            el.appendChild(label);
            el.appendChild(stack);
            el.appendChild(totalLabel);
        };

        buildStack(whiteEl, 'white', this.game.bornOff.white);
        buildStack(blackEl, 'black', this.game.bornOff.black);

        // Highlight bear-off area when a bear-off move is possible.
        // Two situations:
        // 1) There exists any legal move for current player that is a bear-off (e.g., dice allow bearing off).
        // 2) The user has selected a point and one of the possibleMoves for that selection is a bear-off.
        const player = this.game.currentPlayer;
        let anyBearOffMove = false;
        try {
            anyBearOffMove = this.game.getAllLegalMoves(player).some(m => m.isBearOff === true);
        } catch (e) {
            anyBearOffMove = false;
        }

        const selectedCausesBearOff = Array.isArray(this.game.possibleMoves) && this.game.possibleMoves.some(m => m.isBearOff === true);

        whiteEl.classList.toggle('possible', player === 'white' && (anyBearOffMove || selectedCausesBearOff));
        blackEl.classList.toggle('possible', player === 'black' && (anyBearOffMove || selectedCausesBearOff));
    }

    updateButtons() {
        const rollButton = document.getElementById('rollButton');
        const undoButton = document.getElementById('undoButton');
        rollButton.disabled = this.game.dice.rolled || this.game.currentPlayer === this.game.aiPlayer;
        undoButton.disabled = !this.game.canUndo() || this.game.currentPlayer === this.game.aiPlayer;
    }

    showMessage(text, type = 'info') {
        let msgEl = document.getElementById('messages');
        // clear and set structured message with optional icon
        if (!msgEl) return;
        msgEl.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = `message ${type} enter`;
        const icon = document.createElement('div');
        icon.className = 'msg-icon';
        icon.textContent = type === 'success' ? '🏆' : (type === 'warning' ? '⚠️' : 'ℹ️');
        const txt = document.createElement('div');
        txt.className = 'msg-text';
        txt.textContent = text;
        wrapper.appendChild(icon);
        wrapper.appendChild(txt);
        msgEl.appendChild(wrapper);
        // remove enter class after animation so re-adding works later
        setTimeout(() => wrapper.classList.remove('enter'), 1000);
    }

    checkAndTriggerAI() {
        if (this.game.currentPlayer === this.game.aiPlayer && !this.game.dice.rolled) {
            setTimeout(() => this.aiPlayTurn(), 800);
        }
    }

    async aiPlayTurn() {
        if (this.game.currentPlayer !== this.game.aiPlayer) return;
        console.log('🤖 نوبت AI شروع شد');
        this.showMessage('🤔 AI در حال فکر...', 'info');
        await new Promise(r => setTimeout(r, 800));

        let dice;
        if (this.game.dice && this.game.dice.rolled) dice = this.game.dice.values;
        else {
            dice = this.game.rollDice();
            // visually hint the roll button even for AI (subtle)
            const rollBtn = document.getElementById('rollButton');
            if (rollBtn) {
                rollBtn.classList.add('rolling');
                setTimeout(() => rollBtn.classList.remove('rolling'), 900);
            }
        }

        if (window.audioHelper && typeof window.audioHelper.playDice === 'function')
            window.audioHelper.playDice();
        if (typeof window.showDice3D === 'function') window.showDice3D(dice);

        this.showMessage(`🎲 AI: ${dice.join(', ')}`, 'info');
        this.render();

        const board = document.getElementById('board');
        board.classList.add('shaking');
        setTimeout(() => board.classList.remove('shaking'), 700);
        await new Promise(r => setTimeout(r, 1000));

        if (!this.game.hasMovesLeft(this.game.aiPlayer)) {
            this.showMessage('⚠️ AI: حرکتی ممکن نیست!', 'warning');
            await new Promise(r => setTimeout(r, 1500));
            this.game.endTurn();
            this.render();
            this.showMessage('✅ نوبت شما - تاس بزنید', 'success');
            return;
        }

        let moveCount = 0;
        while (this.game.dice.remaining.some(d => !d.used) && this.game.hasMovesLeft(this.game.aiPlayer)) {
            const bestMove = this.ai.getBestMove(this.game.aiPlayer);
            if (!bestMove) break;
            moveCount++;
            console.log(`🎯 AI حرکت #${moveCount}:`, bestMove);

            await new Promise(r => setTimeout(r, 400));
            // Animate AI move when possible
            if (typeof this.animateAndCommitMove === 'function') {
                await this.animateAndCommitMove(bestMove.from, bestMove.to, this.game.aiPlayer, bestMove.steps, bestMove.dieId || null);
            } else {
                this.game.makeMove(bestMove.from, bestMove.steps, this.game.aiPlayer, bestMove.dieId || null);
            }
            this.render();

            const winner = this.game.checkWinner();
            if (winner) {
                this.showMessage(`🏆 ${winner === 'white' ? 'سفید (AI)' : 'سیاه'} برنده شد! 🎉`, 'success');
                return;
            }
            await new Promise(r => setTimeout(r, 600));
        }

        console.log(`✅ AI ${moveCount} حرکت انجام داد`);
        this.game.endTurn();
        this.render();
        this.showMessage('✅ نوبت شما - تاس بزنید', 'success');
    }
}

window.BackgammonUI = BackgammonUI;
