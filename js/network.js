// 网络通信
class NetworkManager {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.playerName = this.generatePlayerName();
        this.connected = false;
        this.currentGameId = null;
        this.playerColor = null;
        this.callbacks = {};
    }

    // 生成随机玩家名
    generatePlayerName() {
        const adjectives = ['快乐', '聪明', '勇敢', '机智', '冷静', '热情', '谦虚', '自信'];
        const nouns = ['棋手', '大师', '高手', '玩家', '达人', '新星', '王者', '传奇'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 1000);
        return `${adj}${noun}${num}`;
    }

    // 连接服务器
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:3001`;
        
        this.ws = new WebSocket(wsUrl);

        // 将 WebSocket 暴露到全局，供 PikafishAI 使用
        window.gameWebSocket = this.ws;

        this.ws.onopen = () => {
            console.log('WebSocket连接成功');
            this.connected = true;
            this.send({
                type: 'login',
                playerId: this.playerId,
                playerName: this.playerName
            });
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket连接关闭');
            this.connected = false;
            // 5秒后重连
            setTimeout(() => this.connect(), 5000);
        };
    }

    // 发送消息
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // 处理消息
    handleMessage(data) {
        console.log('收到消息:', data);

        switch (data.type) {
            case 'login':
                this.playerId = data.playerId;
                console.log('登录成功, 玩家ID:', this.playerId);
                break;

            case 'playerList':
                if (this.callbacks.onPlayerList) {
                    this.callbacks.onPlayerList(data.players);
                }
                break;

            case 'challenge':
                if (this.callbacks.onChallenge) {
                    this.callbacks.onChallenge(data);
                }
                break;

            case 'challengeResponse':
                if (this.callbacks.onChallengeResponse) {
                    this.callbacks.onChallengeResponse(data);
                }
                break;

            case 'gameStart':
                this.currentGameId = data.gameId;
                this.playerColor = data.color;
                if (this.callbacks.onGameStart) {
                    this.callbacks.onGameStart(data);
                }
                break;

            case 'move':
                if (this.callbacks.onMove) {
                    this.callbacks.onMove(data);
                }
                break;

            case 'gameOver':
                if (this.callbacks.onGameOver) {
                    this.callbacks.onGameOver(data);
                }
                break;

            case 'playerLeft':
                if (this.callbacks.onPlayerLeft) {
                    this.callbacks.onPlayerLeft(data);
                }
                break;
        }
    }

    // 获取在线玩家列表
    getPlayerList() {
        this.send({ type: 'getPlayerList' });
    }

    // 发起挑战
    challengePlayer(targetPlayerId) {
        this.send({
            type: 'challenge',
            targetPlayerId: targetPlayerId
        });
    }

    // 响应挑战
    respondToChallenge(challengeId, accepted) {
        this.send({
            type: 'challengeResponse',
            challengeId: challengeId,
            accepted: accepted
        });
    }

    // 发送移动
    sendMove(fromRow, fromCol, toRow, toCol) {
        this.send({
            type: 'move',
            gameId: this.currentGameId,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol }
        });
    }

    // 认输
    surrender() {
        this.send({
            type: 'surrender',
            gameId: this.currentGameId
        });
    }

    // 离开游戏
    leaveGame() {
        if (this.currentGameId) {
            this.send({
                type: 'leaveGame',
                gameId: this.currentGameId
            });
            this.currentGameId = null;
            this.playerColor = null;
        }
    }

    // 设置回调
    on(event, callback) {
        this.callbacks[event] = callback;
    }
}
