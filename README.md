# 赞美吧 (Zanmei) - 爱赞美

赞美吧是一个专注于基督教赞美诗歌的音乐资料库 Web 应用。本项目汇集了经典与现代的赞美诗专辑、歌曲、歌谱及歌词，旨在为用户提供优质的在线试听、浏览与演示体验。

## 🚀 快速开始

### 前置要求

请确保您的系统已安装以下环境：
- [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)
- npm (Node.js 自带)

### 启动项目

我们在项目根目录提供了一个启动脚本，可以一键安装依赖并启动开发服务器。

1.  **打开终端**
2.  **运行启动脚本**：

    ```bash
    ./start.sh
    ```

    或者手动启动：

    ```bash
    cd web
    npm install
    # 初始化数据库（如果首次运行）
    npx prisma db push
    # 启动开发服务器
    npm run dev
    ```

3.  **访问应用**：
    打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📂 项目结构

```
.
├── web/                 # Next.js 前端应用源码
│   ├── app/             # App Router 路由及页面
│   ├── components/      # 通用 UI 组件
│   ├── lib/             # 工具函数 (db.ts 为 Prisma 客户端实例)
│   ├── prisma/          # 数据库定义
│   │   └── schema.prisma # 数据库模型定义文件
│   └── ...
├── storage/             # 本地媒体资源存储
│   ├── audio/           # 音频文件 (.mp3)
│   ├── images/          # 图片/封面文件
│   ├── lrc/             # 歌词文件 (.lrc)
│   └── sheets/          # 歌谱文件
├── data.db              # SQLite 数据库文件 (由 Prisma 管理)
├── start.sh             # 项目启动脚本
└── README.md            # 项目说明文档
```

## 🛠 技术栈

- **框架**: [Next.js 14+](https://nextjs.org/) (App Router, React Server Components)
- **语言**: TypeScript
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **数据库**: SQLite (轻量级关系型数据库)
- **ORM**: [Prisma](https://www.prisma.io/) (类型安全的数据库客户端)
- **音频播放**: HTML5 Audio API + 自定义 PlayerContext

## �️ 数据库与管理

本项目为 **SQLite + Prisma** 架构，以提供更高的数据一致性、性能和可扩展性。

### 数据库表结构 (Schema)

核心数据模型定义在 `web/prisma/schema.prisma` 中，主要包含以下表：

| 表名 (Model) | 描述 | 关键字段 |
| :--- | :--- | :--- |
| **Song** | 歌曲 | `title`, `artist`, `album`, `files` (JSON存储文件路径), `presentation` (演示配置) |
| **Album** | 专辑 | `name`, `cover`, `releaseDate`, `artist` |
| **Artist** | 音乐人 | `name`, `index` (首字母索引) |
| **Playlist** | 歌单 | `title`, `cover`, 关联 `Song` (多对多) |
| **User** | 用户 | `username`, `password`, `role` (admin/user) |
| **SystemSetting** | 系统设置 | `key`, `value` (如演示背景图配置) |

### 数据库管理方式

我们推荐使用 **Prisma CLI** 进行数据库管理。请在 `web` 目录下运行以下命令：

1.  **查看和管理数据 (GUI 界面)**
    启动 Prisma Studio，可以在浏览器中直观地查看、编辑、添加和删除数据。
    ```bash
    cd web
    npx prisma studio
    ```
    访问地址通常为: http://localhost:5555

2.  **同步数据库结构**
    当你修改了 `schema.prisma` 文件后，运行此命令将变更应用到数据库文件 (`data.db`)。
    ```bash
    cd web
    npx prisma db push
    ```

3.  **生成客户端代码**
    通常在 `npm install` 或 `db push` 后自动执行，但也可以手动运行以更新 TypeScript 类型提示。
    ```bash
    cd web
    npx prisma generate
    ```

## �📝 功能特性

- **发现**: 首页推荐歌单、专辑及新歌。
- **乐库**: 浏览和搜索歌曲、专辑、音乐人。
- **歌谱**: 查看和下载歌曲对应的乐谱，支持按拼音首字母索引。
- **播放器**: 全局底部播放器，支持列表播放、歌词同步显示、播放模式切换。
- **演示模式**: 专为投屏设计的歌词/歌谱演示功能，支持自定义缩放、偏移和背景，配置自动保存。
- **资料库管理**: 
    - 支持上传歌曲（自动识别元数据、关联专辑/歌手）。
    - 支持批量删除歌曲。
    - 专辑封面上传与更新。

## 📄 许可证

Private Project
