import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useDispatch } from "react-redux";
import { resetPasswordSuccess } from "../store/authSlice";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    try {
      await api.post(`/auth/reset-password/${token}`, { password });

      dispatch(resetPasswordSuccess());

      // 👇 TORNA ALLA HOME E APRI IL MODAL LOGIN
      navigate("/", { state: { openLogin: true }, replace: true });

    } catch (err) {
      setError("Reset link invalid or expired.");
    }
  };

  if (!token) {
    return (
      <div className="pt-40 text-center text-red-600 text-xl">
        Invalid password reset link.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">Reset Password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-center">{error}</p>}

          <input
            type="password"
            className="border p-3 rounded w-full"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            className="border p-3 rounded w-full"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-[#0A2342] text-white py-3 rounded hover:bg-[#0a1b35]"
          >
            Reset password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
