import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setUser } from "../store/authSlice";

const VerifySuccess = () => {
  const [params] = useSearchParams();
  const token = params.get("token");

  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const finishLogin = async () => {
      try {
        // reset user precedente
        localStorage.removeItem("user");

        // salva SOLO access token
        localStorage.setItem("accessToken", token);

        // fetch utente aggiornato
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));

        setLoading(false);
      } catch (err) {
        console.error("Verification login error:", err);
        setLoading(false);
      }
    };

    if (token) finishLogin();
  }, [token, dispatch]);

  if (loading) {
    return (
      <div className="pt-40 text-center text-xl">
        Verifying your account…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md">
        <h1 className="text-3xl font-bold text-green-600">
          Email verified successfully!
        </h1>

        <p className="mt-4 text-gray-700">
          Your account is now fully active.
        </p>

        <Link
          to="/"
          className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default VerifySuccess;
