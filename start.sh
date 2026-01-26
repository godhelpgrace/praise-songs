#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 进入项目根目录
cd "$SCRIPT_DIR"

echo "=================================="
echo "   正在启动 赞美吧 Web 应用程序"
echo "=================================="

# 检查 web 目录是否存在
if [ ! -d "web" ]; then
    echo "错误: 找不到 web 目录。"
    exit 1
fi

# 进入 web 目录
cd web

# 检查 node_modules 是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
    echo "未检测到依赖包，正在执行 npm install..."
    npm install
    if [ $? -ne 0 ]; then
        echo "依赖安装失败，请检查网络或 npm 配置。"
        exit 1
    fi
else
    echo "依赖包已存在，跳过安装。"
fi

# 启动开发服务器
echo "正在启动 Next.js 开发服务器..."
npm run dev
