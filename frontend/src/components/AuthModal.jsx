import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, registerUser } from "../store/authSlice";

const AuthModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  if (!isOpen) return null;

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const doLogin = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email: form.email, password: form.password }))
      .unwrap()
      .then(() => onClose());
  };

  const doRegister = (e) => {
    e.preventDefault();
    dispatch(registerUser(form))
      .unwrap()
      .then(() => onClose());
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-sm p-8 rounded-lg relative">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        {/* TITLE */}
        <h2 className="text-3xl text-center mb-6 font-semibold">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h2>

        {/* ERROR MESSAGE */}
        {error && <p className="text-red-600 text-center mb-4">{error}</p>}

        {/* LOGIN FORM */}
        {mode === "login" ? (
          <form onSubmit={doLogin} className="space-y-4">
            <input
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={change}
              className="w-full border p-3 rounded"
            />

            <input
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={change}
              className="w-full border p-3 rounded"
            />

            <button className="w-full bg-[#0A2342] text-white p-3 rounded font-semibold">
              {loading ? "Loading..." : "Sign In"}
            </button>

            {/* 🔥 FORGOT PASSWORD */}
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.href = "/forgot-password";
                }}
                className="text-blue-700 underline text-sm hover:text-blue-900"
              >
                Forgot your password?
              </button>
            </div>

            <p className="text-center text-sm pt-2">
              Not registered?{" "}
              <button
                className="text-blue-700 font-medium"
                type="button"
                onClick={() => setMode("register")}
              >
                Create an account
              </button>
            </p>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={doRegister} className="space-y-4">
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={change}
              className="w-full border p-3 rounded"
            />

            <input
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={change}
              className="w-full border p-3 rounded"
            />

            <input
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={change}
              className="w-full border p-3 rounded"
            />

            <button className="w-full bg-[#0A2342] text-white p-3 rounded font-semibold">
              {loading ? "Loading..." : "Register"}
            </button>

            <p className="text-center text-sm pt-2">
              Already have an account?{" "}
              <button
                className="text-blue-700 font-medium"
                type="button"
                onClick={() => setMode("login")}
              >
                Sign in here
              </button>
            </p>
          </form>
        )}

        {/* DIVIDER */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t"></div>
          <span className="mx-3 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t"></div>
        </div>

        {/* GOOGLE LOGIN BUTTON */}
        <button
          type="button"
          onClick={() => (window.location.href = "http://localhost:5000/api/auth/google")}
          className="w-full border border-gray-300 p-3 rounded flex items-center justify-center gap-3 hover:bg-gray-50 transition"
        >
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            className="w-5 h-5"
          />
          <span className="font-medium text-gray-700">Sign in with Google</span>
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
