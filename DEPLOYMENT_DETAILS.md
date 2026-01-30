# 爱赞美 (Zanmei) 部署架构详情

本文档详细描述了爱赞美项目的部署架构、组件交互及关键配置细节。

## 🏗 系统架构

项目采用 Docker 容器化部署，包含三个核心服务：应用服务 (Web)、反向代理 (Nginx) 和 证书管理 (Certbot)。

```mermaid
graph TD
    User[用户 (Browser)] -->|HTTPS (443)| Nginx[Nginx 反向代理]
    User -->|HTTP (80)| Nginx
    
    subgraph "Docker Network"
        Nginx -->|Proxy Pass| Web[Next.js 应用 (Port 3000)]
        Nginx -.->|Challenge| Certbot[Certbot 证书服务]
    end
    
    subgraph "Data Volumes"
        Web --> DB[(SQLite DB)]
        Web --> Storage[媒体文件存储]
        Certbot --> Certs[SSL 证书]
        Nginx --> Certs
    end
```

## 🧩 组件详解

### 1. Web 应用 (`web`)
- **镜像**: 基于 `node:20-alpine` 构建。
- **构建方式**: 使用 Next.js Standalone 模式 (`output: 'standalone'`)，显著减小镜像体积。
- **端口**: 内部暴露 3000 端口，不直接对公网开放。
- **数据持久化**:
  - `/app/db`: 存储 SQLite 数据库文件。
  - `/app/storage`: 存储用户上传的资源。

### 2. 反向代理 (`nginx`)
- **作用**: 
  - 处理所有入口流量 (HTTP/HTTPS)。
  - 强制 HTTP 重定向到 HTTPS。
  - SSL/TLS 终结 (SSL Termination)。
  - 静态资源缓存与 Gzip 压缩。
- **配置**: 挂载 `./nginx/nginx.conf`。

### 3. 证书管理 (`certbot`)
- **作用**: 自动化申请和续期 Let's Encrypt 免费 SSL 证书。
- **机制**: 
  - 启动时检查证书。
  - 每 12 小时检查一次证书有效期。
  - 证书过期前自动续期并重载 Nginx。

## 📂 关键文件说明

| 文件路径 | 说明 |
|---------|------|
| `docker-compose.yml` | 定义服务编排、网络及挂载卷。 |
| `nginx/nginx.conf` | Nginx 配置文件，包含 SSL 参数和反向代理规则。 |
| `init-letsencrypt.sh` | **初始化脚本**。首次部署时运行，负责生成临时证书、启动 Nginx、验证域名并获取正式证书。 |
| `web/next.config.ts` | Next.js 配置，必须启用 `output: 'standalone'`。 |

## 🛠 常用维护命令

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志 (如 web)
docker-compose logs -f web
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 手动强制续期证书
```bash
docker-compose run --rm certbot renew --force-renewal
docker-compose exec nginx nginx -s reload
```

## 🔒 安全性说明

1.  **最小权限原则**: Web 容器仅以非 root 用户 (`nextjs`) 运行。
2.  **网络隔离**: Web 服务端口不暴露到宿主机，仅通过 Nginx 访问。
3.  **SSL/TLS**: 使用强加密套件，禁用不安全的旧协议。