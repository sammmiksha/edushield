// App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AuthForm from "./AuthForm";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AppRoutes from "./AppRoutes";

/* ----------------------------------------
   INNER APP (has access to useNavigate)
---------------------------------------- */
function AppContent() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState("login");

  /* Restore session */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      setAuthLoading(false);
      return;
    }

    fetch("http://127.0.0.1:8000/me", {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setToken(storedToken);
        setUser(data);
      })
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  /* Login success */
  const handleAuthSuccess = async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);

    try {
      const res = await fetch("http://127.0.0.1:8000/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setUser(data);
      toast.success("Login successful!");
    } catch {
      toast.error("Authentication failed");
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);
    }
  };

  /* 🔥 FIXED LOGOUT */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.info("Logged out");

    navigate("/", { replace: true }); // ✅ FORCE REDIRECT
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 text-lg">
        Loading…
      </div>
    );
  }

  return (
    <>
      {!user ? (
        <Routes>
          <Route
            path="/"
            element={
              <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-blue-300 via-white to-cyan-300 p-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                  EduShield Authentication
                </h1>

                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setMode("login")}
                    className={`px-6 py-2 rounded-md text-white ${
                      mode === "login"
                        ? "bg-blue-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    Login
                  </button>

                  <button
                    onClick={() => setMode("signup")}
                    className={`px-6 py-2 rounded-md text-white ${
                      mode === "signup"
                        ? "bg-cyan-600"
                        : "bg-cyan-500 hover:bg-cyan-600"
                    }`}
                  >
                    Signup
                  </button>
                </div>

                <AuthForm mode={mode} onSuccess={handleAuthSuccess} />
              </div>
            }
          />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      ) : (
        <AppRoutes user={user} onLogout={handleLogout} />
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

/* ----------------------------------------
   OUTER ROUTER
---------------------------------------- */
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
