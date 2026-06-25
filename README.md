# 灵犀 AI 对话助手

> 一个轻量级、功能完备的 AI 对话 Web 应用，支持流式输出、图文对话、Markdown 渲染与主题切换。


## 项目简介

灵犀 AI 对话助手是一款基于原生 Web 技术构建的 AI 聊天机器人前端应用。用户可以通过文本或图片与 AI 进行多轮对话，体验流畅的流式输出、丰富的 Markdown 渲染效果，以及明亮/暗黑双主题切换。项目不依赖任何前端框架，使用纯 HTML + CSS + JavaScript 实现，适合作为前端学习、AI 应用入门或求职作品展示。

## 功能特性

- 🤖 **AI 流式对话** — 基于 SSE（Server-Sent Events）实现回答内容的逐字流式渲染，用户无需等待完整回答即可实时阅读
- 🖼️ **图文对话** — 支持上传图片并发送给 AI 进行分析，采用前端 Canvas 压缩降低传输体积
- 🌓 **主题切换** — 支持明亮 / 暗黑双主题，切换状态持久化到 localStorage
- 📝 **Markdown 渲染** — 使用 marked.js 解析 Markdown，集成 highlight.js 实现代码块语法高亮与一键复制
- ⌨️ **键盘快捷键** — Enter 发送消息，Shift + Enter 换行
- 💬 **快捷卡片** — 首页展示推荐问题卡片，一键填充并发送
- ⏹️ **中止生成** — 支持随时停止 AI 回复生成
- 🗑️ **清空对话** — 一键清除聊天记录，恢复欢迎页
- 📱 **响应式布局** — 适配桌面与移动端
- 🔑 **本地 API Key 管理** — 基于 localStorage 安全存储用户 API 密钥

## 技术栈

| 类别       | 技术                                  |
| ---------- | ------------------------------------- |
| 前端框架   | 原生 HTML / CSS / JavaScript（无框架）  |
| Markdown   | marked.js v12                         |
| 代码高亮   | highlight.js v11                      |
| 图标       | Emoji 原生图标                        |
| 后端通信   | Fetch API + SSE 流式数据              |
| 存储       | localStorage                         |
| 图片处理   | Canvas API（前端压缩）                |

## 项目结构

```
├── index.html          # 主页面：布局、模态框、欢迎区与输入区
├── css/
│   └── index.css       # 全局样式：主题变量、消息气泡、响应式适配
├── js/
│   └── index.js        # 核心逻辑：流式请求、Markdown 渲染、状态管理
├── assets/
│   └── avatar.png      # AI 头像图片
└── README.md
```

## 核心流程

```
用户输入/选择卡片 → 检查 API Key → POST 请求 → SSE 流式读取
    → 逐帧解析 data chunk → marked.js 实时渲染 → 自动滚动到最新内容
```

1. 用户在输入框键入问题或点击快捷卡片
2. 前端通过 `fetch` 向 `localhost:3000/api/chat` 发起 POST 请求，设置 `Accept: text/event-stream`
3. 后端返回 SSE 流式数据，前端使用 `ReadableStream` 逐块读取
4. 每收到一段内容，立即通过 `marked.parse()` 渲染为 HTML 并更新 DOM
5. 同步应用代码语法高亮并为代码块添加复制按钮
6. 支持中途取消请求（AbortController）停止生成

## 使用方式

1. 确保后端 API 服务已在 `localhost:3000` 启动
2. 在浏览器中打开 `index.html`
3. 首次使用时输入阿里云 API Key（自动保存到 localStorage）
4. 开始对话——输入文字或上传图片，按 Enter 发送

## 关于作者

- 流式数据传输（SSE）的前端处理方案
- Markdown 安全渲染与 XSS 防护
- 前端 Canvas 图片压缩
- localStorage 轻量级状态持久化
- 响应式布局与深色主题适配
- 原生 JavaScript 异步编程（async/await、ReadableStream）

---


