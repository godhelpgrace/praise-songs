#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 进入项目根目录
cd "$SCRIPT_DIR"

# 默认端口
PORT=3001

# 解析命令行参数
while getopts "p:" opt; do
  case $opt in
    p)
      PORT=$OPTARG
      ;;
    \?)
      echo "无效选项: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}   正在启动 赞美吧 (Zanmei) Web 应用${NC}"
echo -e "${GREEN}==================================${NC}"

# 1. 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未检测到 Node.js。请先安装 Node.js (推荐 v18+)。${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "Node.js 版本: ${YELLOW}${NODE_VERSION}${NC}"

# 2. 检查 web 目录是否存在
if [ ! -d "web" ]; then
    echo -e "${RED}错误: 找不到 web 目录。请确保脚本在项目根目录下运行。${NC}"
    exit 1
fi

# 3. 进入 web 目录并检查依赖
cd web

echo -e "正在检查依赖..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}未检测到依赖包，正在首次安装 (npm install)...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}依赖安装失败，请检查网络或 npm 配置。${NC}"
        exit 1
    fi
    echo -e "${GREEN}依赖安装完成。${NC}"
else
    echo -e "${GREEN}依赖包已存在。${NC}"
fi

# 4. 启动开发服务器
echo -e "${GREEN}正在启动 Next.js 开发服务器...${NC}"
echo -e "端口: ${YELLOW}${PORT}${NC}"
echo -e "访问地址: ${YELLOW}http://localhost:${PORT}${NC}"
echo -e "按 Ctrl+C 停止服务器"
echo "----------------------------------"

npm run dev -- -p $PORT
