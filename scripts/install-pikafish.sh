#!/bin/bash

# Pikafish 自动安装脚本
# 支持 macOS 和 Linux

set -e

ENGINES_DIR="$(dirname "$0")/../engines"
PIKAFISH_URL=""
PIKAFISH_FILE="pikafish"

echo "======================================"
echo "  Pikafish 引擎自动安装脚本"
echo "======================================"
echo ""

# 检测操作系统
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "检测到系统: $OS $ARCH"

# 根据系统和架构选择下载链接
case "$OS" in
    Darwin)
        if [ "$ARCH" = "arm64" ]; then
            echo "检测到 Apple Silicon (ARM64)"
            # 注意：GitHub 可能没有预编译的 ARM64 macOS 版本
            # 用户可能需要自己编译
            echo ""
            echo "⚠️  macOS ARM64 版本需要从源代码编译"
            echo "是否现在编译？(y/n)"
            read -r response
            if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
                compile_from_source
            else
                echo "请访问以下地址手动下载："
                echo "https://github.com/official-pikafish/Pikafish/releases"
            fi
            exit 0
        else
            PIKAFISH_URL="https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-macos-x86-64"
        fi
        ;;
    Linux)
        if [ "$ARCH" = "x86_64" ]; then
            PIKAFISH_URL="https://github.com/official-pikafish/Pikafish/releases/latest/download/pikafish-linux-x86-64"
        else
            echo "❌ 不支持的架构: $ARCH"
            echo "请从源代码编译 Pikafish"
            exit 1
        fi
        ;;
    *)
        echo "❌ 不支持的操作系统: $OS"
        exit 1
        ;;
esac

# 创建 engines 目录
if [ ! -d "$ENGINES_DIR" ]; then
    echo "创建 engines 目录..."
    mkdir -p "$ENGINES_DIR"
fi

# 下载 Pikafish
echo ""
echo "正在下载 Pikafish..."
echo "从: $PIKAFISH_URL"

if command -v curl &> /dev/null; then
    curl -L -o "$ENGINES_DIR/$PIKAFISH_FILE" "$PIKAFISH_URL"
elif command -v wget &> /dev/null; then
    wget -O "$ENGINES_DIR/$PIKAFISH_FILE" "$PIKAFISH_URL"
else
    echo "❌ 错误: 需要 curl 或 wget 来下载文件"
    exit 1
fi

# 赋予执行权限
echo "赋予执行权限..."
chmod +x "$ENGINES_DIR/$PIKAFISH_FILE"

# 验证安装
echo ""
echo "验证安装..."
if "$ENGINES_DIR/$PIKAFISH_FILE" uci &> /dev/null <<EOF
uci
isready
quit
EOF
then
    echo "✅ Pikafish 安装成功！"
    echo ""
    echo "位置: $ENGINES_DIR/$PIKAFISH_FILE"
    echo ""
    echo "现在可以启动游戏服务器了："
    echo "  npm start"
else
    echo "❌ Pikafish 安装失败"
    echo "请尝试手动下载和安装"
    exit 1
fi

# 从源代码编译
compile_from_source() {
    echo ""
    echo "======================================"
    echo "  从源代码编译 Pikafish"
    echo "======================================"
    echo ""
    
    # 检查依赖
    if ! command -v git &> /dev/null; then
        echo "❌ 错误: 需要 git 来克隆仓库"
        echo "请安装 git: brew install git (macOS) 或 apt install git (Linux)"
        exit 1
    fi
    
    if ! command -v make &> /dev/null; then
        echo "❌ 错误: 需要 make 来编译"
        echo "请安装 build tools: xcode-select --install (macOS) 或 apt install build-essential (Linux)"
        exit 1
    fi
    
    # 创建临时目录
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    echo "克隆 Pikafish 仓库..."
    git clone https://github.com/official-pikafish/Pikafish.git
    cd Pikafish/src
    
    echo "编译 Pikafish (这可能需要几分钟)..."
    make -j profile-build
    
    echo "复制到 engines 目录..."
    cp pikafish "$ENGINES_DIR/$PIKAFISH_FILE"
    chmod +x "$ENGINES_DIR/$PIKAFISH_FILE"
    
    # 清理临时文件
    cd /
    rm -rf "$TEMP_DIR"
    
    echo "✅ 编译完成！"
}
