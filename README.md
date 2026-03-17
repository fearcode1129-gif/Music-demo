# Music Player Demo

A complete React 18 frontend demo project built with JavaScript, React Router v6, and Vite.

## Tech Stack

- React 18
- JavaScript
- React Router v6
- Vite
- Functional Components + Hooks
- localStorage for persistence
- Promise + setTimeout for mock async requests

## Features

- Login and register pages
- Protected routes for song-related pages
- Local song list with default seed data
- Song detail page with add/delete comments
- User page with recent play history
- Global HTML5 audio player that keeps state across routes
- Loading and error states for async actions

## Default Account

- Username: `demo`
- Password: `123456`

## Available Routes

- `/login`
- `/register`
- `/`
- `/song/:id`
- `/user/:id`

## Getting Started

```bash
npm install
npm run dev
```

## Project Structure

```text
src/
  main.js
  components/
    Navbar.js
    Player.js
  pages/
    LoginPage.js
    RegisterPage.js
    SongListPage.js
    SongDetailPage.js
    UserPage.js
  contexts/
    AuthContext.js
  data/
    songs.js
  App.js
  styles.css
```
