/**
 * 界面管理模块
 * 负责游戏界面的状态显示、按钮控制和视觉效果
 */
class UIManager {
    constructor() {
        this.elements = {
            status: null,
            controls: null,
            undoButton: null,
            resetButton: null,
            markToggleButton: null
        };
        
        this.currentStatus = '';
        this.listeners = new Map();
        this.animations = new Map();
        
        this.init();
    }

    /**
     * 初始化UI元素
     */
    init() {
        this.elements.status = document.getElementById('status');
        this.elements.controls = document.getElementById('controls');
        this.elements.undoButton = this.elements.controls?.querySelector('.undo');
        this.elements.resetButton = this.elements.controls?.querySelector('.reset');
        this.elements.markToggleButton = document.getElementById('markToggle');
        
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        if (this.elements.undoButton) {
            this.elements.undoButton.addEventListener('click', () => {
                this.emit('undoRequested');
            });
        }

        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', () => {
                this.emit('resetRequested');
            });
        }

        if (this.elements.markToggleButton) {
            this.elements.markToggleButton.addEventListener('click', () => {
                this.emit('markToggleRequested');
            });
        }
    }

    /**
     * 更新状态显示
     */
    updateStatus(text) {
        if (this.elements.status) {
            this.currentStatus = text;
            this.elements.status.textContent = text;
            
            // 添加状态更新动画
            this.elements.status.style.opacity = '0.6';
            setTimeout(() => {
                if (this.elements.status) {
                    this.elements.status.style.opacity = '1';
                }
            }, 150);
        }
        
        this.emit('statusUpdated', text);
    }

    /**
     * 更新玩家回合显示
     */
    updatePlayerTurn(player) {
        const playerText = player === 1 ? '黑棋' : '白棋';
        this.updateStatus(`${playerText}回合`);
    }

    /**
     * 显示游戏结束状态
     */
    showGameOver(winner) {
        const winnerText = winner === 1 ? '黑棋' : '白棋';
        this.updateStatus(`${winnerText}获胜！`);
        
        // 可选：禁用撤销按钮
        this.setButtonEnabled('undo', false);
        
        this.emit('gameOverDisplayed', winner);
    }

    /**
     * 显示平局状态
     */
    showDraw() {
        this.updateStatus('平局！');
        this.setButtonEnabled('undo', false);
        this.emit('drawDisplayed');
    }

    /**
     * 设置按钮启用状态
     */
    setButtonEnabled(buttonType, enabled) {
        let button = null;
        
        switch (buttonType) {
            case 'undo':
                button = this.elements.undoButton;
                break;
            case 'reset':
                button = this.elements.resetButton;
                break;
            case 'markToggle':
                button = this.elements.markToggleButton;
                break;
        }
        
        if (button) {
            button.disabled = !enabled;
            button.style.opacity = enabled ? '1' : '0.5';
            button.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    }

    /**
     * 更新标记按钮状态
     */
    updateMarkToggleButton(isMarking) {
        if (this.elements.markToggleButton) {
            this.elements.markToggleButton.textContent = isMarking ? '关闭註记' : '开启註记';
            this.elements.markToggleButton.style.backgroundColor = isMarking ? '#ff6666' : '#ff0000';
        }
        
        this.emit('markToggleUpdated', isMarking);
    }

    /**
     * 高亮获胜棋子
     */
    highlightWinningStones(positions, gameBoard) {
        positions.forEach(([row, col]) => {
            const cell = gameBoard.getCell(row, col);
            if (cell) {
                cell.classList.add('winning-stone');
            }
        });
        
        this.emit('winningStoneHighlighted', positions);
    }

    /**
     * 显示烟火动画
     */
    showFirecrackerAnimation() {
        // 创建烟火容器
        const container = document.createElement('div');
        container.className = 'firecracker-container';
        document.body.appendChild(container);

        // 生成烟火粒子
        const particles = [];
        for (let i = 0; i < 80; i++) {
            const particle = document.createElement('div');
            particle.className = 'firecracker-particle';
            
            // 随机位置和颜色
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            
            // 设置随机终点位置
            particle.style.setProperty('--x', `${(Math.random() * 400 - 200)}px`);
            particle.style.setProperty('--y', `${(Math.random() * 400 - 200)}px`);
            
            container.appendChild(particle);
            particles.push(particle);
        }

        // 存储动画引用以便清理
        const animationId = Date.now();
        this.animations.set(animationId, container);

        // 清理动画元素
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
            this.animations.delete(animationId);
        }, 3000);

        this.emit('firecrackerAnimationStarted');
        
        return animationId;
    }

    /**
     * 显示预览位置
     */
    showPreviewPosition(row, col, gameBoard) {
        // 清除之前的预览
        this.clearAllPreviews(gameBoard);
        
        // 添加新的预览
        gameBoard.addCellClass(row, col, 'preview');
        
        this.emit('previewShown', { row, col });
    }

    /**
     * 清除所有预览
     */
    clearAllPreviews(gameBoard) {
        const boardElement = document.getElementById('board');
        if (boardElement) {
            const previewCells = boardElement.querySelectorAll('.preview');
            previewCells.forEach(cell => {
                cell.classList.remove('preview');
            });
        }
        
        this.emit('previewsCleared');
    }

    /**
     * 添加移动编号显示
     */
    addMoveNumber(row, col, stepNumber, gameBoard) {
        const cell = gameBoard.getCell(row, col);
        if (cell) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'move-number';
            numberSpan.textContent = stepNumber;
            cell.appendChild(numberSpan);
        }
        
        this.emit('moveNumberAdded', { row, col, stepNumber });
    }

    /**
     * 移除移动编号显示
     */
    removeMoveNumber(row, col, gameBoard) {
        const cell = gameBoard.getCell(row, col);
        if (cell) {
            const numberSpans = cell.querySelectorAll('.move-number');
            numberSpans.forEach(span => span.remove());
        }
        
        this.emit('moveNumberRemoved', { row, col });
    }

    /**
     * 切换标记模式的视觉反馈
     */
    toggleCellMark(row, col, gameBoard) {
        const cell = gameBoard.getCell(row, col);
        if (cell) {
            cell.classList.toggle('mark');
            const isMarked = cell.classList.contains('mark');
            this.emit('cellMarkToggled', { row, col, isMarked });
            return isMarked;
        }
        return false;
    }

    /**
     * 清除所有标记
     */
    clearAllMarks(gameBoard) {
        const boardElement = document.getElementById('board');
        if (boardElement) {
            const markedCells = boardElement.querySelectorAll('.mark');
            markedCells.forEach(cell => {
                cell.classList.remove('mark');
            });
        }
        
        this.emit('allMarksCleared');
    }

    /**
     * 显示加载状态
     */
    showLoading(message = '加载中...') {
        this.updateStatus(message);
        this.setButtonEnabled('undo', false);
        this.setButtonEnabled('reset', false);
        this.setButtonEnabled('markToggle', false);
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.setButtonEnabled('undo', true);
        this.setButtonEnabled('reset', true);
        this.setButtonEnabled('markToggle', true);
    }

    /**
     * 显示提示消息
     */
    showMessage(message, duration = 3000, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `game-message message-${type}`;
        messageElement.textContent = message;
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;

        document.body.appendChild(messageElement);

        // 显示动画
        setTimeout(() => {
            messageElement.style.opacity = '1';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            messageElement.style.opacity = '0';
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 300);
        }, duration);

        this.emit('messageShown', { message, type, duration });
    }

    /**
     * 重置UI状态
     */
    reset() {
        this.updateStatus('黑棋回合');
        this.setButtonEnabled('undo', true);
        this.setButtonEnabled('reset', true);
        this.setButtonEnabled('markToggle', true);
        this.updateMarkToggleButton(false);
        
        // 清理所有动画
        this.animations.forEach((container, id) => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        this.animations.clear();
        
        this.emit('uiReset');
    }

    /**
     * 获取当前状态
     */
    getCurrentStatus() {
        return this.currentStatus;
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
                    console.error(`UI事件监听器执行失败 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁UI管理器
     */
    destroy() {
        // 清理所有动画
        this.animations.forEach((container, id) => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        this.animations.clear();
        
        // 清理事件监听器
        this.listeners.clear();
        
        // 清理DOM引用
        Object.keys(this.elements).forEach(key => {
            this.elements[key] = null;
        });
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}
