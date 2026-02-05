// 主程序
let game = null;
let ui = null;
let ai = null;
let network = null;
let gameMode = null; // 'ai', 'online', or 'ai-vs-ai'
let aiLevel = null;
let aiEngineType = 'cloud'; // 'cloud' or 'pikafish'
let isMyTurn = true;
let currentChallenge = null;
let aiVsAiInterval = null; // AI对AI的定时器
let redAI = null; // 红方AI
let blackAI = null; // 黑方AI
let aiSpeed = 1000; // AI走棋速度（毫秒）

// AI思考计时器
let aiThinkingTimer = null;
let aiThinkingStartTime = null;
let aiThinkingTimerInterval = null;

// 音效管理器
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // 确保AudioContext已激活
    ensureContext() {
        if (!this.enabled || !this.audioContext) return false;

        // AudioContext可能需要用户交互才能启动
        if (this.audioContext.state === 'suspended') {
            try {
                this.audioContext.resume();
            } catch (e) {
                console.warn('Failed to resume AudioContext:', e);
                return false;
            }
        }
        return true;
    }

    // 播放走棋音效
    playMoveSound() {
        if (!this.ensureContext()) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.error('Error playing move sound:', e);
        }
    }

    // 播放吃子音效
    playCaptureSound() {
        if (!this.ensureContext()) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 400;
            oscillator.type = 'square';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
        } catch (e) {
            console.error('Error playing capture sound:', e);
        }
    }

    // 播放将军音效
    playCheckSound() {
        if (!this.ensureContext()) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 1200;
            oscillator.type = 'triangle';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (e) {
            console.error('Error playing check sound:', e);
        }
    }

    // 播放游戏结束音效
    playGameOverSound() {
        if (!this.ensureContext()) return;

        try {
            const notes = [523, 659, 784]; // C5, E5, G5
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    try {
                        const oscillator = this.audioContext.createOscillator();
                        const gainNode = this.audioContext.createGain();

                        oscillator.connect(gainNode);
                        gainNode.connect(this.audioContext.destination);

                        oscillator.frequency.value = freq;
                        oscillator.type = 'sine';

                        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

                        oscillator.start(this.audioContext.currentTime);
                        oscillator.stop(this.audioContext.currentTime + 0.3);
                    } catch (e) {
                        console.error('Error playing game over note:', e);
                    }
                }, index * 150);
            });
        } catch (e) {
            console.error('Error playing game over sound:', e);
        }
    }
}

const soundManager = new SoundManager();

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('chess-board');
    canvas.addEventListener('click', handleCanvasClick);

    // 初始化音效管理器
    soundManager.init();

    // 初始化网络管理器
    network = new NetworkManager();
    setupNetworkCallbacks();
    network.connect();
});

// 设置网络回调
function setupNetworkCallbacks() {
    network.on('onPlayerList', (players) => {
        displayPlayerList(players);
    });

    network.on('onChallenge', (data) => {
        showChallengeModal(data);
    });

    network.on('onChallengeResponse', (data) => {
        handleChallengeResponse(data);
    });

    network.on('onGameStart', (data) => {
        startOnlineGame(data);
    });

    network.on('onMove', (data) => {
        handleOnlineMove(data);
    });

    network.on('onGameOver', (data) => {
        handleOnlineGameOver(data);
    });

    network.on('onPlayerLeft', (data) => {
        alert('对方已离开游戏');
        backToLobby();
    });
}

// 显示AI菜单
function showAIMenu() {
    document.getElementById('ai-menu').classList.remove('hidden');
}

// 隐藏AI菜单
function hideAIMenu() {
    document.getElementById('ai-menu').classList.add('hidden');
    document.getElementById('ai-vs-ai-settings').classList.add('hidden');
}

// 显示AI菜单
function showAIMenu() {
    document.getElementById('ai-menu').classList.remove('hidden');
}

// 开始AI游戏
function startAIGame(mode) {
    if (mode === 'ai-vs-ai') {
        // 显示AI对AI设置
        document.getElementById('ai-vs-ai-settings').classList.remove('hidden');
    } else {
        // 人机对战
        startHumanVsAIGame();
    }
}

// 开始人机对战
function startHumanVsAIGame() {
    console.log('[startAIGame] 开始人机对战');
    gameMode = 'ai';

    // 获取选择的AI引擎
    const engineRadios = document.getElementsByName('ai-engine');
    for (const radio of engineRadios) {
        if (radio.checked) {
            aiEngineType = radio.value;
            break;
        }
    }

    console.log('[startAIGame] AI引擎类型:', aiEngineType);

    game = new ChessGame();
    const canvas = document.getElementById('chess-board');
    ui = new ChessUI(game, canvas);

    // 创建AI管理器并设置引擎类型
    const aiManager = new AIManager(game);
    aiManager.setAIType(aiEngineType);
    ai = aiManager;

    console.log('[startAIGame] AI对象已创建:', ai);
    console.log('[startAIGame] AI类型:', ai.aiType);
    console.log('[startAIGame] 当前AI:', ai.currentAI);

    hideAIMenu();
    showGameScreen();
    ui.render();
    updateGameInfo();

    // 更新玩家名称
    document.getElementById('red-name').textContent = '玩家';
    document.getElementById('black-name').textContent = aiEngineType === 'cloud' ? '云库AI' : 'Pikafish';

    // 玩家执红先行，设置玩家回合
    isMyTurn = true;
    console.log('[startAIGame] 游戏已开始，玩家回合:', isMyTurn);
    updatePlayerStatus();
}

// 开始AI对AI对弈
function startAIVsAI() {
    console.log('[startAIVsAI] 开始AI对AI对弈');
    gameMode = 'ai-vs-ai';

    // 获取红方和黑方的AI引擎
    const redAIEngine = document.getElementById('red-ai-engine').value;
    const blackAIEngine = document.getElementById('black-ai-engine').value;
    aiSpeed = parseInt(document.getElementById('ai-speed').value);

    console.log('[startAIVsAI] 红方AI:', redAIEngine, '黑方AI:', blackAIEngine, '速度:', aiSpeed);

    game = new ChessGame();
    const canvas = document.getElementById('chess-board');
    ui = new ChessUI(game, canvas);

    // 创建红方和黑方AI
    const redAIManager = new AIManager(game);
    redAIManager.setAIType(redAIEngine);
    redAI = redAIManager;

    const blackAIManager = new AIManager(game);
    blackAIManager.setAIType(blackAIEngine);
    blackAI = blackAIManager;

    console.log('[startAIVsAI] 红方AI:', redAI, '黑方AI:', blackAI);

    hideAIMenu();
    showGameScreen();
    ui.render();
    updateGameInfo();

    // 更新玩家名称
    document.getElementById('red-name').textContent = redAIEngine === 'cloud' ? '云库AI' : 'Pikafish';
    document.getElementById('black-name').textContent = blackAIEngine === 'cloud' ? '云库AI' : 'Pikafish';

    // 开始AI对弈
    isMyTurn = true;
    console.log('[startAIVsAI] 游戏已开始，', aiSpeed, 'ms后开始第一步');
    setTimeout(makeAIMove, aiSpeed);
}

// 显示在线大厅
function showOnlineLobby() {
    document.getElementById('online-lobby').classList.remove('hidden');
    network.getPlayerList();
}

// 隐藏在线大厅
function hideOnlineLobby() {
    document.getElementById('online-lobby').classList.add('hidden');
}

// 显示玩家列表
function displayPlayerList(players) {
    const playerList = document.getElementById('player-list');
    playerList.innerHTML = '';

    // 防御性检查：确保 players 存在且是数组
    if (!players || !Array.isArray(players)) {
        console.warn('[displayPlayerList] players 参数无效:', players);
        playerList.innerHTML = '<div class="loading">加载中...</div>';
        return;
    }

    if (players.length === 0) {
        playerList.innerHTML = '<div class="loading">暂无在线玩家</div>';
        return;
    }

    players.forEach(player => {
        if (player.playerId === network.playerId) return;

        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <div class="player-avatar">${player.playerName.charAt(0)}</div>
            <div class="player-info">
                <div class="player-name">${player.playerName}</div>
                <div class="player-stats">胜率: ${player.winRate || 0}%</div>
            </div>
            <button class="btn btn-primary btn-challenge" onclick="challengePlayer('${player.playerId}')">挑战</button>
        `;
        playerList.appendChild(item);
    });
}

// 挑战玩家
function challengePlayer(playerId) {
    network.challengePlayer(playerId);
}

// 显示挑战弹窗
function showChallengeModal(data) {
    currentChallenge = data;
    const modal = document.getElementById('challenge-modal');
    const message = document.getElementById('challenge-message');
    message.textContent = `${data.challengerName} 想跟你下棋，接受挑战吗？`;
    modal.classList.remove('hidden');
}

// 接受挑战
function acceptChallenge() {
    if (currentChallenge) {
        network.respondToChallenge(currentChallenge.challengeId, true);
        document.getElementById('challenge-modal').classList.add('hidden');
    }
}

// 拒绝挑战
function declineChallenge() {
    if (currentChallenge) {
        network.respondToChallenge(currentChallenge.challengeId, false);
        document.getElementById('challenge-modal').classList.add('hidden');
    }
}

// 处理挑战响应
function handleChallengeResponse(data) {
    if (data.accepted) {
        alert('对方接受了你的挑战！');
    } else {
        alert('对方拒绝了你的挑战');
    }
}

// 开始在线游戏
function startOnlineGame(data) {
    gameMode = 'online';
    game = new ChessGame();
    const canvas = document.getElementById('chess-board');
    ui = new ChessUI(game, canvas);

    isMyTurn = network.playerColor === 'red';

    hideOnlineLobby();
    showGameScreen();
    ui.render();
    updateGameInfo();

    // 更新玩家信息
    document.getElementById('red-name').textContent = data.redPlayer;
    document.getElementById('black-name').textContent = data.blackPlayer;
}

// 处理在线移动
function handleOnlineMove(data) {
    try {
        const result = game.makeMove(
            data.from.row,
            data.from.col,
            data.to.row,
            data.to.col
        );

        // 更新lastMove标记
        const lastMove = game.moveHistory[game.moveHistory.length - 1];
        if (lastMove) {
            ui.lastMove = {
                from: { row: lastMove.from.row, col: lastMove.from.col },
                to: { row: lastMove.to.row, col: lastMove.to.col }
            };

            // 播放音效
            if (lastMove.captured) {
                soundManager.playCaptureSound();
            } else {
                soundManager.playMoveSound();
            }
        }

        // 检查是否将军
        try {
            const enemyColor = game.currentPlayer;
            if (game.isChecked(enemyColor)) {
                soundManager.playCheckSound();
            }
        } catch (e) {
            console.error('Error checking for check:', e);
        }

        ui.render();
        updateGameInfo();

        if (result.checkmate) {
            soundManager.playGameOverSound();
            ui.showGameOver(result.winner);
        } else {
            isMyTurn = true;
            updatePlayerStatus();
        }
    } catch (e) {
        console.error('Error in handleOnlineMove:', e);
    }
}

// 处理在线游戏结束
function handleOnlineGameOver(data) {
    ui.showGameOver(data.winner);
}

// 显示游戏界面
function showGameScreen() {
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

// 返回大厅
function backToLobby() {
    // 清理AI对AI模式的定时器
    if (aiVsAiInterval) {
        clearTimeout(aiVsAiInterval);
        aiVsAiInterval = null;
    }

    // 停止AI思考计时器
    stopAIThinkingTimer();

    if (gameMode === 'online') {
        network.leaveGame();
    }

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    document.getElementById('game-over-modal').classList.add('hidden');

    game = null;
    ui = null;
    ai = null;
    redAI = null;
    blackAI = null;
    gameMode = null;
    aiLevel = null;
    aiEngineType = 'cloud';
}

// 处理画布点击
function handleCanvasClick(event) {
    if (!game || !ui) return;

    // AI对AI模式下禁止点击
    if (gameMode === 'ai-vs-ai') return;

    // AI模式下，如果不是玩家回合则不能点击
    if (gameMode === 'ai' && game.currentPlayer === 'black') return;

    // 在线模式下，如果不是自己的回合则不能点击
    if (gameMode === 'online' && !isMyTurn) return;

    try {
        const moved = ui.handleClick(event);

        if (moved) {
            // 播放音效
            const lastMove = game.moveHistory[game.moveHistory.length - 1];
            if (lastMove && lastMove.captured) {
                soundManager.playCaptureSound();
            } else {
                soundManager.playMoveSound();
            }

            // 检查是否将军
            try {
                const enemyColor = game.currentPlayer;
                if (game.isChecked(enemyColor)) {
                    soundManager.playCheckSound();
                }
            } catch (e) {
                console.error('Error checking for check:', e);
            }

            updateGameInfo();

            // AI模式
            if (gameMode === 'ai' && !game.gameOver) {
                console.log('[handleCanvasClick] 玩家已走棋，触发AI走棋');
                isMyTurn = false;
                updatePlayerStatus();
                console.log('[handleCanvasClick] 500ms后调用 makeAIMove');
                setTimeout(makeAIMove, 500);
            }

            // 在线模式
            if (gameMode === 'online' && !game.gameOver && lastMove) {
                network.sendMove(
                    lastMove.from.row,
                    lastMove.from.col,
                    lastMove.to.row,
                    lastMove.to.col
                );
                isMyTurn = false;
                updatePlayerStatus();
            }
        }
    } catch (e) {
        console.error('Error in handleCanvasClick:', e);
    }
}

// AI走棋
async function makeAIMove() {
    console.log('[AI] 开始AI走棋, gameMode:', gameMode);
    
    if (!game || game.gameOver) return;

    try {
        // 根据游戏模式选择AI
        let currentAI = null;
        if (gameMode === 'ai') {
            currentAI = ai;
        } else if (gameMode === 'ai-vs-ai') {
            // 根据当前回合选择AI
            currentAI = game.currentPlayer === 'red' ? redAI : blackAI;
        }

        if (!currentAI) {
            console.error('[AI] AI对象不存在');
            return;
        }

        console.log('[AI] AI对象已获取，启动计时器');
        
        // 启动AI思考计时器
        startAIThinkingTimer();

        console.log('[AI] 开始获取最佳走法...');
        
        // 记录开始时间
        const startTime = Date.now();
        
        // 获取AI的最佳走法（异步）
        const move = await currentAI.getBestMove();

        const elapsed = Date.now() - startTime;
        console.log('[AI] 获取到走法:', move, '耗时:', elapsed, 'ms');
        
        // 确保计时器至少显示500ms，让用户能看清楚
        const minDisplayTime = 500;
        const remainingTime = Math.max(0, minDisplayTime - elapsed);
        
        if (remainingTime > 0) {
            console.log('[AI] 等待', remainingTime, 'ms以确保计时器可见');
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        // 停止AI思考计时器
        stopAIThinkingTimer();

        if (move) {
            game.makeMove(move.from.row, move.from.col, move.to.row, move.to.col);

            // 更新lastMove标记
            const lastMove = game.moveHistory[game.moveHistory.length - 1];
            if (lastMove) {
                ui.lastMove = {
                    from: { row: lastMove.from.row, col: lastMove.from.col },
                    to: { row: lastMove.to.row, col: lastMove.to.col }
                };

                // 播放音效
                if (lastMove.captured) {
                    soundManager.playCaptureSound();
                } else {
                    soundManager.playMoveSound();
                }
            }

            // 检查是否将军
            try {
                const enemyColor = game.currentPlayer;
                if (game.isChecked(enemyColor)) {
                    soundManager.playCheckSound();
                }
            } catch (e) {
                console.error('Error checking for check:', e);
            }

            ui.render();
            updateGameInfo();

            if (game.gameOver) {
                soundManager.playGameOverSound();
                ui.showGameOver(game.currentPlayer === 'red' ? 'black' : 'red');
            } else {
                // AI对AI模式继续对弈
                if (gameMode === 'ai-vs-ai') {
                    setTimeout(makeAIMove, aiSpeed);
                } else {
                    isMyTurn = true;
                    updatePlayerStatus();
                }
            }
        }
    } catch (e) {
        console.error('Error in makeAIMove:', e);
        // 停止计时器
        stopAIThinkingTimer();
        
        // 显示错误提示
        const timerElement = document.getElementById('ai-thinking-timer');
        const timerText = document.getElementById('timer-text');
        if (timerElement && timerText) {
            timerElement.classList.add('active');
            timerText.textContent = '❌ 错误';
            setTimeout(() => {
                timerElement.classList.remove('active');
            }, 3000);
        }
    }
}

// 启动AI思考计时器
function startAIThinkingTimer() {
    console.log('[AI Timer] 启动AI思考计时器');
    
    // 清除之前的计时器
    stopAIThinkingTimer();

    // 记录开始时间
    aiThinkingStartTime = Date.now();

    // 显示计时器
    const timerElement = document.getElementById('ai-thinking-timer');
    const timerText = document.getElementById('timer-text');
    
    console.log('[AI Timer] 计时器元素:', timerElement);
    console.log('[AI Timer] 计时器文本元素:', timerText);
    
    if (timerElement && timerText) {
        timerElement.classList.add('active');
        timerText.textContent = '0.0s';
        console.log('[AI Timer] 计时器已激活');
    } else {
        console.error('[AI Timer] 找不到计时器元素');
    }

    // 每隔100ms更新一次显示
    aiThinkingTimerInterval = setInterval(() => {
        const elapsed = Date.now() - aiThinkingStartTime;
        const seconds = (elapsed / 1000).toFixed(1);
        if (timerText) {
            timerText.textContent = `${seconds}s`;
        }

        // 如果超过60秒，显示警告
        if (elapsed > 60000 && elapsed % 5000 < 100) {
            console.warn(`AI思考时间过长: ${seconds}秒`);
        }
    }, 100);
}

// 停止AI思考计时器
function stopAIThinkingTimer() {
    if (aiThinkingTimerInterval) {
        clearInterval(aiThinkingTimerInterval);
        aiThinkingTimerInterval = null;
    }

    const timerElement = document.getElementById('ai-thinking-timer');
    if (timerElement) {
        timerElement.classList.remove('active');
    }

    aiThinkingStartTime = null;
}

// 更新游戏信息
function updateGameInfo() {
    if (!ui) return;
    ui.updateTurnIndicator();
    updatePlayerStatus();
}

// 更新玩家状态
function updatePlayerStatus() {
    if (!ui) return;

    if (gameMode === 'ai') {
        if (game.currentPlayer === 'red') {
            ui.updatePlayerStatus('red', '思考中...');
            ui.updatePlayerStatus('black', '等待中');
        } else {
            ui.updatePlayerStatus('red', '等待中');
            ui.updatePlayerStatus('black', '思考中...');
        }
    } else if (gameMode === 'ai-vs-ai') {
        if (game.currentPlayer === 'red') {
            ui.updatePlayerStatus('red', '思考中...');
            ui.updatePlayerStatus('black', '等待中');
        } else {
            ui.updatePlayerStatus('red', '等待中');
            ui.updatePlayerStatus('black', '思考中...');
        }
    } else if (gameMode === 'online') {
        if (isMyTurn) {
            ui.updatePlayerStatus(network.playerColor, '思考中...');
            ui.updatePlayerStatus(network.playerColor === 'red' ? 'black' : 'red', '等待中');
        } else {
            ui.updatePlayerStatus(network.playerColor, '等待中');
            ui.updatePlayerStatus(network.playerColor === 'red' ? 'black' : 'red', '思考中...');
        }
    }
}

// 悔棋
function undoMove() {
    if (!game) return;

    if (gameMode === 'online') {
        alert('在线对战不能悔棋');
        return;
    }

    if (gameMode === 'ai-vs-ai') {
        alert('AI对弈模式不能悔棋');
        return;
    }

    // AI模式下，检查是否轮到玩家（红方）
    if (gameMode === 'ai' && game.currentPlayer === 'black') {
        alert('请等待AI走完后再悔棋');
        return;
    }

    // 停止AI思考计时器（如果正在运行）
    stopAIThinkingTimer();

    if (game.undoMove()) {
        // AI模式下需要悔两步（玩家一步，AI一步）
        if (gameMode === 'ai') {
            game.undoMove();
        }

        // 更新lastMove标记
        if (game.moveHistory.length > 0) {
            const lastMove = game.moveHistory[game.moveHistory.length - 1];
            ui.lastMove = {
                from: { row: lastMove.from.row, col: lastMove.from.col },
                to: { row: lastMove.to.row, col: lastMove.to.col }
            };
        } else {
            ui.clearLastMove();
        }

        ui.render();
        updateGameInfo();

        // AI模式下，悔棋后轮到玩家走棋，不触发AI
        if (gameMode === 'ai') {
            isMyTurn = true;
            updatePlayerStatus();
        }
    }
}

// 重新开始
function restartGame() {
    document.getElementById('game-over-modal').classList.add('hidden');

    if (gameMode === 'ai') {
        startAIGame();
    } else if (gameMode === 'ai-vs-ai') {
        startAIVsAI();
    } else if (gameMode === 'online') {
        alert('请返回大厅重新开始');
    }
}

// 认输
function surrender() {
    if (!game) return;

    if (gameMode === 'ai-vs-ai') {
        alert('AI对弈模式不能认输');
        return;
    }

    if (gameMode === 'online') {
        network.surrender();
    }

    const winner = game.currentPlayer === 'red' ? 'black' : 'red';
    game.gameOver = true;
    ui.showGameOver(winner);
}
