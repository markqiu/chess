# 中国象棋 - 网页版

一个功能完整的网页版中国象棋游戏，支持人机对战和在线对战。

## 功能特性

### 🤖 人机对战
- 四个AI难度级别：
  - 🥉 **青铜** - 入门级别，适合初学者
  - 🥈 **白银** - 初级玩家，有一定挑战性
  - 🥇 **黄金** - 中级玩家，需要认真思考
  - 💎 **钻石** - 高级玩家，极具挑战性

### 👥 在线对战
- 实时在线玩家列表
- 点击头像发起挑战
- 挑战确认机制
- 实时对战同步
- 胜率统计

### 🎮 游戏功能
- 完整的中国象棋规则实现
- 将军、将死检测
- 悔棋功能
- 认输功能
- 重新开始
- 美观的UI界面
- 响应式设计，支持移动端

## 安装运行

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
npm start
```

### 3. 访问游戏
在浏览器中打开：`http://localhost:3001`

## 技术栈

### 前端
- HTML5 Canvas - 棋盘绘制
- CSS3 - 界面样式
- JavaScript ES6+ - 游戏逻辑
- WebSocket - 实时通信

### 后端
- Node.js - 服务器运行环境
- Express - Web服务器
- WebSocket - 实时通信

## 游戏规则

### 基本规则
- 红方先行
- 将/帅只能在九宫格内移动
- 士只能在九宫格内斜走
- 象不能过河，走田字
- 马走日字，会被蹩马腿
- 车走直线
- 炮隔子吃子
- 兵过河后可以左右移动

### 胜利条件
- 将死对方的将/帅
- 对方认输

## 项目结构

```
chess/
├── public/
│   ├── index.html          # 主页面
│   ├── css/
│   │   └── style.css       # 样式文件
│   └── js/
│       ├── gameLogic.js    # 游戏逻辑
│       ├── ai.js           # AI算法
│       ├── ui.js           # UI控制
│       ├── network.js      # 网络通信
│       └── main.js         # 主程序
├── src/
│   └── server.js           # WebSocket服务器
├── package.json
└── README.md
```

## AI引擎

本项目支持两种 AI 引擎：

### 1. 云库 API（默认）
- ✅ **开箱即用**：无需安装，自动使用
- ✅ **免费使用**：完全免费，无限制
- ⚠️ **需要网络**：依赖网络连接
- 📊 **棋力**：Elo ~2500

### 2. Pikafish 引擎（推荐）
- ✅ **超强棋力**：Elo 3950+，世界顶级水平
- ✅ **本地运行**：无需网络，响应更快
- ✅ **可调难度**：支持 20 个难度级别
- ⚠️ **需要安装**：需下载可执行文件（约 10-20 MB）

#### 安装 Pikafish

**macOS / Linux:**
```bash
# 使用自动安装脚本
./scripts/install-pikafish.sh

# 或手动下载
# 访问: https://github.com/official-pikafish/Pikafish/releases/latest
# 下载适合系统的版本，放到 engines/ 目录
```

**Windows:**
```cmd
# 使用自动安装脚本
scripts\install-pikafish.bat

# 或手动下载
# 访问: https://github.com/official-pikafish/Pikafish/releases/latest
# 下载 pikafish-windows-x86-64.exe，放到 engines\ 目录
```

详细安装说明请查看：[engines/README.md](engines/README.md)

#### 使用 Pikafish

安装完成后，在游戏界面选择 AI 类型为 "Pikafish" 即可。

如果 Pikafish 不可用，游戏会自动回退到云库 API。

## AI算法说明

### 青铜级别
- 随机选择走法
- 30%概率优先吃子
- 适合完全初学者

### 白银级别
- 使用简单的评估函数
- 考虑棋子价值和位置
- 搜索深度2层

### 黄金级别
- 使用Minimax算法
- Alpha-Beta剪枝优化
- 搜索深度4层
- 考虑位置加成和机动性

### 钻石级别
- 高级Minimax算法
- 更精确的评估函数
- 搜索深度5层
- 考虑中心控制等因素

## 开发说明

### 添加新功能
1. 前端功能：修改 `public/js/` 下的文件
2. 后端功能：修改 `src/server.js`
3. UI样式：修改 `public/css/style.css`

### 调试
- 打开浏览器开发者工具查看控制台日志
- WebSocket连接状态会在控制台显示

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！

## 联系方式

如有问题或建议，请提交Issue。
