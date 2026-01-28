# 赞美吧 (Zanmei)

赞美吧是一个专注于基督教赞美诗歌的音乐资料库 Web 应用。本项目汇集了经典与现代的赞美诗专辑、歌曲、歌谱及歌词，旨在为用户提供优质的在线试听与浏览体验。

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
│   ├── context/         # React Context (状态管理)
│   ├── lib/             # 工具函数及数据库访问
│   ├── public/          # 静态资源
│   └── ...
├── storage/             # 本地媒体资源存储
│   ├── audio/           # 音频文件 (.mp3)
│   ├── images/          # 图片/封面文件
│   ├── lrc/             # 歌词文件 (.lrc)
│   └── sheets/          # 歌谱文件
├── db.json              # 本地 JSON 数据库文件
├── start.sh             # 项目启动脚本
└── zanmei_structure.md  # 网站结构说明文档
```

## 🛠 技术栈

- **框架**: [Next.js](https://nextjs.org/) (React)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **数据存储**: 本地 JSON 文件 (`db.json`) + 文件系统
- **音频播放**: HTML5 Audio API

## 📝 功能特性

- **发现**: 首页推荐歌单、专辑及新歌。
- **乐库**: 浏览和搜索歌曲、专辑、音乐人。
- **歌谱**: 查看和下载歌曲对应的乐谱。
- **播放器**: 全局底部播放器，支持列表播放、歌词同步显示。
- **资料库**: 完整的专辑与歌曲信息管理。

## 📄 许可证

Private Project
