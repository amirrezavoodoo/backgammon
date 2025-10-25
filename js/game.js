class BackgammonGame {
    constructor() {
        this.board = Array(24).fill(null).map(() => ({ color: null, count: 0 }));
        this.bar = { white: 0, black: 0 };
        this.bornOff = { white: 0, black: 0 };
        this.currentPlayer = 'white';
        this.dice = { values: [], remaining: [], rolled: false };
        this.selectedPoint = null;
        this.possibleMoves = [];
        this.gameStates = [];
        this.moveHistory = [];
        this.isAnimating = false;
    this.aiPlayer = 'black'; // AI همیشه سیاه است

        this.initializeBoard();
        this.saveState('init');
    }

    initializeBoard() {
        this.board[0] = { color: 'black', count: 2 };
        this.board[5] = { color: 'white', count: 5 };
        this.board[7] = { color: 'white', count: 3 };
        this.board[11] = { color: 'black', count: 5 };
        this.board[12] = { color: 'white', count: 5 };
        this.board[16] = { color: 'black', count: 3 };
        this.board[18] = { color: 'black', count: 5 };
        this.board[23] = { color: 'white', count: 2 };
    }

    rollDice() {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;

        if (die1 === die2) {
            this.dice.values = [die1, die1, die1, die1];
        } else {
            this.dice.values = [die1, die2];
        }

        this.dice.remaining = this.dice.values.map((value, index) => ({
            value,
            id: index + 1,
            used: false
        }));

        this.dice.rolled = true;
        this.saveState('roll');
        return this.dice.values;
    }

    getAllLegalMoves(player) {
        const moves = [];

        if (this.bar[player] > 0) {
            for (const die of this.dice.remaining) {
                if (die.used) continue;
                if (this.canMoveFromBar(player, die.value)) {
                    const to = player === 'white' ? 24 - die.value : die.value - 1;
                    moves.push({ from: -1, to, steps: die.value, dieId: die.id });
                }
            }
            return moves;
        }

        for (let i = 0; i < 24; i++) {
            const point = this.board[i];
            if (point.color !== player || point.count === 0) continue;

            for (const die of this.dice.remaining) {
                if (die.used) continue;
                const result = this.canMove(i, die.value, player);
                if (result.canMove) {
                    moves.push({
                        from: i,
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

    hasMovesLeft(player) {
        return this.getAllLegalMoves(player).length > 0;
    }

    canMoveFromBar(player, steps) {
        const targetPoint = player === 'white' ? 24 - steps : steps - 1;
        const target = this.board[targetPoint];
        return !target.color || target.color === player || target.count === 1;
    }

    canMove(from, steps, player) {
        const direction = player === 'white' ? -1 : 1;
        const destination = from + (steps * direction);

        // Bear‑off
        if (this.canBearOff(player)) {
            if (player === 'white' && destination < 0) {
                const exactMatch = destination === -1;
                if (!exactMatch) {
                    const hasHigher = this.hasCheckersHigherThan(from, player);
                    if (hasHigher) return { canMove: false };
                }
                return { canMove: true, isBearOff: true, destination: -1 };
            }
            if (player === 'black' && destination >= 24) {
                const exactMatch = destination === 24;
                if (!exactMatch) {
                    const hasHigher = this.hasCheckersHigherThan(from, player);
                    if (hasHigher) return { canMove: false };
                }
                return { canMove: true, isBearOff: true, destination: -1 };
            }
        }

        if (destination < 0 || destination >= 24) return { canMove: false };

        const targetPoint = this.board[destination];
        if (targetPoint.color && targetPoint.color !== player && targetPoint.count > 1) {
            return { canMove: false };
        }

        return { canMove: true, destination, isBearOff: false };
    }

    canBearOff(player) {
        if (this.bar[player] > 0) return false;
        const homeRange = player === 'white' ? [0, 6] : [18, 24];
        for (let i = 0; i < 24; i++) {
            if (i >= homeRange[0] && i < homeRange[1]) continue;
            const point = this.board[i];
            if (point.color === player && point.count > 0) return false;
        }
        return true;
    }

    hasCheckersHigherThan(position, player) {
        if (player === 'white') {
            for (let i = position + 1; i < 24; i++) {
                if (this.board[i].color === player && this.board[i].count > 0)
                    return true;
            }
        } else {
            for (let i = position - 1; i >= 0; i--) {
                if (this.board[i].color === player && this.board[i].count > 0)
                    return true;
            }
        }
        return false;
    }

    makeMove(from, steps, player, dieId = null) {
        const can = from === -1 ? this.canMoveFromBar(player, steps)
                                : this.canMove(from, steps, player);
        if (!can && from !== -1) return false;
        if (from === -1 && !can) return false;

        let destination, isBearOff = false;

        if (from === -1) {
            destination = player === 'white' ? 24 - steps : steps - 1;
            this.bar[player]--;
        } else {
            destination = can.destination;
            isBearOff = can.isBearOff;
            this.board[from].count--;
            if (this.board[from].count === 0)
                this.board[from].color = null;
        }

        if (isBearOff) {
            this.bornOff[player]++;
        } else {
            const targetPoint = this.board[destination];
            if (targetPoint.color && targetPoint.color !== player && targetPoint.count === 1) {
                const opponent = player === 'white' ? 'black' : 'white';
                this.bar[opponent]++;
                targetPoint.count = 0;
                targetPoint.color = null;
            }
            targetPoint.color = player;
            targetPoint.count++;
        }

        let dieIndex = -1;
        if (dieId !== null)
            dieIndex = this.dice.remaining.findIndex(d => d.id === dieId && !d.used);
        if (dieIndex === -1)
            dieIndex = this.dice.remaining.findIndex(d => d.value === steps && !d.used);
        if (dieIndex !== -1)
            this.dice.remaining[dieIndex].used = true;

        this.saveState('move');
        return true;
    }

    endTurn() {
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.dice = { values: [], remaining: [], rolled: false };
        this.selectedPoint = null;
        this.possibleMoves = [];
        this.saveState('endTurn');
    }

    checkWinner() {
        if (this.bornOff.white === 15) return 'white';
        if (this.bornOff.black === 15) return 'black';
        return null;
    }

    // action: 'init' | 'roll' | 'move' | 'endTurn' | ... (optional)
    saveState(action = 'generic') {
        this.gameStates.push({
            board: JSON.parse(JSON.stringify(this.board)),
            bar: { ...this.bar },
            bornOff: { ...this.bornOff },
            currentPlayer: this.currentPlayer,
            dice: JSON.parse(JSON.stringify(this.dice)),
            action
        });
    }

    // Returns true only when undo is allowed and performed.
    undo() {
        if (!this.canUndo()) return false;
        // We only allow undoing the most recent move that directly follows a roll.
        // Pop the top (the move) and restore the previous (the roll) state.
        this.gameStates.pop();
        const s = this.gameStates[this.gameStates.length - 1];
        this.board = JSON.parse(JSON.stringify(s.board));
        this.bar = { ...s.bar };
        this.bornOff = { ...s.bornOff };
        this.currentPlayer = s.currentPlayer;
        this.dice = JSON.parse(JSON.stringify(s.dice));
        this.selectedPoint = null;
        this.possibleMoves = [];
        return true;
    }

    // Returns whether undo() would be allowed right now.
    canUndo() {
        if (this.gameStates.length <= 1) return false;
        const top = this.gameStates[this.gameStates.length - 1];
        // Never allow undoing a plain roll (i.e., when the top state is a roll).
        if (top.action === 'roll') return false;
        // Allow undo only when top is a move and the previous state was a roll.
        if (top.action === 'move') {
            const prev = this.gameStates[this.gameStates.length - 2];
            return prev && prev.action === 'roll';
        }
        return false;
    }

    cloneState() {
        return {
            board: JSON.parse(JSON.stringify(this.board)),
            bar: { ...this.bar },
            bornOff: { ...this.bornOff },
            currentPlayer: this.currentPlayer,
            dice: JSON.parse(JSON.stringify(this.dice))
        };
    }

    restoreFromClone(state) {
        this.board = JSON.parse(JSON.stringify(state.board));
        this.bar = { ...state.bar };
        this.bornOff = { ...state.bornOff };
        this.currentPlayer = state.currentPlayer;
        this.dice = JSON.parse(JSON.stringify(state.dice));
    }
}

window.BackgammonGame = BackgammonGame;
