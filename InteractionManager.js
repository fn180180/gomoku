/**
 * 交互管理模块
 * 负责处理用户交互、预览显示和游戏操作协调
 */
class InteractionManager {
    constructor(gameBoard, gameLogic, uiManager, audioManager) {
        this.gameBoard = gameBoard;
        this.gameLogic = gameLogic;
        this.uiManager = uiManager;
        this.audioManager = audioManager;
        
        this.isMarkingMode = false;
        this.prePlacePosition = null;
        this.isEnabled = true;
        
        this.init();
    }

    /**
     * 初始化交互管理器
     */
    init() {
        this.bindEvents();
        this.setupGameLogicListeners();
        this.setupUIListeners();
    }

    /**
     * 绑定棋盘点击事件
     */
    bindEvents() {
        this.gameBoard.registerClickHandler('main', (row, col, cell, event) => {
            this.handleCellClick(row, col, cell, event);
        });
    }

    /**
     * 设置游戏逻辑事件监听器
     */
    setupGameLogicListeners() {
        this.gameLogic.on('playerChanged', (player) => {
            this.uiManager.updatePlayerTurn(player);
        });

        this.gameLogic.on('gameWin', (data) => {
            this.handleGameWin(data);
        });

        this.gameLogic.on('gameReset', () => {
            this.handleGameReset();
        });
    }

    /**
     * 设置UI事件监听器
     */
    setupUIListeners() {
        this.uiManager.on('undoRequested', () => {
            this.handleUndoRequest();
        });

        this.uiManager.on('resetRequested', () => {
            this.handleResetRequest();
        });

        this.uiManager.on('markToggleRequested', () => {
            this.handleMarkToggleRequest();
        });
    }

    /**
     * 处理单元格点击事件
     */
    handleCellClick(row, col, cell, event) {
        if (!this.isEnabled) return;

        // 播放点击音效
        this.audioManager.playClickSound();

        if (this.isMarkingMode) {
            this.handleMarkingClick(row, col, cell);
        } else {
            this.handleNormalClick(row, col, cell);
        }
    }

    /**
     * 处理标记模式的点击
     */
    handleMarkingClick(row, col, cell) {
        const isMarked = this.uiManager.toggleCellMark(row, col, this.gameBoard);
        
        // 可以添加标记音效
        if (isMarked) {
            this.audioManager.playClickSound();
        }
    }

    /**
     * 处理正常游戏模式的点击
     */
    handleNormalClick(row, col, cell) {
        // 如果游戏已结束，不处理点击
        if (this.gameLogic.isGameOver()) {
            this.audioManager.playErrorSound();
            return;
        }

        // 如果点击的是已有棋子的位置
        if (!this.gameLogic.canPlaceStone(row, col)) {
            this.audioManager.playErrorSound();
            return;
        }

        // 处理预览逻辑
        if (this.prePlacePosition) {
            if (this.prePlacePosition.row === row && this.prePlacePosition.col === col) {
                // 点击同一位置，确认下棋
                this.confirmPlacement(row, col);
            } else {
                // 点击不同位置，更新预览
                this.updatePreview(row, col);
            }
        } else {
            // 首次点击，显示预览
            this.showPreview(row, col);
        }
    }

    /**
     * 显示预览
     */
    showPreview(row, col) {
        this.prePlacePosition = { row, col };
        this.uiManager.showPreviewPosition(row, col, this.gameBoard);
    }

    /**
     * 更新预览位置
     */
    updatePreview(row, col) {
        // 清除之前的预览
        if (this.prePlacePosition) {
            this.gameBoard.removeCellClass(
                this.prePlacePosition.row, 
                this.prePlacePosition.col, 
                'preview'
            );
        }
        
        // 显示新预览
        this.showPreview(row, col);
    }

    /**
     * 确认棋子放置
     */
    confirmPlacement(row, col) {
        // 清除预览
        this.clearPreview();
        
        // 尝试下棋
        const result = this.gameLogic.placeStone(row, col);
        
        if (result && result.success) {
            this.handleSuccessfulMove(result);
        } else {
            this.audioManager.playErrorSound();
            this.uiManager.showMessage('无法在此位置下棋', 2000, 'error');
        }
    }

    /**
     * 处理成功的移动
     */
    handleSuccessfulMove(result) {
        const { row, col, player, step } = result.moveData;
        
        // 播放下棋音效
        this.audioManager.playMoveSound();
        
        // 添加棋子样式
        const stoneClass = player === 1 ? 'black' : 'white';
        this.gameBoard.addCellClass(row, col, stoneClass);
        
        // 添加步数显示
        this.uiManager.addMoveNumber(row, col, step, this.gameBoard);
        
        // 检查是否获胜
        if (result.win) {
            this.handleGameWin({
                winner: player,
                winningPositions: result.winningPositions,
                moveData: result.moveData
            });
        }
    }

    /**
     * 处理游戏获胜
     */
    handleGameWin(data) {
        // 播放胜利音效
        this.audioManager.playVictorySound();
        
        // 高亮获胜棋子
        this.uiManager.highlightWinningStones(data.winningPositions, this.gameBoard);
        
        // 显示烟火动画
        this.uiManager.showFirecrackerAnimation();
        
        // 更新状态显示
        this.uiManager.showGameOver(data.winner);
        
        // 清除预览
        this.clearPreview();
        
        // 显示获胜提示
        setTimeout(() => {
            const winnerText = data.winner === 1 ? '黑棋' : '白棋';
            alert(`${winnerText}获胜！`);
        }, 300);
    }

    /**
     * 处理撤销请求
     */
    handleUndoRequest() {
        if (!this.isEnabled) return;

        // 清除预览
        this.clearPreview();
        
        // 这里需要和MoveHistory模块配合
        // 暂时使用简单的实现
        this.uiManager.showMessage('撤销功能需要配合MoveHistory模块', 2000, 'info');
    }

    /**
     * 处理重置请求
     */
    handleResetRequest() {
        if (!this.isEnabled) return;

        if (confirm('确定要开始新游戏吗？')) {
            this.resetGame();
        }
    }

    /**
     * 处理标记切换请求
     */
    handleMarkToggleRequest() {
        if (!this.isEnabled) return;

        this.toggleMarkingMode();
    }

    /**
     * 切换标记模式
     */
    toggleMarkingMode() {
        this.isMarkingMode = !this.isMarkingMode;
        
        // 清除预览和所有标记（如果退出标记模式）
        if (!this.isMarkingMode) {
            this.clearPreview();
            this.uiManager.clearAllMarks(this.gameBoard);
        }
        
        // 更新按钮状态
        this.uiManager.updateMarkToggleButton(this.isMarkingMode);
        
        // 播放切换音效
        this.audioManager.playClickSound();
    }

    /**
     * 清除预览
     */
    clearPreview() {
        if (this.prePlacePosition) {
            this.gameBoard.removeCellClass(
                this.prePlacePosition.row, 
                this.prePlacePosition.col, 
                'preview'
            );
            this.prePlacePosition = null;
        }
        
        this.uiManager.clearAllPreviews(this.gameBoard);
    }

    /**
     * 重置游戏
     */
    resetGame() {
        // 重置游戏逻辑
        this.gameLogic.reset();
        
        // 清除棋盘样式
        this.gameBoard.clearAllClasses();
        
        // 重置交互状态
        this.isMarkingMode = false;
        this.prePlacePosition = null;
        
        // 重置UI
        this.uiManager.reset();
    }

    /**
     * 处理游戏重置
     */
    handleGameReset() {
        this.clearPreview();
        this.isMarkingMode = false;
        this.uiManager.updateMarkToggleButton(false);
    }

    /**
     * 启用交互
     */
    enable() {
        this.isEnabled = true;
        this.uiManager.hideLoading();
    }

    /**
     * 禁用交互
     */
    disable() {
        this.isEnabled = false;
        this.clearPreview();
        this.uiManager.showLoading('游戏暂停...');
    }

    /**
     * 检查交互是否启用
     */
    isInteractionEnabled() {
        return this.isEnabled;
    }

    /**
     * 设置撤销处理器（用于与MoveHistory模块集成）
     */
    setUndoHandler(handler) {
        this.undoHandler = handler;
    }

    /**
     * 执行撤销（与MoveHistory模块集成时使用）
     */
    performUndo(moveData) {
        if (!moveData) return;

        const { row, col, player, step } = moveData;
        
        // 清除棋子样式
        const stoneClass = player === 1 ? 'black' : 'white';
        this.gameBoard.removeCellClass(row, col, stoneClass);
        this.gameBoard.removeCellClass(row, col, 'winning-stone');
        
        // 移除步数显示
        this.uiManager.removeMoveNumber(row, col, this.gameBoard);
        
        // 清除预览
        this.clearPreview();
        
        // 播放撤销音效
        this.audioManager.playClickSound();
    }

    /**
     * 获取当前模式
     */
    getCurrentMode() {
        return this.isMarkingMode ? 'marking' : 'playing';
    }

    /**
     * 获取预览位置
     */
    getPreviewPosition() {
        return this.prePlacePosition ? { ...this.prePlacePosition } : null;
    }

    /**
     * 销毁交互管理器
     */
    destroy() {
        // 移除事件处理器
        this.gameBoard.unregisterClickHandler('main');
        
        // 清理状态
        this.clearPreview();
        this.prePlacePosition = null;
        this.isMarkingMode = false;
        this.isEnabled = false;
        
        // 清理引用
        this.gameBoard = null;
        this.gameLogic = null;
        this.uiManager = null;
        this.audioManager = null;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
} else {
    window.InteractionManager = InteractionManager;
}
