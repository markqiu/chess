// UI控制
class ChessUI {
    constructor(game, canvas) {
        this.game = game;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cellSize = 60;
        this.offsetX = 40;
        this.offsetY = 40;
        this.selectedPiece = null;
        this.validMoves = [];
        this.lastMove = null; // 记录最后一步棋
    }

    // 绘制棋盘
    drawBoard() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制背景
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制棋盘线
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;

        // 横线
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(this.offsetX, this.offsetY + i * this.cellSize);
            ctx.lineTo(this.offsetX + 8 * this.cellSize, this.offsetY + i * this.cellSize);
            ctx.stroke();
        }

        // 竖线
        for (let i = 0; i < 9; i++) {
            if (i === 0 || i === 8) {
                ctx.beginPath();
                ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
                ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + 9 * this.cellSize);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY);
                ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + 4 * this.cellSize);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(this.offsetX + i * this.cellSize, this.offsetY + 5 * this.cellSize);
                ctx.lineTo(this.offsetX + i * this.cellSize, this.offsetY + 9 * this.cellSize);
                ctx.stroke();
            }
        }

        // 绘制九宫格斜线
        ctx.beginPath();
        ctx.moveTo(this.offsetX + 3 * this.cellSize, this.offsetY);
        ctx.lineTo(this.offsetX + 5 * this.cellSize, this.offsetY + 2 * this.cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.offsetX + 5 * this.cellSize, this.offsetY);
        ctx.lineTo(this.offsetX + 3 * this.cellSize, this.offsetY + 2 * this.cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.offsetX + 3 * this.cellSize, this.offsetY + 7 * this.cellSize);
        ctx.lineTo(this.offsetX + 5 * this.cellSize, this.offsetY + 9 * this.cellSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.offsetX + 5 * this.cellSize, this.offsetY + 7 * this.cellSize);
        ctx.lineTo(this.offsetX + 3 * this.cellSize, this.offsetY + 9 * this.cellSize);
        ctx.stroke();

        // 绘制楚河汉界
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#8b4513';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('楚河', this.offsetX + 2 * this.cellSize, this.offsetY + 4.5 * this.cellSize);
        ctx.fillText('漢界', this.offsetX + 6 * this.cellSize, this.offsetY + 4.5 * this.cellSize);
    }

    // 绘制棋子
    drawPieces() {
        const ctx = this.ctx;
        const radius = this.cellSize / 2 - 5;

        for (let r = 0; r < 10; r++) {
            for (let c = 0; c < 9; c++) {
                const piece = this.game.board[r][c];
                if (piece) {
                    const x = this.offsetX + c * this.cellSize;
                    const y = this.offsetY + r * this.cellSize;

                    // 绘制棋子背景
                    ctx.beginPath();
                    ctx.arc(x, y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff8dc';
                    ctx.fill();
                    ctx.strokeStyle = piece.color === 'red' ? '#cc0000' : '#000';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // 绘制棋子文字
                    ctx.font = 'bold 28px Arial';
                    ctx.fillStyle = piece.color === 'red' ? '#cc0000' : '#000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(piece.name, x, y);
                }
            }
        }

        // 绘制选中的棋子
        if (this.selectedPiece) {
            const x = this.offsetX + this.selectedPiece.col * this.cellSize;
            const y = this.offsetY + this.selectedPiece.row * this.cellSize;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // 绘制可移动位置
        for (const move of this.validMoves) {
            const x = this.offsetX + move.col * this.cellSize;
            const y = this.offsetY + move.row * this.cellSize;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
        }

        // 绘制最后一步棋的标记
        if (this.lastMove) {
            // 标记起始位置（用蓝色方框）
            const fromX = this.offsetX + this.lastMove.from.col * this.cellSize;
            const fromY = this.offsetY + this.lastMove.from.row * this.cellSize;
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 4;
            ctx.strokeRect(fromX - 25, fromY - 25, 50, 50);

            // 标记目标位置（用红色方框）
            const toX = this.offsetX + this.lastMove.to.col * this.cellSize;
            const toY = this.offsetY + this.lastMove.to.row * this.cellSize;
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 4;
            ctx.strokeRect(toX - 25, toY - 25, 50, 50);
        }
    }

    // 处理点击
    handleClick(event) {
        if (this.game.gameOver) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.round((x - this.offsetX) / this.cellSize);
        const row = Math.round((y - this.offsetY) / this.cellSize);

        if (row < 0 || row >= 10 || col < 0 || col >= 9) return;

        // 如果点击的是可移动位置
        const validMove = this.validMoves.find(m => m.row === row && m.col === col);
        if (validMove && this.selectedPiece) {
            // 执行移动
            const result = this.game.makeMove(
                this.selectedPiece.row,
                this.selectedPiece.col,
                row,
                col
            );

            // 记录最后一步棋
            this.lastMove = {
                from: { row: this.selectedPiece.row, col: this.selectedPiece.col },
                to: { row: row, col: col }
            };

            this.selectedPiece = null;
            this.validMoves = [];
            this.render();

            // 检查游戏是否结束
            if (result.checkmate) {
                this.showGameOver(result.winner);
            }

            return true;
        }

        // 选择棋子
        const piece = this.game.board[row][col];
        if (piece && piece.color === this.game.currentPlayer) {
            this.selectedPiece = { row, col };
            this.validMoves = this.game.getValidMoves(row, col);
            this.render();
        } else {
            this.selectedPiece = null;
            this.validMoves = [];
            this.render();
        }

        return false;
    }

    // 渲染
    render() {
        this.drawBoard();
        this.drawPieces();
    }

    // 显示游戏结束
    showGameOver(winner) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        title.textContent = '游戏结束';
        message.textContent = `${winner === 'red' ? '红方' : '黑方'}获胜！`;
        modal.classList.remove('hidden');
    }

    // 更新回合指示器
    updateTurnIndicator() {
        const indicator = document.getElementById('turn-indicator');
        indicator.textContent = this.game.currentPlayer === 'red' ? '红方回合' : '黑方回合';
        indicator.style.background = this.game.currentPlayer === 'red' 
            ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
            : 'linear-gradient(135deg, #4a4a4a 0%, #2c2c2c 100%)';
    }

    // 更新玩家状态
    updatePlayerStatus(color, status) {
        const statusElement = document.getElementById(`${color}-status`);
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    // 清除最后一步棋的标记
    clearLastMove() {
        this.lastMove = null;
    }
}
