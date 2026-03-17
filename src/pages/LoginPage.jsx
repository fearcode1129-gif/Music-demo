import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LoginPage = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoading = useAuthStore((state) => state.authLoading);
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = Boolean(currentUser);
  const [formData, setFormData] = useState({ username: 'demo', password: '123456' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(formData.username, formData.password);
      navigate(location.state?.from?.pathname || '/');
    } catch (err) {
      setError(err?.message || '登录失败，请稍后重试。');
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>欢迎回来</h1>
        <p>使用默认账号或你注册的账号登录。</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            用户名
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="请输入用户名"
              required
            />
          </label>

          <label>
            密码
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="请输入密码"
              required
            />
          </label>

          {error && <div className="message error">{error}</div>}

          <button type="submit" className="primary-btn" disabled={authLoading}>
            {authLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="helper-text">
          默认账号: <code>demo</code> / <code>123456</code>，没有账号可前往 <Link to="/register">注册</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
