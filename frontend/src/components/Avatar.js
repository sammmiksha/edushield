import React from "react";
import { useNavigate } from "react-router-dom";

function Avatar({ user }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/profile")}
      className="
        w-10 h-10 rounded-full cursor-pointer
        bg-gradient-to-br from-indigo-500 to-cyan-500
        flex items-center justify-center text-white font-bold
        hover:scale-110 transition
      "
    >
      {user?.name?.charAt(0)?.toUpperCase()}
    </div>
  );
}

export default Avatar;