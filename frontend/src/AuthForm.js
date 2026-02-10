import React, { useState } from "react";
import { Link } from "react-router-dom";

function AuthForm({ mode, onSuccess }) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [role, setRole]       = useState("student");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url =
      mode === "signup"
        ? "http://127.0.0.1:8000/signup"
        : "http://127.0.0.1:8000/login";
    const payload =
      mode === "signup"
        ? { name, email, password, role }
        : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error");
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      setMessage(`Success! You are ${mode === "signup" ? "registered" : "logged in"}.`);
      onSuccess?.(data.access_token);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">

<div className="w-full max-w-4xl bg-white p-10 rounded-2xl shadow-2xl">

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {mode === "signup" ? "Sign Up" : "Login"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div >
                <label className="block text-sm font-medium w-full  text-gray-700 mb-1">
                  Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-200"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-200"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-200"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="others">others</option>              </select>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 rounded-md hover:scale-105 hover:shadow-lg transition-all duration-300"
          >
            {mode === "signup" ? "Sign Up 📝" : "Login 🔑"}
          </button>

          <Link
            to="/forgot-password"
            className="block text-right text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm font-medium text-gray-700">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthForm;
