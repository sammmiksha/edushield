// App.js
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import { Toaster, toast } from "sonner";

import Sidebar from "./components/Sidebar";
import AuthForm from "./AuthForm";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AppRoutes from "./AppRoutes";
import { ThemeProvider } from "./context/ThemeContext";

function AppContent() {
  const navigate = useNavigate();

  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState("login");

 
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

    if (data.role === "student") {
      navigate("/student-dashboard", { replace: true });
    } else if (data.role === "faculty") {
      navigate("/faculty-dashboard", { replace: true });
    } else {
      navigate("/upload", { replace: true });
    }
  } catch {
    toast.error("Authentication failed");
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }
};
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    toast.info("Logged out");

    navigate("/", { replace: true }); 
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
<div className="min-h-screen bg-gradient-to-br from-indigo-200 via-white to-cyan-200 p-6">

  {/* Header section */}
  <div className="flex flex-col items-center">
   <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-6 drop-shadow-sm">
      EduShield Authentication
    </h1>
{/* 🚀 PRO Auth Toggle */}
<div className="relative flex bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl shadow-lg mb-12">

  {/* Sliding highlight */}
  <div
    className={`
      absolute top-1.5 bottom-1.5 w-[48%] rounded-xl
      bg-gradient-to-r from-indigo-600 to-cyan-500
      shadow-md
      transition-all duration-300 ease-in-out
      ${mode === "signup" ? "translate-x-full" : "translate-x-0"}
    `}
  />

  {/* Login */}
  <button
    onClick={() => setMode("login")}
    className={`
      relative z-10 flex-1 px-10 py-2.5 rounded-xl
      font-semibold tracking-wide
      transition-all duration-200
      ${
        mode === "login"
          ? "text-white"
          : "text-gray-700 hover:text-gray-900 hover:scale-[1.03]"
      }
    `}
  >
    Login
  </button>

  {/* Signup */}
  <button
    onClick={() => setMode("signup")}
    className={`
      relative z-10 flex-1 px-10 py-2.5 rounded-xl
      font-semibold tracking-wide
      transition-all duration-200
      ${
        mode === "signup"
          ? "text-white"
          : "text-gray-700 hover:text-gray-900 hover:scale-[1.03]"
      }
    `}
  >
    Signup
  </button>
</div>
  </div>

  {/* ⭐ REAL CENTER AREA */}
  <div className="flex items-start justify-center pt-10 min-h-[60vh]">
    <div className="perspective w-full max-w-md">
      <div className={`flip-card-inner ${mode === "signup" ? "flipped" : ""}`}>
        <div className="flip-card-front">
          <AuthForm mode="login" onSuccess={handleAuthSuccess} />
        </div>

        <div className="flip-card-back">
          <AuthForm mode="signup" onSuccess={handleAuthSuccess} />
        </div>
      </div>
    </div>
  </div>

</div>
            }
          />

          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Routes>
      ) : (
      <AppRoutes user={user} onLogout={handleLogout} />
)}
    </>
  );
}


export default function App() {
  return (
    <ThemeProvider>
      <Router>
                {/* 🔥 GLOBAL TOAST — NEVER UNMOUNT */}
        <Toaster position="top-right" richColors />

        <AppContent />
      </Router>
    </ThemeProvider>
  );
}


