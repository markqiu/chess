// 象棋游戏逻辑
class ChessGame {
    constructor() {
        this.board = this.initBoard();
        this.currentPlayer = 'red'; // 'red' or 'black'
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.gameOver = false;
    }

    // 初始化棋盘
    initBoard() {
        const board = Array(10).fill(null).map(() => Array(9).fill(null));
        
        // 红方棋子 (下方)
        board[9][0] = { type: 'rook', color: 'red', name: '車' };
        board[9][1] = { type: 'horse', color: 'red', name: '馬' };
        board[9][2] = { type: 'elephant', color: 'red', name: '相' };
        board[9][3] = { type: 'advisor', color: 'red', name: '仕' };
        board[9][4] = { type: 'king', color: 'red', name: '帥' };
        board[9][5] = { type: 'advisor', color: 'red', name: '仕' };
        board[9][6] = { type: 'elephant', color: 'red', name: '相' };
        board[9][7] = { type: 'horse', color: 'red', name: '馬' };
        board[9][8] = { type: 'rook', color: 'red', name: '車' };
        board[7][1] = { type: 'cannon', color: 'red', name: '炮' };
        board[7][7] = { type: 'cannon', color: 'red', name: '炮' };
        board[6][0] = { type: 'pawn', color: 'red', name: '兵' };
        board[6][2] = { type: 'pawn', color: 'red', name: '兵' };
        board[6][4] = { type: 'pawn', color: 'red', name: '兵' };
        board[6][6] = { type: 'pawn', color: 'red', name: '兵' };
        board[6][8] = { type: 'pawn', color: 'red', name: '兵' };

        // 黑方棋子 (上方)
        board[0][0] = { type: 'rook', color: 'black', name: '車' };
        board[0][1] = { type: 'horse', color: 'black', name: '馬' };
        board[0][2] = { type: 'elephant', color: 'black', name: '象' };
        board[0][3] = { type: 'advisor', color: 'black', name: '士' };
        board[0][4] = { type: 'king', color: 'black', name: '將' };
        board[0][5] = { type: 'advisor', color: 'black', name: '士' };
        board[0][6] = { type: 'elephant', color: 'black', name: '象' };
        board[0][7] = { type: 'horse', color: 'black', name: '馬' };
        board[0][8] = { type: 'rook', color: 'black', name: '車' };
        board[2][1] = { type: 'cannon', color: 'black', name: '砲' };
        board[2][7] = { type: 'cannon', color: 'black', name: '砲' };
        board[3][0] = { type: 'pawn', color: 'black', name: '卒' };
        board[3][2] = { type: 'pawn', color: 'black', name: '卒' };
        board[3][4] = { type: 'pawn', color: 'black', name: '卒' };
        board[3][6] = { type: 'pawn', color: 'black', name: '卒' };
        board[3][8] = { type: 'pawn', color: 'black', name: '卒' };

        return board;
    }

    // 获取某个位置的所有合法走法
    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];
        const type = piece.type;
        const color = piece.color;

        switch (type) {
            case 'king':
                moves = this.getKingMoves(row, col, color);
                break;
            case 'advisor':
                moves = this.getAdvisorMoves(row, col, color);
                break;
            case 'elephant':
                moves = this.getElephantMoves(row, col, color);
                break;
            case 'horse':
                moves = this.getHorseMoves(row, col, color);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, color);
                break;
            case 'cannon':
                moves = this.getCannonMoves(row, col, color);
                break;
            case 'pawn':
                moves = this.getPawnMoves(row, col, color);
                break;
        }

        // 过滤掉会导致自己被将军的走法
        moves = moves.filter(move => !this.willBeChecked(row, col, move.row, move.col, color));

        return moves;
    }

    // 将/帅的走法
    getKingMoves(row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const palace = color === 'red' ? { minRow: 7, maxRow: 9 } : { minRow: 0, maxRow: 2 };

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= palace.minRow && newRow <= palace.maxRow &&
                newCol >= 3 && newCol <= 5) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        // 将帅对面（飞将）
        const enemyKing = color === 'red' ? 'black' : 'red';
        for (let r = 0; r < 10; r++) {
            if (r === row) continue;
            const target = this.board[r][col];
            if (target && target.type === 'king' && target.color === enemyKing) {
                let blocked = false;
                const minR = Math.min(row, r);
                const maxR = Math.max(row, r);
                for (let checkR = minR + 1; checkR < maxR; checkR++) {
                    if (this.board[checkR][col]) {
                        blocked = true;
                        break;
                    }
                }
                if (!blocked) {
                    moves.push({ row: r, col: col });
                }
            }
        }

        return moves;
    }

    // 士的走法
    getAdvisorMoves(row, col, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const palace = color === 'red' ? { minRow: 7, maxRow: 9 } : { minRow: 0, maxRow: 2 };

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (newRow >= palace.minRow && newRow <= palace.maxRow &&
                newCol >= 3 && newCol <= 5) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }

        return moves;
    }

    // 象的走法
    getElephantMoves(row, col, color) {
        const moves = [];
        const directions = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        const blockingPos = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        const riverLimit = color === 'red' ? 5 : 4;

        for (let i = 0; i < directions.length; i++) {
            const [dr, dc] = directions[i];
            const [br, bc] = blockingPos[i];
            const newRow = row + dr;
            const newCol = col + dc;
            const blockRow = row + br;
            const blockCol = col + bc;

            // 不能过河
            const validRow = color === 'red' ? newRow >= riverLimit : newRow <= riverLimit;
            
            if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9 && validRow) {
                // 检查是否被塞象眼
                if (!this.board[blockRow][blockCol]) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }

        return moves;
    }

    // 马的走法
    getHorseMoves(row, col, color) {
        const moves = [];
        const directions = [
            [-2, -1, -1, 0], [-2, 1, -1, 0],
            [2, -1, 1, 0], [2, 1, 1, 0],
            [-1, -2, 0, -1], [1, -2, 0, -1],
            [-1, 2, 0, 1], [1, 2, 0, 1]
        ];

        for (const [dr, dc, br, bc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            const blockRow = row + br;
            const blockCol = col + bc;

            if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                // 检查是否被蹩马腿
                if (!this.board[blockRow][blockCol]) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }

        return moves;
    }

    // 车的走法
    getRookMoves(row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        }

        return moves;
    }

    // 炮的走法
    getCannonMoves(row, col, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            let jumped = false;

            while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                const target = this.board[newRow][newCol];
                if (!jumped) {
                    if (!target) {
                        moves.push({ row: newRow, col: newCol });
                    } else {
                        jumped = true;
                    }
                } else {
                    if (target) {
                        if (target.color !== color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                        break;
                    }
                }
                newRow += dr;
                newCol += dc;
            }
        }

        return moves;
    }

    // 兵的走法
    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'red' ? -1 : 1;
        const crossed = color === 'red' ? row <= 4 : row >= 5;

        // 前进
        const newRow = row + direction;
        if (newRow >= 0 && newRow < 10) {
            const target = this.board[newRow][col];
            if (!target || target.color !== color) {
                moves.push({ row: newRow, col: col });
            }
        }

        // 过河后可以左右移动
        if (crossed) {
            for (const dc of [-1, 1]) {
                const newCol = col + dc;
                if (newCol >= 0 && newCol < 9) {
                    const target = this.board[row][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: row, col: newCol });
                    }
                }
            }
        }

        return moves;
    }

    // 检查是否会被将军
    willBeChecked(fromRow, fromCol, toRow, toCol, color) {
        // 模拟移动
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        const checked = this.isChecked(color);

        // 恢复
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;

        return checked;
    }

    // 检查是否被将军
    isChecked(color) {
        // 找到将/帅的位置
        let kingPos = null;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.type === 'king' && piece.color === color) {
                    kingPos = { row: r, col: c };
                    break;
                }
            }
            if (kingPos) break;
        }

        if (!kingPos) return true;

        // 检查是否有敌方棋子可以攻击到将/帅
        const enemyColor = color === 'red' ? 'black' : 'red';
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === enemyColor) {
                    const moves = this.getAttackMoves(r, c, enemyColor);
                    if (moves.some(m => m.row === kingPos.row && m.col === kingPos.col)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // 获取攻击范围（不考虑将军）
    getAttackMoves(row, col, color) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const type = piece.type;
        switch (type) {
            case 'king': return this.getKingMoves(row, col, color);
            case 'advisor': return this.getAdvisorMoves(row, col, color);
            case 'elephant': return this.getElephantMoves(row, col, color);
            case 'horse': return this.getHorseMoves(row, col, color);
            case 'rook': return this.getRookMoves(row, col, color);
            case 'cannon': return this.getCannonMoves(row, col, color);
            case 'pawn': return this.getPawnMoves(row, col, color);
            default: return [];
        }
    }

    // 检查是否将死
    isCheckmate(color) {
        if (!this.isChecked(color)) return false;

        // 检查是否有任何合法走法可以解除将军
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(r, c);
                    if (moves.length > 0) return false;
                }
            }
        }

        return true;
    }

    // 执行移动
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const captured = this.board[toRow][toCol];

        this.moveHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            captured: captured
        });

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';

        // 检查游戏是否结束
        const enemyColor = this.currentPlayer;
        if (this.isCheckmate(enemyColor)) {
            this.gameOver = true;
            return { checkmate: true, winner: this.currentPlayer === 'red' ? 'black' : 'red' };
        }

        return { checkmate: false };
    }

    // 悔棋
    undoMove() {
        if (this.moveHistory.length === 0) return false;

        const lastMove = this.moveHistory.pop();
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.captured;
        this.currentPlayer = this.currentPlayer === 'red' ? 'black' : 'red';
        this.gameOver = false;

        return true;
    }

    // 复制棋盘
    cloneBoard() {
        return this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    }

    // 评估局面
    evaluate() {
        const pieceValues = {
            king: 10000,
            rook: 900,
            cannon: 450,
            horse: 400,
            elephant: 200,
            advisor: 200,
            pawn: 100
        };

        let score = 0;
        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.board[r][c];
                if (piece) {
                    const value = pieceValues[piece.type];
                    score += piece.color === 'red' ? value : -value;
                }
            }
        }

        return score;
    }

    // 转换为FEN格式
    toFEN() {
        const board = this.board;
        let fen = '';

        // 转换棋盘（从上到下，即从黑方到红方）
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

        // 添加当前方（注意：Pikafish使用w表示红方，b表示黑方）
        fen += this.currentPlayer === 'red' ? ' w' : ' b';

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

    // 获取走法历史
    getMoveHistory() {
        return this.moveHistory;
    }
}
