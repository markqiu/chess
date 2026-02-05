const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Pikafish 引擎包装器
 * 通过 UCI 协议与 Pikafish 引擎通信
 */
class PikafishWrapper {
    constructor(enginePath = null) {
        // Pikafish 可执行文件路径
        this.enginePath = enginePath || path.join(__dirname, '../engines/pikafish');
        
        // 检查可执行文件是否存在
        if (!fs.existsSync(this.enginePath)) {
            console.warn(`[Pikafish] 可执行文件不存在: ${this.enginePath}`);
            console.warn('[Pikafish] 请下载 Pikafish 可执行文件到 engines 目录');
            console.warn('[Pikafish] 下载地址: https://github.com/official-pikafish/Pikafish/releases/latest');
            this.engineAvailable = false;
        } else {
            // 检查是否可执行
            try {
                fs.accessSync(this.enginePath, fs.constants.X_OK);
                this.engineAvailable = true;
                console.log('[Pikafish] 引擎已加载:', this.enginePath);
            } catch (err) {
                console.warn('[Pikafish] 文件不可执行:', this.enginePath);
                this.engineAvailable = false;
            }
        }

        this.engine = null;
        this.initialized = false;
        this.ready = false;
    }

    /**
     * 初始化 Pikafish 引擎
     */
    async init() {
        if (this.initialized || !this.engineAvailable) {
            return this.engineAvailable;
        }

        return new Promise((resolve, reject) => {
            try {
                console.log('[Pikafish] 正在启动引擎...');
                
                // 启动 Pikafish 进程
                this.engine = spawn(this.enginePath, [], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // 处理标准输出
                this.engine.stdout.on('data', (data) => {
                    const output = data.toString();
                    this.handleOutput(output);
                });

                // 处理错误输出
                this.engine.stderr.on('data', (data) => {
                    const error = data.toString();
                    console.error('[Pikafish] 错误:', error);
                });

                // 处理进程退出
                this.engine.on('close', (code) => {
                    console.log(`[Pikafish] 进程退出，代码: ${code}`);
                    this.initialized = false;
                    this.ready = false;
                });

                // 发送 UCI 命令初始化
                this.sendCommand('uci');

                // 等待引擎初始化
                setTimeout(() => {
                    this.sendCommand('isready');
                    setTimeout(() => {
                        if (this.ready) {
                            this.initialized = true;
                            console.log('[Pikafish] 引擎初始化成功');
                            resolve(true);
                        } else {
                            console.error('[Pikafish] 引擎初始化超时');
                            resolve(false);
                        }
                    }, 1000);
                }, 500);

            } catch (error) {
                console.error('[Pikafish] 初始化失败:', error);
                reject(error);
            }
        });
    }

    /**
     * 处理引擎输出
     */
    handleOutput(output) {
        const lines = output.trim().split('\n');
        console.log('[Pikafish] 收到引擎输出 (总行数:', lines.length, ')');
        
        for (const line of lines) {
            console.log('[Pikafish] 输出:', line);

            if (line === 'uciok') {
                console.log('[Pikafish] UCI 模式已启用');
            } else if (line === 'readyok') {
                console.log('[Pikafish] 引擎就绪');
                this.ready = true;
            } else if (line.startsWith('bestmove')) {
                // 解析最佳走法
                console.log('[Pikafish] bestmove 行:', line);
                const match = line.match(/bestmove (\w+)/);
                console.log('[Pikafish] 正则匹配结果:', match);
                
                if (match && this.currentResolve) {
                    const bestMove = match[1];
                    console.log('[Pikafish] 最佳走法:', bestMove);
                    console.log('[Pikafish] 解析后的走法:', bestMove);
                    this.currentResolve(bestMove);
                    this.currentResolve = null;
                }
            } else if (line.startsWith('info')) {
                // 解析搜索信息
                this.parseInfo(line);
            } else {
                console.log('[Pikafish] 其他输出:', line);
            }
        }
    }

    /**
     * 解析搜索信息
     */
    parseInfo(line) {
        console.log('[Pikafish] 解析搜索信息:', line);
        // 解析深度、分数、节点数等信息
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const nodesMatch = line.match(/nodes (\d+)/);
        const npsMatch = line.match(/nps (\d+)/);

        if (depthMatch) {
            console.log(`[Pikafish] 搜索深度: ${depthMatch[1]}`);
        }
        if (scoreMatch) {
            const scoreType = scoreMatch[1];
            const scoreValue = scoreMatch[2];
            console.log(`[Pikafish] 评分: ${scoreType} ${scoreValue}`);
        }
        if (nodesMatch) {
            console.log(`[Pikafish] 搜索节点: ${nodesMatch[1]}`);
        }
        if (npsMatch) {
            console.log(`[Pikafish] 每秒节点: ${npsMatch[1]}`);
        }
    }

    /**
     * 发送命令到引擎
     */
    sendCommand(command) {
        if (this.engine && this.engine.stdin) {
            this.engine.stdin.write(command + '\n');
            console.log('[Pikafish] 发送命令:', command);
        }
    }

    /**
     * 设置棋局位置
     * @param {string} fen - FEN 字符串
     * @param {Array} moves - 走法列表
     */
    setPosition(fen = null, moves = []) {
        if (fen) {
            this.sendCommand(`position fen ${fen} moves ${moves.join(' ')}`);
        } else {
            this.sendCommand(`position startpos moves ${moves.join(' ')}`);
        }
    }

    /**
     * 开始计算最佳走法
     * @param {Object} options - 计算选项
     * @returns {Promise<string>} 最佳走法
     */
    async go(options = {}) {
        if (!this.initialized || !this.ready) {
            throw new Error('Pikafish 引擎未初始化');
        }

        return new Promise((resolve, reject) => {
            this.currentResolve = resolve;

            // 构建命令
            let command = 'go';
            
            if (options.depth) {
                command += ` depth ${options.depth}`;
            } else if (options.movetime) {
                command += ` movetime ${options.movetime}`;
            } else if (options.time) {
                const color = options.color || 'w';
                const timeKey = color === 'w' ? 'wtime' : 'btime';
                command += ` ${timeKey} ${options.time}`;
            } else {
                // 默认搜索深度
                command += ' depth 20';
            }

            console.log('[Pikafish] 发送计算命令:', command);
            this.sendCommand(command);

            // 设置超时
            const timeout = options.timeout || 30000;
            console.log('[Pikafish] 设置计算超时:', timeout, 'ms');
            setTimeout(() => {
                console.log('[Pikafish] 计算超时，发送stop命令');
                if (this.currentResolve) {
                    this.sendCommand('stop');
                    reject(new Error('计算超时'));
                    this.currentResolve = null;
                }
            }, timeout);
        });
    }

    /**
     * 停止计算
     */
    stop() {
        this.sendCommand('stop');
    }

    /**
     * 新游戏
     */
    newGame() {
        this.sendCommand('ucinewgame');
    }

    /**
     * 设置选项
     * @param {string} name - 选项名称
     * @param {string} value - 选项值
     */
    setOption(name, value) {
        if (value === null || value === undefined) {
            this.sendCommand(`setoption name ${name}`);
        } else {
            this.sendCommand(`setoption name ${name} value ${value}`);
        }
    }

    /**
     * 设置难度级别
     * @param {number} level - 难度级别 (1-10)
     */
    setLevel(level) {
        // 根据难度设置搜索深度
        const depth = Math.min(5 + level * 2, 20);
        
        // 注意：Pikafish不支持Skill Level选项，只使用深度来控制难度
        console.log(`[Pikafish] 设置难度: ${level}, 深度: ${depth}`);
        
        return { depth };
    }

    /**
     * 关闭引擎
     */
    quit() {
        if (this.engine) {
            this.sendCommand('quit');
            setTimeout(() => {
                if (this.engine) {
                    this.engine.kill();
                    this.engine = null;
                }
            }, 100);
        }
        this.initialized = false;
        this.ready = false;
    }

    /**
     * 检查引擎是否可用
     */
    isAvailable() {
        return this.engineAvailable;
    }
}

module.exports = PikafishWrapper;
