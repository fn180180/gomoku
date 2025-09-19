/**
 * 游戏控制器模块
 * 负责协调各个模块，提供统一的游戏接口
 */
class GameController {
    constructor(config = {}) {
        this.config = {
            boardSize: 15,
            boardContainerId: 'board',
            enableAudio: true,
            enableHistory: true,
            maxHistorySize: 1000,
            ...config
        };

        this.modules = {
            gameBoard: null,
            gameLogic: null,
            moveHistory: null,
            audioManager: null,
            uiManager: null,
            interactionManager: null
        };

        this.isInitialized = false;
        this.gameState = 'idle'; // idle, playing, paused, finished
        
        this.init();
    }

    /**
     * 初始化游戏控制器
     */
    async init() {
        try {
            await this.initializeModules();
            this.setupModuleConnections();
            this.bindControllerEvents();
            
            this.isInitialized = true;
            this.gameState = 'playing';
            
            console.log('五子棋游戏初始化成功');
            return true;
        } catch (error) {
            console.error('游戏初始化失败:', error);
            return false;
        }
    }

    /**
     * 初始化各个模块
     */
    async initializeModules() {
        // 初始化棋盘
        this.modules.gameBoard = new GameBoard(
            this.config.boardSize, 
            this.config.boardContainerId
        );

        // 初始化游戏逻辑
        this.modules.gameLogic = new GameLogic(this.config.boardSize);

        // 初始化移动历史（如果启用）
        if (this.config.enableHistory) {
            this.modules.moveHistory = new MoveHistory();
            this.modules.moveHistory.setMaxHistorySize(this.config.maxHistorySize);
        }

        // 初始化音效管理器（如果启用）
        if (this.config.enableAudio) {
            this.modules.audioManager = new AudioManager();
        }

        // 初始化UI管理器
        this.modules.uiManager = new UIManager();

        // 初始化交互管理器
        this.modules.interactionManager = new InteractionManager(
            this.modules.gameBoard,
            this.modules.gameLogic,
            this.modules.uiManager,
            this.modules.audioManager
        );
    }

    /**
     * 设置模块间的连接
     */
    setupModuleConnections() {
        // 连接游戏逻辑和移动历史
        if (this.modules.moveHistory) {
            this.modules.gameLogic.on('stonePlaced', (moveData) => {
                this.modules.moveHistory.addMove(moveData);
            });

            // 设置撤销处理器
            this.modules.interactionManager.setUndoHandler(() => {
                this.performUndo();
            });
        }

        // 连接UI管理器的撤销请求到实际的撤销逻辑
        this.modules.uiManager.off('undoRequested', () => {}); // 移除默认处理器
        this.modules.uiManager.on('undoRequested', () => {
            this.performUndo();
        });
    }

    /**
     * 绑定控制器级别的事件
     */
    bindControllerEvents() {
        // 监听游戏获胜
        this.modules.gameLogic.on('gameWin', (data) => {
            this.gameState = 'finished';
            this.onGameWin(data);
        });

        // 监听游戏重置
        this.modules.gameLogic.on('gameReset', () => {
            this.gameState = 'playing';
            this.onGameReset();
        });

        // 监听移动历史变化
        if (this.modules.moveHistory) {
            this.modules.moveHistory.on('moveUndone', (moveData) => {
                this.onMoveUndone(moveData);
            });
        }
    }

    /**
     * 处理游戏获胜事件
     */
    onGameWin(data) {
        console.log(`游戏结束，获胜者: ${data.winner === 1 ? '黑棋' : '白棋'}`);
        
        // 可以在这里添加额外的获胜处理逻辑
        // 比如记录统计、保存游戏记录等
    }

    /**
     * 处理游戏重置事件
     */
    onGameReset() {
        console.log('游戏已重置');
        
        // 清空移动历史
        if (this.modules.moveHistory) {
            this.modules.moveHistory.clear();
        }
    }

    /**
     * 处理移动撤销事件
     */
    onMoveUndone(moveData) {
        console.log(`撤销移动: 第${moveData.step}步`);
        
        // 通知交互管理器执行撤销的视觉效果
        this.modules.interactionManager.performUndo(moveData);
    }

    /**
     * 执行撤销操作
     */
    performUndo() {
        if (!this.canUndo()) {
            this.modules.uiManager.showMessage('无法撤销', 2000, 'error');
            if (this.modules.audioManager) {
                this.modules.audioManager.playErrorSound();
            }
            return false;
        }

        // 从历史中撤销最后一步
        const lastMove = this.modules.moveHistory.undoLastMove();
        if (!lastMove) return false;

        // 从游戏逻辑中移除棋子
        this.modules.gameLogic.boardData[lastMove.row][lastMove.col] = 0;
        this.modules.gameLogic.currentPlayer = lastMove.player;
        this.modules.gameLogic.stepNumber = lastMove.step;
        this.modules.gameLogic.gameOver = false;
        this.modules.gameLogic.winner = null;

        // 更新UI状态
        this.modules.uiManager.updatePlayerTurn(lastMove.player);
        this.modules.uiManager.setButtonEnabled('undo', this.canUndo());

        // 触发游戏逻辑的玩家变更事件
        this.modules.gameLogic.emit('playerChanged', lastMove.player);

        this.gameState = 'playing';
        return true;
    }

    /**
     * 重置游戏
     */
    resetGame() {
        if (this.modules.interactionManager) {
            this.modules.interactionManager.resetGame();
        }
        
        // 游戏状态会通过gameLogic的reset事件自动更新
        return true;
    }

    /**
     * 暂停游戏
     */
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.modules.interactionManager.disable();
            this.modules.uiManager.showMessage('游戏已暂停', 2000, 'info');
            return true;
        }
        return false;
    }

    /**
     * 恢复游戏
     */
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.modules.interactionManager.enable();
            this.modules.uiManager.showMessage('游戏已恢复', 2000, 'info');
            return true;
        }
        return false;
    }

    /**
     * 检查是否可以撤销
     */
    canUndo() {
        return this.gameState === 'playing' && 
               this.modules.moveHistory && 
               this.modules.moveHistory.canUndo();
    }

    /**
     * 获取游戏统计信息
     */
    getGameStats() {
        const stats = {
            gameState: this.gameState,
            currentPlayer: this.modules.gameLogic.getCurrentPlayer(),
            currentStep: this.modules.gameLogic.getCurrentStep(),
            isGameOver: this.modules.gameLogic.isGameOver(),
            winner: this.modules.gameLogic.getWinner()
        };

        // 添加移动历史统计
        if (this.modules.moveHistory) {
            stats.moveHistory = this.modules.moveHistory.getStatistics();
        }

        return stats;
    }

    /**
     * 获取棋盘状态
     */
    getBoardState() {
        return {
            boardData: this.modules.gameLogic.getBoardData(),
            boardSize: this.config.boardSize,
            moveHistory: this.modules.moveHistory ? 
                this.modules.moveHistory.getAllMoves() : []
        };
    }

    /**
     * 导出游戏数据
     */
    exportGame() {
        const gameData = {
            config: this.config,
            boardState: this.getBoardState(),
            gameStats: this.getGameStats(),
            exportTime: new Date().toISOString()
        };

        return JSON.stringify(gameData, null, 2);
    }

    /**
     * 导入游戏数据
     */
    importGame(gameDataString) {
        try {
            const gameData = JSON.parse(gameDataString);
            
            // 验证数据格式
            if (!gameData.boardState || !gameData.boardState.boardData) {
                throw new Error('无效的游戏数据格式');
            }

            // 重置当前游戏
            this.resetGame();

            // 恢复游戏状态
            const { boardData, moveHistory } = gameData.boardState;
            
            // 重播移动历史
            if (moveHistory && this.modules.moveHistory) {
                moveHistory.forEach(move => {
                    // 恢复棋盘状态
                    const result = this.modules.gameLogic.placeStone(move.row, move.col);
                    if (result && result.success) {
                        // 更新视觉效果
                        this.modules.interactionManager.handleSuccessfulMove(result);
                    }
                });
            }

            this.modules.uiManager.showMessage('游戏导入成功', 3000, 'success');
            return true;
        } catch (error) {
            console.error('导入游戏失败:', error);
            this.modules.uiManager.showMessage('导入游戏失败: ' + error.message, 3000, 'error');
            return false;
        }
    }

    /**
     * 设置音效启用状态
     */
    setAudioEnabled(enabled) {
        if (this.modules.audioManager) {
            if (enabled) {
                this.modules.audioManager.enable();
            } else {
                this.modules.audioManager.disable();
            }
            return true;
        }
        return false;
    }

    /**
     * 设置音量
     */
    setVolume(volume) {
        if (this.modules.audioManager) {
            this.modules.audioManager.setVolume(volume);
            return true;
        }
        return false;
    }

    /**
     * 获取指定位置的棋子
     */
    getStone(row, col) {
        return this.modules.gameLogic.getStone(row, col);
    }

    /**
     * 检查指定位置是否可以下棋
     */
    canPlaceStone(row, col) {
        return this.modules.gameLogic.canPlaceStone(row, col);
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
        return this.modules.gameLogic.getCurrentPlayer();
    }

    /**
     * 检查游戏是否结束
     */
    isGameOver() {
        return this.modules.gameLogic.isGameOver();
    }

    /**
     * 获取获胜者
     */
    getWinner() {
        return this.modules.gameLogic.getWinner();
    }

    /**
     * 检查是否平局
     */
    isDraw() {
        return this.modules.gameLogic.isDraw();
    }

    /**
     * 获取游戏状态
     */
    getGameState() {
        return this.gameState;
    }

    /**
     * 检查是否已初始化
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * 注册自定义事件监听器
     */
    on(event, listener) {
        // 将事件代理到相应的模块
        switch (event) {
            case 'stonePlaced':
            case 'gameWin':
            case 'gameReset':
            case 'playerChanged':
                this.modules.gameLogic.on(event, listener);
                break;
            case 'moveAdded':
            case 'moveUndone':
                if (this.modules.moveHistory) {
                    this.modules.moveHistory.on(event, listener);
                }
                break;
            case 'statusUpdated':
            case 'gameOverDisplayed':
                this.modules.uiManager.on(event, listener);
                break;
            default:
                console.warn(`未知的事件类型: ${event}`);
        }
    }

    /**
     * 移除事件监听器
     */
    off(event, listener) {
        // 将事件代理到相应的模块
        switch (event) {
            case 'stonePlaced':
            case 'gameWin':
            case 'gameReset':
            case 'playerChanged':
                this.modules.gameLogic.off(event, listener);
                break;
            case 'moveAdded':
            case 'moveUndone':
                if (this.modules.moveHistory) {
                    this.modules.moveHistory.off(event, listener);
                }
                break;
            case 'statusUpdated':
            case 'gameOverDisplayed':
                this.modules.uiManager.off(event, listener);
                break;
        }
    }

    /**
     * 销毁游戏控制器
     */
    destroy() {
        // 按依赖顺序销毁模块
        const destructionOrder = [
            'interactionManager',
            'uiManager',
            'audioManager',
            'moveHistory',
            'gameLogic',
            'gameBoard'
        ];

        destructionOrder.forEach(moduleName => {
            if (this.modules[moduleName] && typeof this.modules[moduleName].destroy === 'function') {
                try {
                    this.modules[moduleName].destroy();
                } catch (error) {
                    console.error(`销毁模块 ${moduleName} 时出错:`, error);
                }
                this.modules[moduleName] = null;
            }
        });

        this.isInitialized = false;
        this.gameState = 'idle';
        
        console.log('游戏控制器已销毁');
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameController;
} else {
    window.GameController = GameController;
}
