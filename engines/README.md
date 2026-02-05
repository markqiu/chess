# Pikafish 引擎安装指南

## 什么是 Pikafish？

Pikafish 是一个免费且强大的 UCI 象棋引擎，源自 Stockfish，是目前最强的开源中国象棋 AI 之一。

## 为什么需要 Pikafish？

- **更强的棋力**：Elo 评分 3950+，远超云库 API
- **本地运行**：无需网络连接，响应更快
- **可调节难度**：支持 20 个难度级别
- **完全免费**：开源软件，永久免费使用

## 下载 Pikafish

### 方法 1：从 GitHub Releases 下载（推荐）

1. 访问 Pikafish 官方发布页面：
   ```
   https://github.com/official-pikafish/Pikafish/releases/latest
   ```

2. 根据你的系统选择合适的版本：
   - **macOS (Apple Silicon/ARM64)**: 下载 `pikafish-macos-arm64`
   - **macOS (Intel)**: 下载 `pikafish-macos-x86-64`
   - **Windows**: 下载 `pikafish-windows-x86-64.exe`
   - **Linux**: 下载 `pikafish-linux-x86-64`

3. 将下载的文件重命名为 `pikafish`（macOS/Linux）或 `pikafish.exe`（Windows）

4. 将文件放到 `engines/` 目录下

### 方法 2：从 Actions 下载最新开发版本

1. 访问：
   ```
   https://github.com/official-pikafish/Pikafish/actions/workflows/pikafish.yml
   ```

2. 选择最新的运行

3. 滚动到底部，下载适合你系统的二进制文件

### 方法 3：从源代码编译

```bash
# 克隆仓库
git clone https://github.com/official-pikafish/Pikafish.git
cd Pikafish/src

# 编译
make -j profile-build

# 将编译好的 pikafish 复制到 engines 目录
cp pikafish ../../engines/
```

## 安装步骤

### macOS / Linux

1. 下载后，赋予执行权限：
   ```bash
   chmod +x engines/pikafish
   ```

2. 验证安装：
   ```bash
   ./engines/pikafish
   ```
   如果看到类似输出，说明安装成功：
   ```
   Pikafish ...
   uciok
   ```

3. 按 `Ctrl+C` 退出

### Windows

1. 下载 `pikafish-windows-x86-64.exe`

2. 重命名为 `pikafish.exe`

3. 放到 `engines/` 目录

4. 双击运行或在命令行中运行：
   ```
   engines\pikafish.exe
   ```

## 验证安装

启动游戏服务器后，查看控制台输出：

- ✅ 成功：`[服务器] Pikafish 引擎已就绪`
- ❌ 失败：`[服务器] Pikafish 引擎不可用，将使用云库 API`

## 使用 Pikafish

在游戏界面选择 AI 类型为 "Pikafish" 即可使用本地引擎。

### 难度设置

Pikafish 支持动态难度调整（1-10 级）：
- **1-3 级**：适合初学者
- **4-6 级**：适合中级玩家
- **7-10 级**：适合高级玩家

## 常见问题

### Q: Pikafish 和云库 API 有什么区别？

**云库 API**：
- 优点：无需安装，开箱即用
- 缺点：需要网络连接，棋力较弱（Elo ~2500）

**Pikafish**：
- 优点：本地运行，棋力极强（Elo 3950+），可调节难度
- 缺点：需要下载安装（约 10-20 MB）

### Q: Pikafish 会占用很多资源吗？

不会。Pikafish 非常高效：
- 内存占用：约 50-100 MB
- CPU 占用：根据难度设置，通常 10-30%

### Q: 游戏会自动回退到云库 API 吗？

是的。如果 Pikafish 不可用或计算失败，游戏会自动使用云库 API 作为后备方案。

### Q: 如何更新 Pikafish？

只需下载新版本的可执行文件，替换 `engines/pikafish` 即可。

## 技术支持

- Pikafish 官网：https://pikafish.org/
- GitHub 仓库：https://github.com/official-pikafish/Pikafish
- 问题反馈：https://github.com/official-pikafish/Pikafish/issues

## 许可证

Pikafish 采用 GNU General Public License version 3 (GPLv3) 许可证。
