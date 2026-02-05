// AI引擎基类
class BaseAI {
    constructor(game) {
        this.game = game;
    }

    async getBestMove() {
        throw new Error('getBestMove must be implemented');
    }
}

// 云库API AI
class CloudAI extends BaseAI {
    constructor(game) {
        super(game);
        this.apiURL = 'http://www.chessdb.cn/chessdb.php';
    }

    // 将棋盘转换为FEN格式
    boardToFEN() {
        const board = this.game.board;
        let fen = '';

        // 转换棋盘
        for (let row = 0; row < 10; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 9; col++) {
                const piece = board[row][col];
                if (!piece) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    // 转换棋子为FEN格式
                    const pieceChar = this.pieceToFEN(piece);
                    fen += pieceChar;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row < 9) {
                fen += '/';
            }
        }

        // 添加当前方
        fen += this.game.currentPlayer === 'red' ? ' w' : ' b';

        return fen;
    }

    // 棋子转FEN字符
    pieceToFEN(piece) {
        const mapping = {
            red: {
                king: 'K', advisor: 'A', elephant: 'B', horse: 'N',
                rook: 'R', cannon: 'C', pawn: 'P'
            },
            black: {
                king: 'k', advisor: 'a', elephant: 'b', horse: 'n',
                rook: 'r', cannon: 'c', pawn: 'p'
            }
        };
        return mapping[piece.color][piece.type];
    }

    // 获取最佳走法
    async getBestMove() {
        console.log('[CloudAI] 开始获取最佳走法');
        console.log('[CloudAI] 当前玩家:', this.game.currentPlayer);
        
        try {
            const fen = this.boardToFEN();
            console.log('[CloudAI] FEN:', fen);
            
            // 先尝试 querybest
            let url = `${this.apiURL}?action=querybest&board=${encodeURIComponent(fen)}`;
            console.log('[CloudAI] 请求URL (querybest):', url);

            let response = await fetch(url);
            let result = await response.text();
            
            console.log('[CloudAI] 云库返回结果 (querybest):', result);

            // 解析返回结果
            if (result.startsWith('move:')) {
                const moveStr = result.substring(5).trim();
                console.log('[CloudAI] 解析走法字符串:', moveStr);
                
                const move = this.parseMove(moveStr);
                console.log('[CloudAI] 解析后的走法:', move);
                
                // 验证走法是否合法
                const fromPiece = this.game.board[move.from.row][move.from.col];
                const toPiece = this.game.board[move.to.row][move.to.col];
                console.log('[CloudAI] 起始位置棋子:', fromPiece);
                console.log('[CloudAI] 目标位置棋子:', toPiece);
                
                if (!fromPiece) {
                    console.error('[CloudAI] 错误：起始位置没有棋子！');
                } else if (fromPiece.color !== this.game.currentPlayer) {
                    console.error('[CloudAI] 错误：起始位置棋子颜色不匹配！', fromPiece.color, '!=', this.game.currentPlayer);
                }
                
                return move;
            } else if (result.startsWith('egtb:')) {
                const moveStr = result.substring(5);
                console.log('[CloudAI] 残局库走法:', moveStr);
                return this.parseMove(moveStr);
            } else if (result.trim() === 'nobestmove' || result.trim() === 'unknown') {
                console.log('[CloudAI] querybest 无数据，尝试 queryall 接口');
                
                // 尝试使用 queryall 获取所有着法
                url = `${this.apiURL}?action=queryall&board=${encodeURIComponent(fen)}`;
                console.log('[CloudAI] 请求URL (queryall):', url);
                
                response = await fetch(url);
                result = await response.text();
                console.log('[CloudAI] 云库返回结果 (queryall):', result);
                
                // queryall 返回格式: move:c3c4,score:100,rank:1,winrate:50,note:|move:c3c5,score:90,rank:2,winrate:48,note:
                if (result && result !== 'unknown' && result !== 'invalid board') {
                    return this.parseQueryAllResult(result);
                }
                
                console.log('[CloudAI] queryall 也无数据，使用本地评估');
                // 如果云库都没有数据，使用本地评估选择最佳走法
                return this.getBestMoveLocal();
            }

            console.log('[CloudAI] 未知返回结果，使用本地评估');
            return this.getBestMoveLocal();
        } catch (error) {
            console.error('[CloudAI] 错误:', error);
            return this.getRandomMove();
        }
    }

    // 解析走法
    parseMove(moveStr) {
        console.log('[CloudAI] parseMove 输入:', moveStr);
        
        // 格式: c3c4 (从c3到c4)
        // 云库 API 坐标系统：
        // - 列: a-i (0-8, 从左到右)
        // - 行: 1-9 (从红方底线到黑方底线)
        // 游戏内坐标系统：
        // - 列: 0-8 (从左到右)
        // - 行: 0-9 (从黑方底线到红方底线)
        const fromCol = moveStr.charCodeAt(0) - 97; // 'a' = 0
        const fromRow = 9 - parseInt(moveStr[1]);    // API行号转游戏行号
        const toCol = moveStr.charCodeAt(2) - 97;
        const toRow = 9 - parseInt(moveStr[3]);

        const result = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        };
        
        console.log('[CloudAI] parseMove 输出:', result);
        console.log('[CloudAI] 从 (行', fromRow, ',列', fromCol, ') 到 (行', toRow, ',列', toCol, ')');
        return result;
    }

    // 获取随机走法
    getRandomMove() {
        const color = this.game.currentPlayer;
        const moves = this.getAllMoves(color);
        if (moves.length === 0) return null;
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // 获取所有可能的走法
    getAllMoves(color) {
        const moves = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.game.board[r][c];
                if (piece && piece.color === color) {
                    const validMoves = this.game.getValidMoves(r, c);
                    for (const move of validMoves) {
                        moves.push({
                            from: { row: r, col: c },
                            to: { row: move.row, col: move.col },
                            piece: piece,
                            captured: this.game.board[move.row][move.col]
                        });
                    }
                }
            }
        }
        return moves;
    }

    // 解析 queryall 接口返回的结果
    // 格式: move:c3c4,score:100,rank:1,winrate:50,note:|move:c3c5,score:90,rank:2,winrate:48,note:...
    parseQueryAllResult(responseText) {
        try {
            const moves = [];
            const moveStrings = responseText.split('|');
            
            for (const moveStr of moveStrings) {
                if (!moveStr.trim()) continue;
                
                const moveData = {};
                const parts = moveStr.split(',');
                
                for (const part of parts) {
                    const [key, value] = part.split(':');
                    if (key && value) {
                        moveData[key] = value;
                    }
                }
                
                if (moveData.move && moveData.score) {
                    moves.push({
                        move: this.parseMove(moveData.move),
                        score: parseInt(moveData.score),
                        rank: parseInt(moveData.rank || 0),
                        winrate: parseFloat(moveData.winrate || 0),
                        note: moveData.note || ''
                    });
                }
            }
            
            // 按分数排序，分数最高的在前
            moves.sort((a, b) => b.score - a.score);
            
            console.log(`[CloudAI] queryall 解析出 ${moves.length} 个走法`);
            if (moves.length > 0) {
                console.log(`[CloudAI] 最佳走法: ${JSON.stringify(moves[0])}`);
                // 返回最佳走法的 move 对象
                return moves[0].move;
            }
            
            // 如果没有走法，返回空数组
            return [];
        } catch (error) {
            console.error('[CloudAI] 解析 queryall 结果失败:', error);
            return [];
        }
    }

    // 本地评估获取最佳走法（当云库完全不可用时使用）
    getBestMoveLocal() {
        console.log('[CloudAI] 使用本地评估选择走法');
        const color = this.game.currentPlayer;
        const moves = this.getAllMoves(color);
        
        if (moves.length === 0) {
            console.log('[CloudAI] 无可用走法');
            return null;
        }
        
        // 简单的评估函数
        let bestMove = null;
        let bestScore = -Infinity;
        
        for (const move of moves) {
            let score = 0;
            
            // 优先考虑吃子
            if (move.captured) {
                const pieceValues = {
                    'k': 10000,  // 将/帅
                    'r': 900,    // 车
                    'n': 400,    // 马
                    'b': 200,    // 象/相
                    'a': 200,    // 士
                    'c': 450,    // 炮
                    'p': 100     // 兵/卒
                };
                score += pieceValues[move.captured.type] || 0;
            }
            
            // 优先考虑将军
            // 模拟走法后检查是否将军
            const originalPiece = this.game.board[move.to.row][move.to.col];
            const movingPiece = this.game.board[move.from.row][move.from.col];
            
            this.game.board[move.to.row][move.to.col] = movingPiece;
            this.game.board[move.from.row][move.from.col] = null;
            
            const opponentColor = color === 'red' ? 'black' : 'red';
            if (this.game.isChecked(opponentColor)) {
                score += 50;
            }
            
            // 恢复棋盘
            this.game.board[move.from.row][move.from.col] = movingPiece;
            this.game.board[move.to.row][move.to.col] = originalPiece;
            
            // 添加一些随机性，避免走法过于固定
            score += Math.random() * 10;
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
        
        console.log(`[CloudAI] 本地评估选择走法: ${JSON.stringify(bestMove)}, 分数: ${bestScore.toFixed(2)}`);
        return bestMove;
    }
}

// Pikafish引擎AI (使用WebAssembly)
class PikafishAI extends BaseAI {
    constructor(game) {
        super(game);
        this.engine = null;
        this.initialized = false;
        this.ws = null;
        this.moveRequest = null;
    }

    async init() {
        if (this.initialized) return;

        try {
            // 获取 WebSocket 连接
            if (window.gameWebSocket && window.gameWebSocket.readyState === WebSocket.OPEN) {
                this.ws = window.gameWebSocket;
                this.initialized = true;
                console.log('[PikafishAI] 使用 WebSocket 连接到后端 Pikafish');
            } else {
                console.warn('[PikafishAI] WebSocket 不可用');
                this.initialized = false;
            }
        } catch (error) {
            console.error('[PikafishAI] 初始化失败:', error);
            this.initialized = false;
        }
    }

    async getBestMove() {
        await this.init();
        console.log('[PikafishAI] getBestMove 开始');

        // 如果 Pikafish 未初始化，回退到云库 API
        if (!this.initialized || !this.ws) {
            console.log('[PikafishAI] 引擎不可用，使用云库 API');
            const cloudAI = new CloudAI(this.game);
            return await cloudAI.getBestMove();
        }

        try {
            // 获取当前棋局的 FEN 和走法列表
            const fen = this.game.toFEN();
            const moves = this.game.getMoveHistory().map(move => {
                const from = move.from;
                const to = move.to;
                // 转换为 UCI 格式 (例如: c3c4)
                // Pikafish 使用标准 UCI 格式：列(a-i, 0-8) + 行(0-9, 从上到下)
                const fromCol = String.fromCharCode(97 + from.col);
                const fromRow = from.row;  // 直接使用行号（游戏内行号就是从上到下）
                const toCol = String.fromCharCode(97 + to.col);
                const toRow = to.row;      // 直接使用行号
                return `${fromCol}${fromRow}${toCol}${toRow}`;
            });

            console.log('[PikafishAI] 请求计算走法');
            console.log('[PikafishAI] FEN:', fen);
            console.log('[PikafishAI] 走法:', moves.join(' '));
            console.log('[PikafishAI] 当前玩家:', this.game.currentPlayer);
            console.log('[PikafishAI] 棋盘状态:', this.game.board);

            // 通过 WebSocket 请求 Pikafish 计算
            // 暂时不传递走法历史，只传递FEN字符串
            const move = await this.requestPikafishMove(fen, []);
            
            if (move) {
                // 解析 UCI 格式的走法
                console.log('[PikafishAI] 收到走法:', move);
                return this.parseMove(move);
            } else {
                throw new Error('未收到有效走法');
            }

        } catch (error) {
            console.error('[PikafishAI] 计算失败:', error);
            // 回退到云库 API
            console.log('[PikafishAI] 回退到云库 API');
            const cloudAI = new CloudAI(this.game);
            return await cloudAI.getBestMove();
        }
    }

    // 请求 Pikafish 计算走法
    requestPikafishMove(fen, moves) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                console.error('[PikafishAI] 前端超时触发');
                reject(new Error('Pikafish 计算超时'));
            }, 65000);

            // 设置消息处理器
            const messageHandler = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pikafishMove') {
                        clearTimeout(timeout);
                        this.ws.removeEventListener('message', messageHandler);

                        if (data.success && data.move) {
                            console.log('[PikafishAI] 收到最佳走法:', data.move);
                            resolve(data.move);
                        } else {
                            console.warn('[PikafishAI] Pikafish 不可用:', data.error);
                            reject(new Error(data.error || 'Pikafish 计算失败'));
                        }
                    }
                } catch (error) {
                    console.error('[PikafishAI] 处理响应失败:', error);
                }
            };

            // 监听响应
            this.ws.addEventListener('message', messageHandler);

            // 发送请求
            const message = JSON.stringify({
                type: 'getPikafishMove',
                fen: fen,
                moves: moves,
                level: 5  // 难度级别 1-10
            });
            console.log('[PikafishAI] 发送消息到服务器:', message);
            this.ws.send(message);
            console.log('[PikafishAI] 消息已发送');
        });
    }

    // 解析 UCI 格式的走法
    parseMove(moveStr) {
        console.log('[PikafishAI] parseMove 输入:', moveStr);
        console.log('[PikafishAI] 当前玩家:', this.game.currentPlayer);
        
        // 格式: c3c4 (从c3到c4)
        // Pikafish 使用标准 UCI 格式：列(a-i, 0-8) + 行(0-9, 从上到下)
        const fromCol = moveStr.charCodeAt(0) - 97; // 'a' = 0
        const fromRow = parseInt(moveStr[1]);       // 直接使用行号
        const toCol = moveStr.charCodeAt(2) - 97;
        const toRow = parseInt(moveStr[3]);         // 直接使用行号

        // 如果当前玩家是黑棋，需要翻转行号
        // 因为Pikafish引擎可能期望红棋在上方，而我们的游戏中黑棋在上方
        let adjustedFromRow = fromRow;
        let adjustedToRow = toRow;
        
        if (this.game.currentPlayer === 'black') {
            adjustedFromRow = 9 - fromRow;
            adjustedToRow = 9 - toRow;
        }

        const result = {
            from: { row: adjustedFromRow, col: fromCol },
            to: { row: adjustedToRow, col: toCol }
        };
        
        console.log('[PikafishAI] parseMove 输出:', result);
        console.log('[PikafishAI] 起始位置棋子:', this.game.board[adjustedFromRow][fromCol]);
        console.log('[PikafishAI] 目标位置棋子:', this.game.board[adjustedToRow][toCol]);
        
        return result;
    }

    // 获取随机走法
    getRandomMove() {
        const color = this.game.currentPlayer;
        const moves = this.getAllMoves(color);
        if (moves.length === 0) return null;
        return moves[Math.floor(Math.random() * moves.length)];
    }

    // 获取所有可能的走法
    getAllMoves(color) {
        const moves = [];
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.game.board[r][c];
                if (piece && piece.color === color) {
                    const validMoves = this.game.getValidMoves(r, c);
                    for (const move of validMoves) {
                        moves.push({
                            from: { row: r, col: c },
                            to: { row: move.row, col: move.col },
                            piece: piece,
                            captured: this.game.board[move.row][move.col]
                        });
                    }
                }
            }
        }
        return moves;
    }
}

// AI管理器
class AIManager {
    constructor(game) {
        this.game = game;
        this.currentAI = null;
        this.aiType = null;
    }

    // 设置AI类型
    setAIType(type) {
        this.aiType = type;
        switch (type) {
            case 'cloud':
                this.currentAI = new CloudAI(this.game);
                break;
            case 'pikafish':
                this.currentAI = new PikafishAI(this.game);
                break;
            default:
                this.currentAI = new CloudAI(this.game);
        }
    }

    // 获取最佳走法
    async getBestMove() {
        if (!this.currentAI) {
            this.setAIType('cloud');
        }
        return await this.currentAI.getBestMove();
    }
}

// 保留旧的ChessAI类用于兼容
class ChessAI {
    constructor(game, level) {
        this.game = game;
        this.aiManager = new AIManager(game);
        // 默认使用云库API
        this.aiManager.setAIType('cloud');
    }

    // 获取AI的最佳走法
    async getBestMove() {
        return await this.aiManager.getBestMove();
    }
}
