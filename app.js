/**
 * 主应用模块
 * 负责整个游戏应用的启动和全局管理
 */
class GomokuApp {
    constructor() {
        this.gameController = null;
        this.isLoaded = false;
        this.config = {
            boardSize: 15,
            boardContainerId: 'board',
            enableAudio: true,
            enableHistory: true,
            maxHistorySize: 1000,
            autoSave: true,
            autoSaveInterval: 30000, // 30秒自动保存
            debugMode: false
        };
        
        this.autoSaveTimer = null;
        this.beforeUnloadHandler = null;
    }

    /**
     * 初始化应用
     */
    async init() {
        try {
            console.log('五子棋应用启动中...');
            
            // 检查DOM是否就绪
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // 验证必需的DOM元素
            this.validateRequiredElements();

            // 加载配置
            this.loadConfiguration();

            // 初始化游戏控制器
            this.gameController = new GameController(this.config);
            const success = await this.gameController.init();
            
            if (!success) {
                throw new Error('游戏控制器初始化失败');
            }

            // 设置应用级事件监听
            this.setupAppListeners();

            // 启动自动保存（如果启用）
            if (this.config.autoSave) {
                this.startAutoSave();
            }

            // 设置页面离开前的处理
            this.setupBeforeUnload();

            this.isLoaded = true;
            console.log('五子棋应用启动成功！');
            
            return true;
        } catch (error) {
            console.error('应用启动失败:', error);
            this.showError('应用启动失败: ' + error.message);
            return false;
        }
    }

    /**
     * 验证必需的DOM元素
     */
    validateRequiredElements() {
        const requiredElements = ['board', 'status', 'controls'];
        const missingElements = [];

        requiredElements.forEach(id => {
            if (!document.getElementById(id)) {
                missingElements.push(id);
            }
        });

        if (missingElements.length > 0) {
            throw new Error(`缺少必需的DOM元素: ${missingElements.join(', ')}`);
        }
    }

    /**
     * 加载配置
     */
    loadConfiguration() {
        // 从localStorage加载保存的配置
        try {
            const savedConfig = localStorage.getItem('gomoku_config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                this.config = { ...this.config, ...config };
                console.log('已加载保存的配置');
            }
        } catch (error) {
            console.warn('加载配置失败，使用默认配置:', error);
        }

        // 从URL参数加载配置
        this.loadConfigFromURL();
    }

    /**
     * 从URL参数加载配置
     */
    loadConfigFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // 支持的URL参数
        const paramMap = {
            'board-size': 'boardSize',
            'audio': 'enableAudio',
            'history': 'enableHistory',
            'debug': 'debugMode'
        };

        Object.entries(paramMap).forEach(([param, configKey]) => {
            if (urlParams.has(param)) {
                const value = urlParams.get(param);
                
                // 类型转换
                if (configKey === 'boardSize') {
                    const size = parseInt(value);
                    if (size >= 5 && size <= 25) {
                        this.config[configKey] = size;
                    }
                } else if (typeof this.config[configKey] === 'boolean') {
                    this.config[configKey] = value === 'true' || value === '1';
                }
            }
        });
    }

    /**
     * 设置应用级事件监听
     */
    setupAppListeners() {
        // 监听游戏事件
        this.gameController.on('gameWin', (data) => {
            this.onGameWin(data);
        });

        this.gameController.on('gameReset', () => {
            this.onGameReset();
        });

        // 监听键盘事件
        document.addEventListener('keydown', (event) => {
            this.handleKeyboard(event);
        });

        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    /**
     * 处理游戏获胜事件
     */
    onGameWin(data) {
        console.log(`应用层处理获胜事件: ${data.winner === 1 ? '黑棋' : '白棋'}获胜`);
        
        // 保存游戏记录
        this.saveGameRecord(data);
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('gomoku:gameWin', {
            detail: data
        }));
    }

    /**
     * 处理游戏重置事件
     */
    onGameReset() {
        console.log('应用层处理重置事件');
        
        // 清除自动保存的游戏状态
        this.clearAutoSave();
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('gomoku:gameReset'));
    }

    /**
     * 处理键盘事件
     */
    handleKeyboard(event) {
        if (!this.gameController.isReady()) return;

        // 支持的快捷键
        switch (event.code) {
            case 'KeyU':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.gameController.performUndo();
                }
                break;
            
            case 'KeyR':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.gameController.resetGame();
                }
                break;
            
            case 'Space':
                event.preventDefault();
                if (this.gameController.getGameState() === 'paused') {
                    this.gameController.resumeGame();
                } else {
                    this.gameController.pauseGame();
                }
                break;
            
            case 'KeyS':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.exportGame();
                }
                break;
                
            case 'KeyO':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.promptImportGame();
                }
                break;
        }
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        // 可以在这里添加响应式布局逻辑
        console.log('窗口大小已改变');
    }

    /**
     * 处理页面可见性变化
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // 页面隐藏时暂停游戏（可选）
            if (this.config.autoPause && this.gameController.getGameState() === 'playing') {
                this.gameController.pauseGame();
            }
        } else {
            // 页面显示时恢复游戏（可选）
            if (this.config.autoPause && this.gameController.getGameState() === 'paused') {
                this.gameController.resumeGame();
            }
        }
    }

    /**
     * 启动自动保存
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            this.autoSaveGame();
        }, this.config.autoSaveInterval);

        console.log(`自动保存已启动，间隔: ${this.config.autoSaveInterval / 1000}秒`);
    }

    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
            console.log('自动保存已停止');
        }
    }

    /**
     * 自动保存游戏
     */
    autoSaveGame() {
        if (!this.gameController.isReady()) return;

        try {
            const gameData = this.gameController.exportGame();
            localStorage.setItem('gomoku_autosave', gameData);
            
            if (this.config.debugMode) {
                console.log('游戏已自动保存');
            }
        } catch (error) {
            console.warn('自动保存失败:', error);
        }
    }

    /**
     * 清除自动保存
     */
    clearAutoSave() {
        localStorage.removeItem('gomoku_autosave');
    }

    /**
     * 保存游戏记录
     */
    saveGameRecord(gameData) {
        try {
            const records = this.getGameRecords();
            const record = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                winner: gameData.winner,
                moveCount: gameData.moveData?.step || 0,
                gameStats: this.gameController.getGameStats()
            };
            
            records.unshift(record);
            
            // 只保留最近100场记录
            if (records.length > 100) {
                records.splice(100);
            }
            
            localStorage.setItem('gomoku_records', JSON.stringify(records));
            console.log('游戏记录已保存');
        } catch (error) {
            console.warn('保存游戏记录失败:', error);
        }
    }

    /**
     * 获取游戏记录
     */
    getGameRecords() {
        try {
            const records = localStorage.getItem('gomoku_records');
            return records ? JSON.parse(records) : [];
        } catch (error) {
            console.warn('读取游戏记录失败:', error);
            return [];
        }
    }

    /**
     * 导出游戏
     */
    exportGame() {
        if (!this.gameController.isReady()) return;

        try {
            const gameData = this.gameController.exportGame();
            const blob = new Blob([gameData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `gomoku_game_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            
            console.log('游戏已导出');
        } catch (error) {
            console.error('导出游戏失败:', error);
            this.showError('导出游戏失败: ' + error.message);
        }
    }

    /**
     * 提示导入游戏
     */
    promptImportGame() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                this.importGameFromFile(file);
            }
        };
        input.click();
    }

    /**
     * 从文件导入游戏
     */
    async importGameFromFile(file) {
        try {
            const text = await file.text();
            const success = this.gameController.importGame(text);
            
            if (success) {
                console.log('游戏导入成功');
            }
        } catch (error) {
            console.error('导入游戏失败:', error);
            this.showError('导入游戏失败: ' + error.message);
        }
    }

    /**
     * 尝试恢复自动保存的游戏
     */
    tryRestoreAutoSave() {
        try {
            const autoSaveData = localStorage.getItem('gomoku_autosave');
            if (autoSaveData && confirm('发现自动保存的游戏，是否恢复？')) {
                return this.gameController.importGame(autoSaveData);
            }
        } catch (error) {
            console.warn('恢复自动保存失败:', error);
        }
        return false;
    }

    /**
     * 设置页面离开前的处理
     */
    setupBeforeUnload() {
        this.beforeUnloadHandler = (event) => {
            if (this.gameController.isReady() && 
                this.gameController.getGameState() === 'playing' &&
                this.gameController.getGameStats().moveHistory?.totalMoves > 0) {
                
                // 自动保存当前游戏
                this.autoSaveGame();
                
                // 提示用户
                const message = '游戏正在进行中，确定要离开吗？';
                event.returnValue = message;
                return message;
            }
        };

        window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }

    /**
     * 保存配置
     */
    saveConfiguration() {
        try {
            localStorage.setItem('gomoku_config', JSON.stringify(this.config));
            console.log('配置已保存');
        } catch (error) {
            console.warn('保存配置失败:', error);
        }
    }

    /**
     * 显示错误信息
     */
    showError(message) {
        console.error(message);
        alert(message); // 可以替换为更好的UI组件
    }

    /**
     * 获取应用状态
     */
    getAppState() {
        return {
            isLoaded: this.isLoaded,
            config: this.config,
            gameController: this.gameController ? {
                isReady: this.gameController.isReady(),
                gameState: this.gameController.getGameState(),
                stats: this.gameController.getGameStats()
            } : null
        };
    }

    /**
     * 销毁应用
     */
    destroy() {
        console.log('正在销毁应用...');
        
        // 停止自动保存
        this.stopAutoSave();
        
        // 移除事件监听器
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
        }
        
        // 销毁游戏控制器
        if (this.gameController) {
            this.gameController.destroy();
            this.gameController = null;
        }
        
        this.isLoaded = false;
        console.log('应用已销毁');
    }
}

// 全局应用实例
let gomokuApp = null;

/**
 * 应用入口函数
 */
async function startGomokuGame(config = {}) {
    if (gomokuApp) {
        console.warn('应用已经在运行中');
        return gomokuApp;
    }

    gomokuApp = new GomokuApp();
    gomokuApp.config = { ...gomokuApp.config, ...config };
    
    const success = await gomokuApp.init();
    if (!success) {
        gomokuApp = null;
        return null;
    }

    // 尝试恢复自动保存
    setTimeout(() => {
        gomokuApp.tryRestoreAutoSave();
    }, 1000);

    return gomokuApp;
}

/**
 * 停止应用
 */
function stopGomokuGame() {
    if (gomokuApp) {
        gomokuApp.destroy();
        gomokuApp = null;
    }
}

// DOM加载完成后自动启动
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            startGomokuGame();
        });
    } else {
        startGomokuGame();
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GomokuApp, startGomokuGame, stopGomokuGame };
} else {
    window.GomokuApp = GomokuApp;
    window.startGomokuGame = startGomokuGame;
    window.stopGomokuGame = stopGomokuGame;
}
