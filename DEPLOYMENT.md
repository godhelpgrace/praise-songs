# 爱赞美 (Zanmei) 部署指南

本指南详细说明了如何使用 Docker 将爱赞美项目部署到 Linux/Mac/Windows 服务器上。

## 📋 准备工作

在开始之前，请确保你的服务器满足以下条件：

1.  **操作系统**: Linux (推荐 Ubuntu/CentOS), macOS, 或 Windows。
2.  **环境依赖**: 已安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)。
3.  **端口**: 确保服务器的 `3000` 端口（或你自定义的端口）未被占用且防火墙已放行。

## 🚀 快速部署步骤

### 1. 获取项目代码

将项目代码上传到服务器。建议创建一个专用目录，例如 `/opt/zanmei`。

```bash
# 示例：创建目录
mkdir -p /opt/zanmei
cd /opt/zanmei
```

你需要上传以下文件/目录：
- `Dockerfile`
- `docker-compose.yml`
- `web/` (包含源代码)
- `db.json` (可选，作为初始数据源)

### 2. 初始化数据目录

在服务器上创建用于持久化存储数据库和文件的目录：

```bash
# 在项目根目录下执行
mkdir -p data/db
mkdir -p data/storage
```

### 3. 准备数据库文件

由于项目使用 SQLite，建议先在本地生成初始化的数据库文件，然后上传到服务器，以避免在服务器容器内进行初始化的复杂性。

**在本地开发机上执行：**

```bash
cd web
# 安装依赖
npm install
# 生成 Prisma Client
npx prisma generate
# 推送数据库结构
npx prisma db push
```

**重要说明**：
执行 `npx prisma db push` 后，Prisma 会根据 `.env` 文件中的配置生成数据库文件。
请检查你本地 `web/.env` 文件中的 `DATABASE_URL` 配置。
例如，如果配置是 `DATABASE_URL="file:../../data/db/dev.db"`，那么生成的数据库文件将位于项目根目录下的 `data/db/dev.db`。

**上传文件：**
找到生成的 `dev.db` 文件（位于项目根目录的 `data/db/` 目录下），将其上传到服务器的 `/opt/zanmei/data/db/` 目录下。

### 4. 启动服务

在服务器项目根目录下运行 Docker Compose：

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

## ⚙️ 配置说明

### 端口修改
默认服务运行在 `3000` 端口。如需修改（例如改为 80 端口），请编辑 `docker-compose.yml`：

```yaml
services:
  web:
    ports:
      - "80:3000"  # 将宿主机的 80 端口映射到容器的 3000 端口
```

### 数据持久化
所有重要数据都存储在宿主机的 `./data` 目录下，**请定期备份此目录**：
- `./data/db`: 存放 SQLite 数据库文件 (`dev.db`)。
- `./data/storage`: 存放用户上传的所有媒体文件（音频、图片、歌谱等）。

### 环境变量
主要环境变量在 `docker-compose.yml` 中定义：
- `DATABASE_URL`: 数据库连接字符串，默认为 `file:/app/db/dev.db`。
- `STORAGE_PATH`: 文件存储路径，默认为 `/app/storage`。

## 🛠 常见问题排查

**Q: 容器启动后立即退出？**
A: 检查日志 `docker-compose logs web`。常见原因是数据库文件不存在或权限问题。确保 `data/db/dev.db` 存在且 Docker 进程有读写权限。

**Q: 上传文件失败？**
A: 检查 `data/storage` 目录权限。容器内的 `nextjs` 用户（UID 1001）需要有写入权限。你可以尝试放宽权限：`chmod -R 777 data/storage`。

**Q: 如何更新代码？**
A: 上传新的代码覆盖旧文件，然后重新运行构建命令：
```bash
docker-compose down
docker-compose up -d --build
```
