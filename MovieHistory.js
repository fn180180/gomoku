/**
 * 移动历史模块
 * 负责记录和管理游戏的移动历史，支持撤销操作
 */
class MoveHistory {
    constructor() {
        this.history = [];
        this.maxHistorySize = 1000; // 最大历史记录数
        this.listeners = new Map();
    }

    /**
     * 添加移动记录
     */
    addMove(moveData) {
        const move = {
            row: moveData.row,
            col: moveData.col,
            player: moveData.player,
            step: moveData.step,
            timestamp: Date.now()
        };

        this.history.push(move);
        
        // 限制历史记录大小
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }

        this.emit('moveAdded', move);
        return move;
    }

    /**
     * 撤销最后一步移动
     */
    undoLastMove() {
        if (this.history.length === 0) {
            return null;
        }

        const lastMove = this.history.pop();
        this.emit('moveUndone', lastMove);
        
        return lastMove;
    }

    /**
     * 获取最后一步移动
     */
    getLastMove() {
        return this.history.length > 0 ? this.history[this.history.length - 1] : null;
    }

    /**
     * 获取指定步数的移动
     */
    getMoveByStep(step) {
        return this.history.find(move => move.step === step) || null;
    }

    /**
     * 获取所有移动历史
     */
    getAllMoves() {
        return [...this.history];
    }

    /**
     * 获取指定玩家的移动历史
     */
    getMovesByPlayer(player) {
        return this.history.filter(move => move.player === player);
    }

    /**
     * 获取历史记录长度
     */
    getLength() {
        return this.history.length;
    }

    /**
     * 检查是否可以撤销
     */
    canUndo() {
        return this.history.length > 0;
    }

    /**
     * 清空历史记录
     */
    clear() {
        const oldHistory = [...this.history];
        this.history = [];
        this.emit('historyCleared', oldHistory);
    }

    /**
     * 获取移动统计
     */
    getStatistics() {
        const stats = {
            totalMoves: this.history.length,
            blackMoves: 0,
            whiteMoves: 0,
            averageThinkTime: 0
        };

        if (this.history.length === 0) {
            return stats;
        }

        let totalThinkTime = 0;
        let lastTimestamp = null;

        this.history.forEach((move, index) => {
            if (move.player === 1) {
                stats.blackMoves++;
            } else {
                stats.whiteMoves++;
            }

            // 计算思考时间（除了第一步）
            if (index > 0 && lastTimestamp) {
                totalThinkTime += move.timestamp - lastTimestamp;
            }
            lastTimestamp = move.timestamp;
        });

        if (this.history.length > 1) {
            stats.averageThinkTime = Math.round(totalThinkTime / (this.history.length - 1));
        }

        return stats;
    }

    /**
     * 导出历史记录为JSON
     */
    exportToJSON() {
        return JSON.stringify({
            history: this.history,
            exportTime: Date.now(),
            version: '1.0'
        }, null, 2);
    }

    /**
     * 从JSON导入历史记录
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.history || !Array.isArray(data.history)) {
                throw new Error('无效的历史记录格式');
            }

            // 验证每个移动记录的格式
            for (const move of data.history) {
                if (typeof move.row !== 'number' || 
                    typeof move.col !== 'number' ||
                    typeof move.player !== 'number' ||
                    typeof move.step !== 'number') {
                    throw new Error('移动记录格式不正确');
                }
            }

            this.history = data.history;
            this.emit('historyImported', data);
            
            return true;
        } catch (error) {
            console.error('导入历史记录失败:', error);
            return false;
        }
    }

    /**
     * 回放移动历史
     */
    replay(callback, interval = 1000) {
        if (typeof callback !== 'function') {
            throw new Error('回放需要提供回调函数');
        }

        let index = 0;
        const replayInterval = setInterval(() => {
            if (index >= this.history.length) {
                clearInterval(replayInterval);
                this.emit('replayFinished');
                return;
            }

            callback(this.history[index], index);
            index++;
        }, interval);

        this.emit('replayStarted');
        return replayInterval;
    }

    /**
     * 设置最大历史记录数
     */
    setMaxHistorySize(size) {
        this.maxHistorySize = Math.max(1, size);
        
        // 如果当前历史超过新的限制，截断历史
        if (this.history.length > this.maxHistorySize) {
            const removed = this.history.splice(0, this.history.length - this.maxHistorySize);
            this.emit('historyTruncated', removed);
        }
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
     * 销毁历史管理器
     */
    destroy() {
        this.clear();
        this.listeners.clear();
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MoveHistory;
} else {
    window.MoveHistory = MoveHistory;
}
