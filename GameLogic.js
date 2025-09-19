/**
 * 游戏逻辑模块
 * 负责游戏状态管理、规则判断和胜负检测
 */
class GameLogic {
    constructor(boardSize = 15) {
        this.boardSize = boardSize;
        this.reset();
        this.listeners = new Map();
    }

    /**
     * 重置游戏状态
     */
    reset() {
        this.boardData = Array(this.boardSize).fill().map(() => 
            Array(this.boardSize).fill(0)
        );
        this.currentPlayer = 1; // 1: 黑棋, 2: 白棋
        this.stepNumber = 1;
        this.gameOver = false;
        this.winner = null;
        
        this.emit('gameReset');
        this.emit('playerChanged', this.currentPlayer);
    }

    /**
     * 检查指定位置是否可以放置棋子
     */
    canPlaceStone(row, col) {
        return !this.gameOver && 
               row >= 0 && row < this.boardSize &&
               col >= 0 && col < this.boardSize &&
               this.boardData[row][col] === 0;
    }

    /**
     * 放置棋子
     */
    placeStone(row, col) {
        if (!this.canPlaceStone(row, col)) {
            return false;
        }

        const moveData = {
            row,
            col,
            player: this.currentPlayer,
            step: this.stepNumber
        };

        this.boardData[row][col] = this.currentPlayer;
        
        // 检查是否获胜
        const winningPositions = this.checkWin(row, col);
        if (winningPositions) {
            this.gameOver = true;
            this.winner = this.currentPlayer;
            
            this.emit('gameWin', {
                winner: this.currentPlayer,
                winningPositions,
                moveData
            });
            
            return { success: true, win: true, winningPositions, moveData };
        }

        // 切换玩家
        this.stepNumber++;
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        this.emit('stonePlaced', moveData);
        this.emit('playerChanged', this.currentPlayer);
        
        return { success: true, win: false, moveData };
    }

    /**
     * 检查获胜条件
     */
    checkWin(row, col) {
        const player = this.boardData[row][col];
        if (player === 0) return false;

        const directions = [
            [0, 1],   // horizontal
            [1, 0],   // vertical
            [1, 1],   // diagonal down-right
            [1, -1]   // diagonal down-left
        ];

        for (const [dx, dy] of directions) {
            let count = 1;
            let winningPositions = [[row, col]];

            // 正方向检查
            let r = row + dx;
            let c = col + dy;
            while (this.isValidPosition(r, c) && this.boardData[r][c] === player) {
                count++;
                winningPositions.push([r, c]);
                r += dx;
                c += dy;
            }

            // 负方向检查
            r = row - dx;
            c = col - dy;
            while (this.isValidPosition(r, c) && this.boardData[r][c] === player) {
                count++;
                winningPositions.push([r, c]);
                r -= dx;
                c -= dy;
            }

            if (count === 5) {
                return winningPositions;
            }
        }

        return false;
    }

    /**
     * 检查位置是否有效
     */
    isValidPosition(row, col) {
        return row >= 0 && row < this.boardSize && 
               col >= 0 && col < this.boardSize;
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * 获取当前步数
     */
    getCurrentStep() {
        return this.stepNumber;
    }

    /**
     * 获取棋盘状态
     */
    getBoardData() {
        return this.boardData.map(row => [...row]);
    }

    /**
     * 获取指定位置的棋子
     */
    getStone(row, col) {
        if (!this.isValidPosition(row, col)) return null;
        return this.boardData[row][col];
    }

    /**
     * 游戏是否结束
     */
    isGameOver() {
        return this.gameOver;
    }

    /**
     * 获取获胜者
     */
    getWinner() {
        return this.winner;
    }

    /**
     * 检查是否平局
     */
    isDraw() {
        if (this.gameOver && this.winner === null) return true;
        
        // 检查棋盘是否已满
        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                if (this.boardData[i][j] === 0) return false;
            }
        }
        
        return true;
    }

    /**
     * 事件监听器管理
     */
    on(event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
    }

    off(event, listener) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(listener);
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`事件监听器执行失败 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁游戏逻辑实例
     */
    destroy() {
        this.listeners.clear();
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameLogic;
} else {
    window.GameLogic = GameLogic;
}
