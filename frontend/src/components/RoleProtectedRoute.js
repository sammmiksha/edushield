// components/RoleProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

function RoleProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || !allowedRoles.includes(role)) {
    return <Navigate to="/upload" replace />; // Redirect if not allowed
  }

  return children;
}

export default RoleProtectedRoute;
