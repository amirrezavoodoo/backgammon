class BackgammonGrandmasterAI {
    constructor(game, difficulty = 'hard') {
        this.game = game;

        this.configs = {
            easy: { depth: 1, pruning: 0.3, randomness: 0.3 },
            medium: { depth: 2, pruning: 0.5, randomness: 0.15 },
            hard: { depth: 3, pruning: 0.7, randomness: 0.05 },
            expert: { depth: 4, pruning: 0.85, randomness: 0.02 },
            grandmaster: { depth: 5, pruning: 1.0, randomness: 0 }
        };

        this.config = this.configs[difficulty] || this.configs.hard;
        this.maxDepth = this.config.depth;
        this.transpositionTable = new Map();
        this.weights = this.initializeWeights();
    }

    initializeWeights() {
        return {
            opening: {
                pipCount: 8, bornOff: 80, barPenalty: 200, blots: 40,
                primes: 35, homeBoard: 12, distribution: 6, threats: 50,
                anchors: 45, builders: 30
            },
            middle: {
                pipCount: 12, bornOff: 120, barPenalty: 180, blots: 35,
                primes: 45, homeBoard: 20, distribution: 4, threats: 45,
                anchors: 40, builders: 25
            },
            endgame: {
                pipCount: 20, bornOff: 200, barPenalty: 250, blots: 25,
                primes: 20, homeBoard: 35, distribution: 8, threats: 30,
                anchors: 15, builders: 10
            }
        };
    }

    detectGamePhase(player) {
        const bornOff = this.game.bornOff[player];
        const homeCount = this.countCheckersInHome(player);
        const pipCount = this.calculatePipCount(player);

        if (bornOff > 5 || homeCount >= 12) return 'endgame';
        else if (pipCount < 100) return 'middle';
        return 'opening';
    }

    getBestMove(player) {
        const legalMoves = this.game.getAllLegalMoves(player);
        if (legalMoves.length === 0) return null;

        this.transpositionTable.clear();
        let bestMove = null;
        let bestScore = -Infinity;

        for (let depth = 1; depth <= this.maxDepth; depth++) {
            let currentBest = null;
            let currentScore = -Infinity;

            for (const move of legalMoves) {
                const clone = this.game.cloneState();
                this.game.makeMove(move.from, move.steps, player, move.dieId || null);

                const score = this.alphaBetaNegamax(
                    depth - 1, -Infinity, Infinity, player, false
                );

                this.game.restoreFromClone(clone);
                const finalScore = score + (Math.random() * this.config.randomness * 100);

                if (finalScore > currentScore) {
                    currentScore = finalScore;
                    currentBest = move;
                }
            }

            if (currentScore > bestScore) {
                bestScore = currentScore;
                bestMove = currentBest;
            }

            if (bestScore > 99000) break;
        }

        return bestMove;
    }

    alphaBetaNegamax(depth, alpha, beta, player, isMaximizing) {
        const boardHash = this.hashBoard();
        const cached = this.transpositionTable.get(boardHash);
        if (cached && cached.depth >= depth) return cached.score;

        if (depth === 0 || this.game.checkWinner()) {
            const score = this.evaluatePositionGrandmaster(player);
            this.transpositionTable.set(boardHash, { score, depth });
            return score;
        }

        const currentPlayer = isMaximizing ? player : (player === 'white' ? 'black' : 'white');
        const moves = this.game.getAllLegalMoves(currentPlayer);

        if (moves.length === 0) {
            const score = this.evaluatePositionGrandmaster(player);
            this.transpositionTable.set(boardHash, { score, depth });
            return score;
        }

        let value = -Infinity;
        const orderedMoves = this.orderMoves(moves, currentPlayer);

        for (const move of orderedMoves) {
            const clone = this.game.cloneState();
            this.game.makeMove(move.from, move.steps, currentPlayer, move.dieId || null);

            const score = -this.alphaBetaNegamax(depth - 1, -beta, -alpha, player, !isMaximizing);

            this.game.restoreFromClone(clone);
            value = Math.max(value, score);
            alpha = Math.max(alpha, score);

            if (alpha >= beta) break;
        }

        this.transpositionTable.set(boardHash, { score: value, depth });
        return value;
    }

    orderMoves(moves, player) {
        return moves.sort((a, b) => {
            const scoreA = this.quickEvaluateMove(a, player);
            const scoreB = this.quickEvaluateMove(b, player);
            return scoreB - scoreA;
        });
    }

    quickEvaluateMove(move, player) {
        let score = 0;
        if (move.to === -1) score += 1000;

        const toPoint = this.game.board[move.to];
        if (toPoint && toPoint.color !== player && toPoint.count === 1) {
            score += 500;
        }

        if (move.to >= 0 && move.to < 24) {
            const point = this.game.board[move.to];
            if (point.color === player) score += point.count * 50;
        }

        return score;
    }

    hashBoard() {
        let hash = '';
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            hash += `${i}:${point.color || 'e'}${point.count},`;
        }
        hash += `b:${this.game.bar.white}-${this.game.bar.black},`;
        hash += `o:${this.game.bornOff.white}-${this.game.bornOff.black}`;
        return hash;
    }

    evaluatePositionGrandmaster(player) {
        const opponent = player === 'white' ? 'black' : 'white';
        const phase = this.detectGamePhase(player);
        const w = this.weights[phase];
        let score = 0;

        if (this.game.bornOff[player] === 15) return 100000;
        if (this.game.bornOff[opponent] === 15) return -100000;

        const pipPlayer = this.calculatePipCount(player);
        const pipOpponent = this.calculatePipCount(opponent);
        score += (pipOpponent - pipPlayer) * w.pipCount;

        const bornOffDiff = this.game.bornOff[player] - this.game.bornOff[opponent];
        score += bornOffDiff * w.bornOff;

        score -= this.game.bar[player] * w.barPenalty;
        score += this.game.bar[opponent] * w.barPenalty;

        const playerBlots = this.countWeightedBlots(player);
        const opponentBlots = this.countWeightedBlots(opponent);
        score -= playerBlots * w.blots;
        score += opponentBlots * w.blots;

        const playerPrimes = this.calculatePrimeStrength(player);
        const opponentPrimes = this.calculatePrimeStrength(opponent);
        score += playerPrimes * w.primes;
        score -= opponentPrimes * w.primes;

        const playerHome = this.countCheckersInHome(player);
        const opponentHome = this.countCheckersInHome(opponent);
        score += playerHome * w.homeBoard;
        score -= opponentHome * w.homeBoard;

        const playerDist = this.calculateDistribution(player);
        const opponentDist = this.calculateDistribution(opponent);
        score -= playerDist * w.distribution;
        score += opponentDist * w.distribution;

        const playerThreats = this.countAdvancedThreats(player, opponent);
        const opponentThreats = this.countAdvancedThreats(opponent, player);
        score += playerThreats * w.threats;
        score -= opponentThreats * w.threats;

        const playerAnchors = this.countAnchors(player);
        const opponentAnchors = this.countAnchors(opponent);
        score += playerAnchors * w.anchors;
        score -= opponentAnchors * w.anchors;

        const playerBuilders = this.countBuilders(player);
        const opponentBuilders = this.countBuilders(opponent);
        score += playerBuilders * w.builders;
        score -= opponentBuilders * w.builders;

        const contactCount = this.calculateContactCount();
        if (contactCount === 0) {
            score += (pipOpponent - pipPlayer) * 5;
        }

        const gammonThreat = this.evaluateGammonRisk(player, opponent);
        score += gammonThreat;

        const playerFlexibility = this.calculateFlexibility(player);
        const opponentFlexibility = this.calculateFlexibility(opponent);
        score += (playerFlexibility - opponentFlexibility) * 10;

        return score;
    }

    countWeightedBlots(player) {
        let weightedBlots = 0;
        const opponent = player === 'white' ? 'black' : 'white';

        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === player && point.count === 1) {
                const danger = this.calculateHitProbability(i, opponent);
                weightedBlots += (1 + danger);
            }
        }
        return weightedBlots;
    }

    calculateHitProbability(position, attacker) {
        let probability = 0;
        for (let steps = 1; steps <= 6; steps++) {
            const fromPos = attacker === 'white' ? position + steps : position - steps;
            if (fromPos >= 0 && fromPos < 24) {
                const from = this.game.board[fromPos];
                if (from.color === attacker && from.count > 0) {
                    const diceProb = steps === 6 ? 11/36 : (36-steps)/36;
                    probability += diceProb;
                }
            }
        }
        return Math.min(probability, 1);
    }

    calculatePrimeStrength(player) {
        let strength = 0;
        let currentPrime = 0;
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === player && point.count >= 2) {
                currentPrime++;
                strength += Math.pow(currentPrime, 1.5);
            } else {
                currentPrime = 0;
            }
        }
        return strength;
    }

    countAnchors(player) {
        let anchors = 0;
        const opponentHome = player === 'white' ? [0, 6] : [18, 24];
        for (let i = opponentHome[0]; i < opponentHome[1]; i++) {
            const point = this.game.board[i];
            if (point.color === player && point.count >= 2) {
                const weight = player === 'white' ? (6 - i) : (i - 17);
                anchors += weight;
            }
        }
        return anchors;
    }

    countBuilders(player) {
        let builders = 0;
        const midRange = player === 'white' ? [6, 12] : [12, 18];
        for (let i = midRange[0]; i < midRange[1]; i++) {
            const point = this.game.board[i];
            if (point.color === player && point.count >= 1) {
                builders += point.count;
            }
        }
        return builders;
    }

    calculateContactCount() {
        let contacts = 0;
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.count > 0) {
                for (let j = i + 1; j <= Math.min(i + 6, 23); j++) {
                    const otherPoint = this.game.board[j];
                    if (otherPoint.count > 0 && otherPoint.color !== point.color) {
                        contacts++;
                    }
                }
            }
        }
        return contacts;
    }

    evaluateGammonRisk(player, opponent) {
        let score = 0;
        if (this.game.bornOff[opponent] === 0) {
            score += 300;
            const trappedInHome = this.countTrappedInHome(opponent, player);
            score += trappedInHome * 100;
        }
        if (this.game.bornOff[player] === 0) {
            const trappedInHome = this.countTrappedInHome(player, opponent);
            score -= trappedInHome * 150;
        }
        return score;
    }

    countTrappedInHome(player, opponent) {
        const opponentHome = opponent === 'white' ? [18, 24] : [0, 6];
        let trapped = 0;
        for (let i = opponentHome[0]; i < opponentHome[1]; i++) {
            const point = this.game.board[i];
            if (point.color === player) trapped += point.count;
        }
        return trapped;
    }

    calculateFlexibility(player) {
        let flexibility = 0;
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === player && point.count > 0) {
                for (let steps = 1; steps <= 6; steps++) {
                    const targetPos = player === 'white' ? i - steps : i + steps;
                    if (targetPos >= 0 && targetPos < 24) {
                        const target = this.game.board[targetPos];
                        if (!target.color || target.color === player || target.count === 1) {
                            flexibility++;
                        }
                    }
                }
            }
        }
        return flexibility;
    }

    countAdvancedThreats(player, opponent) {
        let threats = 0;
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === opponent && point.count === 1) {
                const hitProb = this.calculateHitProbability(i, player);
                const val = this.calculateHitValue(i, opponent);
                threats += hitProb * val;
            }
        }
        return threats;
    }

    calculateHitValue(position, player) {
        const homeRange = player === 'white' ? [18, 24] : [0, 6];
        if (position >= homeRange[0] && position < homeRange[1]) return 3;
        else if (position >= 6 && position < 18) return 2;
        return 1;
    }

    calculatePipCount(player) {
        let pipCount = 0;
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === player) {
                const dist = player === 'white' ? (24 - i) : (i + 1);
                pipCount += dist * point.count;
            }
        }
        pipCount += this.game.bar[player] * 25;
        return pipCount;
    }

    countCheckersInHome(player) {
        let count = 0;
        const homeRange = player === 'white' ? [18, 24] : [0, 6];
        for (let i = homeRange[0]; i < homeRange[1]; i++) {
            const point = this.game.board[i];
            if (point.color === player) count += point.count;
        }
        return count;
    }

    calculateDistribution(player) {
        const positions = [];
        for (let i = 0; i < 24; i++) {
            const point = this.game.board[i];
            if (point.color === player) {
                for (let j = 0; j < point.count; j++) positions.push(i);
            }
        }
        if (positions.length === 0) return 0;
        const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
        const variance = positions.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / positions.length;
        return Math.sqrt(variance);
    }
}

window.BackgammonGrandmasterAI = BackgammonGrandmasterAI;
