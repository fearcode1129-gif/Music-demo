import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { selectFavoriteSongIdsByUser, useLibraryStore } from '../store/libraryStore';

const Navbar = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const favoriteSongIds = useLibraryStore(selectFavoriteSongIdsByUser(currentUser?.id));
  const isAuthenticated = Boolean(currentUser);
  const favoriteCount = favoriteSongIds.length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar__inner page-shell">
        <Link to={isAuthenticated ? '/' : '/login'} className="brand">
          <span className="brand__badge">MP</span>
          <div>
            <strong>Music Player Demo</strong>
            <p>Your pocket music library</p>
          </div>
        </Link>

        <nav className="nav-links">
          {isAuthenticated && <NavLink to="/">歌曲列表</NavLink>}
          {isAuthenticated && <NavLink to="/likes">我的喜欢 {favoriteCount > 0 ? `(${favoriteCount})` : ''}</NavLink>}
          {!isAuthenticated && <NavLink to="/login">登录</NavLink>}
          {!isAuthenticated && <NavLink to="/register">注册</NavLink>}
        </nav>

        <div className="nav-user">
          {isAuthenticated && currentUser ? (
            <>
              <Link to={`/user/${currentUser.id}`} className="user-chip">
                <img src={currentUser.avatar} alt={currentUser.username} className="avatar" />
                <span>{currentUser.username}</span>
              </Link>
              <button type="button" className="secondary-btn" onClick={handleLogout}>
                退出
              </button>
            </>
          ) : (
            <span className="muted-text">默认账号: demo / 123456</span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
