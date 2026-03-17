import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LikesPage from '../pages/LikesPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import SongDetailPage from '../pages/SongDetailPage';
import SongListPage from '../pages/SongListPage';
import UserPage from '../pages/UserPage';
import ProtectedRoute from './ProtectedRoute';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <SongListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/likes"
        element={
          <ProtectedRoute>
            <LikesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/song/:id"
        element={
          <ProtectedRoute>
            <SongDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:id"
        element={
          <ProtectedRoute>
            <UserPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
