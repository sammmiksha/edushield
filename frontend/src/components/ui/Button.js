import React from "react";

export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
}) {
  const base =
    "px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center";

  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]",
    secondary:
      "bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700",
    ghost:
      "text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10",
    danger:
      "text-red-500 hover:bg-red-500 hover:text-white",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}