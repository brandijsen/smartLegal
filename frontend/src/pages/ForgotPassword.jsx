import { useState } from "react";
import api from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-center">Forgot Password</h1>
        <p className="text-gray-600 text-center mb-6">
          Enter your email and we will send you a link to reset your password.
        </p>

        {sent ? (
          <p className="text-green-600 text-center font-semibold">
            If an account exists, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-red-600 text-center">{error}</p>
            )}

            <input
              type="email"
              className="border p-3 rounded w-full"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button
              type="submit"
              className="w-full bg-[#0A2342] text-white py-3 rounded hover:bg-[#0a1b35]"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
