import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const RegisterPage = () => {
  const currentUser = useAuthStore((state) => state.currentUser);
  const authLoading = useAuthStore((state) => state.authLoading);
  const register = useAuthStore((state) => state.register);
  const isAuthenticated = Boolean(currentUser);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      await register(formData.username, formData.password);
      navigate('/');
    } catch (err) {
      setError(err?.message || '注册失败，请稍后重试。');
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h1>创建账号</h1>
        <p>注册后会自动登录，所有数据都保存在浏览器本地。</p>

        <form onSubmit={handleSubmit} className="form-grid">
          <label>
            用户名
            <input
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="例如 melody"
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
            {authLoading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="helper-text">
          已有账号前往 <Link to="/login">登录</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
