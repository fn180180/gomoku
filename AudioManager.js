/**
 * 音效管理模块
 * 负责游戏中的音效播放和音频上下文管理
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isEnabled = true;
        this.volume = 0.8;
        this.soundCache = new Map();
        
        this.init();
    }

    /**
     * 初始化音频上下文
     */
    init() {
        try {
            // 延迟初始化，避免浏览器限制
            document.addEventListener('click', () => this.initAudioContext(), { once: true });
            document.addEventListener('touchstart', () => this.initAudioContext(), { once: true });
        } catch (error) {
            console.warn('音频初始化失败:', error);
            this.isEnabled = false;
        }
    }

    /**
     * 创建音频上下文
     */
    initAudioContext() {
        if (!this.audioContext && this.isEnabled) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // 如果上下文是暂停状态，尝试恢复
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            } catch (error) {
                console.warn('音频上下文创建失败:', error);
                this.isEnabled = false;
            }
        }
    }

    /**
     * 确保音频上下文已激活
     */
    ensureAudioContext() {
        this.initAudioContext();
        
        if (!this.audioContext || !this.isEnabled) {
            return false;
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        return true;
    }

    /**
     * 播放下棋音效
     */
    playMoveSound() {
        if (!this.ensureAudioContext()) return;

        try {
            // 创建白噪音缓冲区
            const duration = 0.08;
            const noiseBuffer = this.audioContext.createBuffer(
                1, 
                this.audioContext.sampleRate * duration,
                this.audioContext.sampleRate
            );
            
            const noiseData = noiseBuffer.getChannelData(0);
            
            // 生成白噪音
            for (let i = 0; i < noiseData.length; i++) {
                noiseData[i] = (Math.random() * 2 - 1) * 0.3;
            }

            // 创建音源和滤波器
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 800;

            const gainNode = this.audioContext.createGain();
            
            // 设置音量包络
            gainNode.gain.setValueAtTime(this.volume * 0.8, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            // 连接音频节点
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 播放
            noiseSource.start();
            noiseSource.stop(this.audioContext.currentTime + duration);

        } catch (error) {
            console.warn('播放下棋音效失败:', error);
        }
    }

    /**
     * 播放胜利音效
     */
    playVictorySound() {
        if (!this.ensureAudioContext()) return;

        try {
            const duration = 2;
            const buffer = this.audioContext.createBuffer(
                1, 
                this.audioContext.sampleRate * duration,
                this.audioContext.sampleRate
            );
            
            const data = buffer.getChannelData(0);

            // 生成胜利旋律（C大调音阶）
            const frequencies = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5, D5, E5, F5, G5
            
            for (let i = 0; i < data.length; i++) {
                const time = i / this.audioContext.sampleRate;
                
                // 主旋律
                const noteIndex = Math.floor(time * 5) % frequencies.length;
                const freq = frequencies[noteIndex];
                const noteValue = Math.sin(time * freq * 2 * Math.PI) * 0.3;
                
                // 和声
                const harmonyValue = Math.sin(time * freq * 1.5 * 2 * Math.PI) * 0.15;
                
                // 包络线
                const envelope = Math.exp(-time * 0.8);
                
                data[i] = (noteValue + harmonyValue) * envelope;
            }

            // 播放缓冲区
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(this.volume * 0.6, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + duration);
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();

        } catch (error) {
            console.warn('播放胜利音效失败:', error);
        }
    }

    /**
     * 播放点击音效
     */
    playClickSound() {
        if (!this.ensureAudioContext()) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 1000;

            gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.05);

        } catch (error) {
            console.warn('播放点击音效失败:', error);
        }
    }

    /**
     * 播放错误音效
     */
    playErrorSound() {
        if (!this.ensureAudioContext()) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);

            gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);

        } catch (error) {
            console.warn('播放错误音效失败:', error);
        }
    }

    /**
     * 设置音量
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 获取音量
     */
    getVolume() {
        return this.volume;
    }

    /**
     * 启用音效
     */
    enable() {
        this.isEnabled = true;
        this.initAudioContext();
    }

    /**
     * 禁用音效
     */
    disable() {
        this.isEnabled = false;
        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }

    /**
     * 检查音效是否启用
     */
    isAudioEnabled() {
        return this.isEnabled && this.audioContext !== null;
    }

    /**
     * 获取音频上下文状态
     */
    getAudioContextState() {
        return this.audioContext ? this.audioContext.state : 'closed';
    }

    /**
     * 预加载音效（为未来扩展准备）
     */
    preloadSound(name, audioData) {
        if (!this.ensureAudioContext()) return false;

        try {
            this.soundCache.set(name, audioData);
            return true;
        } catch (error) {
            console.warn(`预加载音效 ${name} 失败:`, error);
            return false;
        }
    }

    /**
     * 清理资源
     */
    destroy() {
        this.soundCache.clear();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
} else {
    window.AudioManager = AudioManager;
}
