<div align="center">

<img src="src/app/icon.svg" width="96" height="96" alt="LiteS3" />

</div>

# LiteS3

简洁高效的个人对象存储文件管理系统。

---

- [English](./README.md) | 中文 

## 什么是 LiteS3？

LiteS3 是一款专为任何 S3 兼容对象存储服务打造的自托管文件管理界面。无论你使用的是 Cloudflare R2、AWS S3、MinIO 还是其他服务 —— LiteS3 都能为你提供一个干净、现代的 Web UI 来浏览、上传和管理你的文件。

无需复杂的设置，无服务商锁定。只需连接你的存储桶即可开始使用。

## 功能特性

- **多存储桶支持** —— 连接并管理多个 S3 兼容的存储桶
- **文件操作** —— 上传、下载、删除、重命名、移动、复制
- **文件预览** —— 图片、视频、音频、代码（语法高亮）、Markdown、纯文本
- **文件夹导航** —— 面包屑路径、创建文件夹
- **批量操作** —— 多选文件、批量删除 / 移动 / 复制 / 下载
- **网格与列表视图** —— 在卡片和表格布局之间切换
- **右键上下文菜单** —— 快捷操作
- **深色 / 浅色 / 系统主题** —— 平滑过渡
- **双语支持** —— 英文与中文
- **设置向导** —— 引导式数据库配置和管理员账户创建
- **响应式设计** —— 适配桌面端和移动端

## 快速开始

### 一键部署 (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/LogLInk1K/LiteS3)

点击上方按钮，然后在 Vercel 控制面板中添加以下环境变量：

| 变量 | 必填 | 描述 |
|---|---|---|
| `DATABASE_URL` | 是 | 数据库连接字符串（见下方） |
| `NEXTAUTH_SECRET` | 是 | 用于 JWT 签名的随机字符串 |
| `ENCRYPTION_KEY` | 是 | 用于数据加密的随机字符串 |

### 本地开发

```bash
git clone https://github.com/LogLInk1K/LiteS3.git
cd LiteS3
npm install
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000` —— 设置向导将引导你完成后续操作。

## 数据库

LiteS3 会自动从 `DATABASE_URL` 环境变量中检测数据库类型：

| `DATABASE_URL` | 类型 |
| --- | --- |
| *(未设置)* | SQLite (本地文件) |
| `file:...` | SQLite (本地文件) |
| `libsql://...` | SQLite (Turso) |
| `postgres://...` 或 `postgresql://...` | PostgreSQL |

如果使用 Turso，还需设置 `DATABASE_AUTH_TOKEN`。

## S3 兼容服务

LiteS3 适用于任何 S3 兼容的存储。常见 Endpoint：

| 服务 | Endpoint |
| --- | --- |
| Cloudflare R2 | `https://<account_id>.r2.cloudflarestorage.com` |
| AWS S3 | `https://s3.<region>.amazonaws.com` |
| MinIO | `http://localhost:9000` |

## 技术栈

Next.js 16 · React 19 · Tailwind CSS 4 · Drizzle ORM · NextAuth.js · AWS S3 SDK

## 开源协议

[AGPL-3.0](LICENSE)
