# Music Player Demo

一个基于 React 18、Vite、React Router v6 和 Zustand 构建的音乐播放器前端 Demo 项目。

本项目模拟轻量级音乐平台的核心交互流程，包含登录注册、受保护路由、歌曲搜索、收藏、评论、最近播放以及全局 HTML5 音频播放器。所有业务数据均在前端管理，并通过浏览器端持久化方案保存。

## 项目简介

- 框架：React 18
- 构建工具：Vite
- 路由管理：React Router v6
- 状态管理：Zustand + persist
- 音频播放：HTML5 `audio`
- 数据来源：公开音乐搜索接口 + 本地兜底歌曲数据

## 功能特性

- 登录 / 注册流程与受保护路由控制
- 全局音乐播放器，支持播放、暂停、上一首、下一首、播放模式切换、进度控制与音量调节
- 歌曲列表页支持搜索、建议下拉、分栏切换、分页与风格筛选
- 歌曲详情页支持评论列表展示、添加评论与删除评论
- 收藏系统支持跨页面即时同步更新
- 用户页支持最近播放记录与我的喜欢展示
- 登录态、播放器状态、收藏、评论、搜索历史与最近播放支持浏览器端持久化
- 在无后端场景下仍可通过本地歌曲数据完成基本演示

## 技术栈

- React 18
- JavaScript
- Vite
- React Router v6
- Zustand
- HTML5 Audio
- 浏览器端持久化存储

## 项目结构

```text
src/
  App.jsx
  main.jsx
  styles.css
  components/
    Navbar.jsx
    Player.jsx
  data/
    songs.js
  pages/
    LikesPage.jsx
    LoginPage.jsx
    RegisterPage.jsx
    SongDetailPage.jsx
    SongListPage.jsx
    UserPage.jsx
  router/
    AppRouter.jsx
    ProtectedRoute.jsx
  services/
    musicApi.js
  store/
    authStore.js
    commentStore.js
    libraryStore.js
    playerStore.js
    searchStore.js
```

## 路由说明

- `/login`：登录页
- `/register`：注册页
- `/`：歌曲列表页
- `/likes`：我的喜欢页
- `/song/:id`：歌曲详情页
- `/user/:id`：用户页

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 打包生产版本

```bash
npm run build
```

### 本地预览生产版本

```bash
npm run preview
```

## 默认账号

- 用户名：`demo`
- 密码：`123456`

## 状态管理说明

项目使用 Zustand 替代 Context API 进行业务状态管理：

- `authStore`：管理登录态与用户会话
- `libraryStore`：管理曲库、收藏与最近播放
- `playerStore`：管理播放队列、当前歌曲、播放状态、播放模式与音量
- `searchStore`：管理搜索历史
- `commentStore`：管理歌曲评论

## 数据策略

- 项目不依赖后端服务
- 搜索结果优先来自公开音乐搜索接口
- 当远程数据不可用时，自动回退到本地示例歌曲数据
- 持久化数据通过 Zustand `persist` 保存到浏览器端

## 可用脚本

```bash
npm run dev
npm run build
npm run preview
```

## 说明

- 本项目为前端学习与作品展示用途
- 部分歌曲资源依赖第三方公开接口及其试听音频可用性
- 在远程接口不可用的情况下，项目仍可通过本地数据正常演示核心功能
