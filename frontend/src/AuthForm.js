import React, { useState } from "react";
import { Link } from "react-router-dom";

function AuthForm({ mode, onSuccess }) {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [role, setRole] = useState("student");
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

      setMessage(
        `Success! You are ${
          mode === "signup" ? "registered" : "logged in"
        }.`
      );

      onSuccess?.(data.access_token);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div className="w-full flex justify-center">
      {/* PRODUCT CARD */}
      <div className="
        w-full max-w-md
        bg-white/80 backdrop-blur-xl
        p-8 rounded-2xl
        border border-white/40
        shadow-[0_20px_60px_rgba(0,0,0,0.15)]
        transition-all duration-300
        hover:shadow-[0_25px_80px_rgba(0,0,0,0.2)]
      ">

        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 tracking-tight">
          {mode === "signup" ? "Create Account" : "Welcome Back"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {mode === "signup" && (
            <Input label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputStyle}
              />
            </Input>
          )}

          <Input label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputStyle}
            />
          </Input>

          <Input label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              required
              className={inputStyle}
            />
          </Input>

          {mode === "signup" && (
            <Input label="Role">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={inputStyle}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="others">Others</option>
              </select>
            </Input>
          )}

          {/* PRODUCT BUTTON */}
          <button
            type="submit"
            className="
              w-full
              bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500
              text-white py-2.5 rounded-lg
              shadow-md hover:shadow-xl
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-300
              font-medium tracking-wide
            "
          >
            {mode === "signup" ? "Sign Up 🚀" : "Login 🔑"}
          </button>

          {/* Forgot Password ONLY on login */}
          {mode === "login" && (
            <Link
              to="/forgot-password"
              className="text-right text-sm text-blue-600 hover:text-blue-800 transition"
            >
              Forgot password?
            </Link>
          )}

        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}

const inputStyle = `
  w-full px-4 py-2.5
  border border-gray-300
  rounded-lg
  bg-white/70
  focus:outline-none
  focus:ring-2 focus:ring-indigo-400
  focus:border-transparent
  transition-all
`;

function Input({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}

export default AuthForm;