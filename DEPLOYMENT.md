# 爱赞美 (Zanmei) 部署指南

本指南详细说明了如何使用 Docker 将爱赞美项目部署到 Linux/Mac/Windows 服务器上。

## 📋 准备工作

在开始之前，请确保你的服务器满足以下条件：

1.  **操作系统**: Linux (推荐 Ubuntu/CentOS), macOS, 或 Windows。
2.  **环境依赖**: 已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。
3.  **Git**: 用于克隆项目代码。
4.  **端口**: 确保服务器的 `3000` 端口（Web 服务）未被占用且防火墙已放行。

## 🚀 快速部署步骤

### 1. 获取项目代码

推荐使用 Git 克隆项目代码到服务器。建议创建一个专用目录，例如 `/opt/zanmei`。

```bash
# 进入部署目录
cd /opt

# 克隆项目 (国内推荐使用 Gitee)
git clone https://gitee.com/jireh_rick/praise-songs.git zanmei

# 进入项目目录
cd zanmei
```

### 2. 初始化数据目录

在服务器上创建用于持久化存储数据库和文件的目录：

```bash
# 在项目根目录下执行
mkdir -p data/db
mkdir -p data/storage
```

### 3. 准备数据库文件

由于项目使用 SQLite，且 Docker 容器启动时默认不执行数据库迁移，你需要先准备好初始化的数据库文件。

**方式 A：本地生成并上传 (推荐)**

1.  在本地开发机上生成数据库：
    ```bash
    cd web
    npm install
    npx prisma generate
    npx prisma db push
    ```
    *(此时会在 `web/prisma/dev.db` 或项目根目录 `data/db/dev.db` 生成数据库文件，具体取决于你的 `.env` 配置)*

2.  将生成的 `dev.db` 文件上传到服务器的 `/opt/zanmei/data/db/` 目录下。

**方式 B：在服务器上临时生成**

如果你不想在本地操作，也可以利用 Docker 临时容器来生成：

```bash
# 确保 data/db 目录存在且有写入权限
chmod 777 data/db

# 运行一个临时容器来执行数据库初始化
docker run --rm -v $(pwd)/data/db:/app/db -v $(pwd)/web/prisma:/app/prisma -w /app node:18-alpine sh -c "npm install -g prisma && prisma generate --schema=./prisma/schema.prisma && export DATABASE_URL='file:/app/db/dev.db' && prisma db push --schema=./prisma/schema.prisma"
```

### 4. 启动服务

在项目根目录下运行 Docker Compose：

```bash
# 构建镜像并后台启动容器
docker-compose up -d --build
```

### 5. 验证部署

查看容器运行状态：
```bash
docker-compose ps
```

查看实时日志：
```bash
docker-compose logs -f
```

如果一切正常，访问 `http://服务器IP:3000` 即可看到运行中的爱赞美网站。

## ⚙️ 高级配置

### 端口修改
默认服务运行在 `3000` 端口。如需修改（例如改为 80 端口），请编辑 `docker-compose.yml`：

```yaml
services:
  web:
    ports:
      - "80:3000"  # 将宿主机的 80 端口映射到容器的 3000 端口
```

### 数据持久化与备份
所有重要数据都存储在宿主机的 `./data` 目录下，**请务必定期备份此目录**：
- `./data/db`: 存放 SQLite 数据库文件 (`dev.db`)。
- `./data/storage`: 存放用户上传的所有媒体文件（音频、图片、歌谱等）。

### 远程访问 Prisma Studio (数据库管理)

项目集成了 Prisma Studio 数据管理工具。由于安全原因，它默认只允许本地访问。如果你在远程服务器上部署，可以通过 **SSH 隧道** 来访问：

1.  **建立 SSH 隧道** (在本地电脑执行)：
    ```bash
    # 将服务器的 5556 端口映射到本地的 5556 端口
    ssh -L 5556:localhost:5556 root@your_server_ip
    ```

2.  **启动 Studio** (如果尚未启动)：
    在服务器容器内或服务器上启动 Prisma Studio（通常我们在开发环境使用，生产环境建议按需启动）。
    
    或者，你可以临时修改 `docker-compose.yml` 暴露端口（不推荐用于生产环境）：
    ```yaml
    ports:
      - "3000:3000"
      - "127.0.0.1:5556:5556" # 仅允许服务器本地访问
    ```

3.  **访问**:
    在本地浏览器访问 [http://localhost:5556](http://localhost:5556)。

## 🛠 常见问题排查

**Q: 容器启动后立即退出？**
A: 检查日志 `docker-compose logs web`。常见原因是数据库文件不存在或权限问题。确保 `data/db/dev.db` 存在。

**Q: 上传文件失败？**
A: 检查 `data/storage` 目录权限。容器内的 `nextjs` 用户（UID 1001）需要有写入权限。你可以尝试放宽权限：`chmod -R 777 data/storage`。

**Q: 如何更新代码？**
A: 
```bash
git pull
docker-compose down
docker-compose up -d --build
```
