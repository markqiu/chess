// WebSocket服务器
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const express = require('express');
const path = require('path');
const PikafishWrapper = require('./pikafish-wrapper');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 创建 Pikafish 引擎实例
const pikafish = new PikafishWrapper();

// 初始化 Pikafish
pikafish.init().then(success => {
    if (success) {
        console.log('[服务器] Pikafish 引擎已就绪');
    } else {
        console.log('[服务器] Pikafish 引擎不可用，将使用云库 API');
    }
}).catch(err => {
    console.error('[服务器] Pikafish 初始化失败:', err);
});

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 存储玩家信息
const players = new Map();
// 存储游戏
const games = new Map();
// 存储挑战
const challenges = new Map();

// WebSocket连接
wss.on('connection', (ws) => {
    console.log('新客户端连接');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (error) {
            console.error('处理消息错误:', error);
        }
    });

    ws.on('close', () => {
        handleDisconnect(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
    });
});

// 处理消息
function handleMessage(ws, data) {
    switch (data.type) {
        case 'login':
            handleLogin(ws, data);
            break;
        case 'getPlayerList':
            sendPlayerList(ws);
            break;
        case 'challenge':
            handleChallenge(ws, data);
            break;
        case 'challengeResponse':
            handleChallengeResponse(ws, data);
            break;
        case 'move':
            handleMove(ws, data);
            break;
        case 'surrender':
            handleSurrender(ws, data);
            break;
        case 'leaveGame':
            handleLeaveGame(ws, data);
            break;
        case 'getPikafishMove':
            handleGetPikafishMove(ws, data);
            break;
        default:
            console.log('未知消息类型:', data.type);
    }
}

// 处理登录
function handleLogin(ws, data) {
    const playerId = data.playerId || uuidv4();
    const playerName = data.playerName || `玩家${Math.floor(Math.random() * 1000)}`;

    const player = {
        playerId: playerId,
        playerName: playerName,
        ws: ws,
        gameId: null,
        wins: 0,
        losses: 0,
        winRate: 0
    };

    players.set(playerId, player);
    ws.playerId = playerId;

    // 发送登录成功消息
    send(ws, {
        type: 'login',
        playerId: playerId,
        playerName: playerName
    });

    // 广播玩家列表更新
    broadcastPlayerList();

    console.log(`玩家登录: ${playerName} (${playerId})`);
}

// 发送玩家列表
function sendPlayerList(ws) {
    const playerList = [];
    players.forEach((player, playerId) => {
        if (!player.gameId) {
            playerList.push({
                playerId: playerId,
                playerName: player.playerName,
                winRate: player.winRate
            });
        }
    });

    send(ws, {
        type: 'playerList',
        players: playerList
    });
}

// 广播玩家列表
function broadcastPlayerList() {
    const playerList = [];
    players.forEach((player, playerId) => {
        if (!player.gameId) {
            playerList.push({
                playerId: playerId,
                playerName: player.playerName,
                winRate: player.winRate
            });
        }
    });

    players.forEach((player) => {
        if (!player.gameId) {
            send(player.ws, {
                type: 'playerList',
                players: playerList
            });
        }
    });
}

// 处理挑战
function handleChallenge(ws, data) {
    const challenger = players.get(ws.playerId);
    const targetPlayer = players.get(data.targetPlayerId);

    if (!challenger || !targetPlayer) {
        return;
    }

    const challengeId = uuidv4();
    const challenge = {
        challengeId: challengeId,
        challengerId: challenger.playerId,
        challengerName: challenger.playerName,
        targetId: targetPlayer.playerId,
        timestamp: Date.now()
    };

    challenges.set(challengeId, challenge);

    // 发送挑战给目标玩家
    send(targetPlayer.ws, {
        type: 'challenge',
        challengeId: challengeId,
        challengerId: challenger.playerId,
        challengerName: challenger.playerName
    });

    console.log(`${challenger.playerName} 挑战 ${targetPlayer.playerName}`);
}

// 处理挑战响应
function handleChallengeResponse(ws, data) {
    const challenge = challenges.get(data.challengeId);
    if (!challenge) return;

    const challenger = players.get(challenge.challengerId);
    const responder = players.get(challenge.targetId);

    if (!challenger || !responder) {
        challenges.delete(data.challengeId);
        return;
    }

    // 通知双方
    send(challenger.ws, {
        type: 'challengeResponse',
        accepted: data.accepted
    });

    if (data.accepted) {
        // 创建游戏
        createGame(challenger, responder);
    }

    challenges.delete(data.challengeId);
}

// 创建游戏
function createGame(player1, player2) {
    const gameId = uuidv4();
    const game = {
        gameId: gameId,
        player1: player1,
        player2: player2,
        player1Color: 'red',
        player2Color: 'black',
        currentTurn: 'red',
        status: 'playing'
    };

    games.set(gameId, game);
    player1.gameId = gameId;
    player2.gameId = gameId;

    // 通知双方游戏开始
    send(player1.ws, {
        type: 'gameStart',
        gameId: gameId,
        color: 'red',
        opponentName: player2.playerName,
        redPlayer: player1.playerName,
        blackPlayer: player2.playerName
    });

    send(player2.ws, {
        type: 'gameStart',
        gameId: gameId,
        color: 'black',
        opponentName: player1.playerName,
        redPlayer: player1.playerName,
        blackPlayer: player2.playerName
    });

    console.log(`游戏创建: ${player1.playerName} vs ${player2.playerName}`);
}

// 处理移动
function handleMove(ws, data) {
    const player = players.get(ws.playerId);
    if (!player || !player.gameId) return;

    const game = games.get(player.gameId);
    if (!game || game.status !== 'playing') return;

    // 验证是否是当前玩家的回合
    const playerColor = player === game.player1 ? game.player1Color : game.player2Color;
    if (playerColor !== game.currentTurn) return;

    // 转发移动给对手
    const opponent = player === game.player1 ? game.player2 : game.player1;
    send(opponent.ws, {
        type: 'move',
        from: data.from,
        to: data.to
    });

    // 切换回合
    game.currentTurn = game.currentTurn === 'red' ? 'black' : 'red';
}

// 处理认输
function handleSurrender(ws, data) {
    const player = players.get(ws.playerId);
    if (!player || !player.gameId) return;

    const game = games.get(player.gameId);
    if (!game) return;

    const opponent = player === game.player1 ? game.player2 : game.player1;
    const winner = player === game.player1 ? game.player2Color : game.player1Color;

    // 通知双方游戏结束
    const gameOverData = {
        type: 'gameOver',
        winner: winner,
        reason: 'surrender'
    };

    send(player.ws, gameOverData);
    send(opponent.ws, gameOverData);

    // 更新统计
    player.losses++;
    opponent.wins++;
    updateWinRate(player);
    updateWinRate(opponent);

    endGame(game);
}

// 处理离开游戏
function handleLeaveGame(ws, data) {
    const player = players.get(ws.playerId);
    if (!player || !player.gameId) return;

    const game = games.get(player.gameId);
    if (!game) return;

    const opponent = player === game.player1 ? game.player2 : game.player1;
    
    // 通知对手
    if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
        send(opponent.ws, {
            type: 'playerLeft',
            playerId: player.playerId
        });
    }

    endGame(game);
}

// 结束游戏
function endGame(game) {
    if (game.player1) {
        game.player1.gameId = null;
    }
    if (game.player2) {
        game.player2.gameId = null;
    }
    game.status = 'ended';
    games.delete(game.gameId);

    // 广播玩家列表更新
    broadcastPlayerList();
}

// 更新胜率
function updateWinRate(player) {
    const total = player.wins + player.losses;
    player.winRate = total > 0 ? Math.round((player.wins / total) * 100) : 0;
}

// 处理断开连接
function handleDisconnect(ws) {
    const player = players.get(ws.playerId);
    if (player) {
        console.log(`玩家断开连接: ${player.playerName}`);

        // 如果在游戏中，通知对手
        if (player.gameId) {
            const game = games.get(player.gameId);
            if (game) {
                const opponent = player === game.player1 ? game.player2 : game.player1;
                if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                    send(opponent.ws, {
                        type: 'playerLeft',
                        playerId: player.playerId
                    });
                }
                endGame(game);
            }
        }

        players.delete(ws.playerId);
        broadcastPlayerList();
    }
}

// 发送消息
function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

// 处理 Pikafish AI 走法请求
async function handleGetPikafishMove(ws, data) {
    try {
        const { fen, moves, level = 5 } = data;

        console.log('[Server] 收到 Pikafish 走法请求');
        console.log('[Server] FEN:', fen);
        console.log('[Server] 走法:', moves);
        console.log('[Server] 难度级别:', level);

        // 检查 Pikafish 是否可用
        if (!pikafish.isAvailable() || !pikafish.ready) {
            send(ws, {
                type: 'pikafishMove',
                success: false,
                error: 'Pikafish 引擎不可用',
                useCloudAPI: true
            });
            return;
        }

        console.log('[Server] Pikafish 引擎可用，开始计算');

        // 设置难度
        const options = pikafish.setLevel(level);
        console.log('[Server] 设置难度:', options);

        // 设置位置
        pikafish.setPosition(fen, moves);

        console.log('[Server] 设置棋局位置完成');

        // 开始计算
        console.log('[Server] 开始计算，深度:', options.depth, '超时:', 60000, 'ms');
        console.log('[Server] 计算开始时间:', new Date().toISOString());
        const bestMove = await pikafish.go({
            depth: options.depth,
            timeout: 60000
        });

        console.log('[Server] Pikafish 计算完成，最佳走法:', bestMove);

        send(ws, {
            type: 'pikafishMove',
            success: true,
            move: bestMove
        });

    } catch (error) {
        console.error('[服务器] Pikafish 计算失败:', error);
        send(ws, {
            type: 'pikafishMove',
            success: false,
            error: error.message,
            useCloudAPI: true
        });
    }
}

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
