import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/Auth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log("auth")
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
