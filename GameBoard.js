/**
 * 棋盘管理模块
 * 负责棋盘的创建、渲染和基础交互
 */
class GameBoard {
    constructor(size = 15, containerId = 'board') {
        this.size = size;
        this.containerId = containerId;
        this.boardElement = null;
        this.numberMatrix = this.generateSpiralMatrix(size);
        this.clickHandlers = new Map();
        
        this.init();
    }

    /**
     * 初始化棋盘
     */
    init() {
        this.boardElement = document.getElementById(this.containerId);
        if (!this.boardElement) {
            throw new Error(`找不到ID为 ${this.containerId} 的元素`);
        }
        this.create();
    }

    /**
     * 生成螺旋数字矩阵
     */
    generateSpiralMatrix(size) {
        let matrix = Array(size).fill().map(() => Array(size).fill(0));
        let directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        let currentDir = 0;
        let row = Math.floor(size / 2);
        let col = Math.floor(size / 2);
        let steps = 1;
        let num = 1;

        while (num <= size * size) {
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < steps; j++) {
                    if (num > size * size) break;
                    matrix[row][col] = num++;
                    row += directions[currentDir][0];
                    col += directions[currentDir][1];
                }
                currentDir = (currentDir + 1) % 4;
            }
            steps++;
        }
        return matrix;
    }

    /**
     * 创建棋盘DOM
     */
    create() {
        this.boardElement.innerHTML = '';
        
        for (let i = 0; i < this.size; i++) {
            const tr = document.createElement('tr');
            
            for (let j = 0; j < this.size; j++) {
                const td = document.createElement('td');
                td.textContent = this.numberMatrix[i][j];
                td.dataset.row = i;
                td.dataset.col = j;
                
                td.addEventListener('click', (e) => {
                    this.handleCellClick(i, j, td, e);
                });
                
                tr.appendChild(td);
            }
            this.boardElement.appendChild(tr);
        }
    }

    /**
     * 处理单元格点击事件
     */
    handleCellClick(row, col, cell, event) {
        // 触发所有注册的点击处理器
        for (const [name, handler] of this.clickHandlers) {
            try {
                handler(row, col, cell, event);
            } catch (error) {
                console.error(`点击处理器 ${name} 执行失败:`, error);
            }
        }
    }

    /**
     * 注册点击处理器
     */
    registerClickHandler(name, handler) {
        this.clickHandlers.set(name, handler);
    }

    /**
     * 移除点击处理器
     */
    unregisterClickHandler(name) {
        this.clickHandlers.delete(name);
    }

    /**
     * 获取指定位置的单元格
     */
    getCell(row, col) {
        return this.boardElement.querySelector(
            `tr:nth-child(${row + 1}) td:nth-child(${col + 1})`
        );
    }

    /**
     * 清除所有单元格的样式类
     */
    clearAllClasses() {
        const cells = this.boardElement.querySelectorAll('td');
        cells.forEach(cell => {
            cell.className = '';
            cell.querySelectorAll('.move-number').forEach(span => span.remove());
        });
    }

    /**
     * 为单元格添加样式类
     */
    addCellClass(row, col, className) {
        const cell = this.getCell(row, col);
        if (cell) {
            cell.classList.add(className);
        }
    }

    /**
     * 从单元格移除样式类
     */
    removeCellClass(row, col, className) {
        const cell = this.getCell(row, col);
        if (cell) {
            cell.classList.remove(className);
        }
    }

    /**
     * 检查单元格是否包含指定样式类
     */
    hasCellClass(row, col, className) {
        const cell = this.getCell(row, col);
        return cell ? cell.classList.contains(className) : false;
    }

    /**
     * 获取棋盘尺寸
     */
    getSize() {
        return this.size;
    }

    /**
     * 销毁棋盘
     */
    destroy() {
        this.clickHandlers.clear();
        if (this.boardElement) {
            this.boardElement.innerHTML = '';
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameBoard;
} else {
    window.GameBoard = GameBoard;
}
