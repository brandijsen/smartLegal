import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setUser } from "../store/authSlice";
import PageLoader from "../components/PageLoader";

const VerifySuccess = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const finishLogin = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
      } catch (err) {
        console.error("Verification session error:", err);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };

    finishLogin();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <PageLoader message="Verifying your account…" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-10 rounded-lg shadow-lg text-center max-w-md">
          <p className="text-red-600 font-medium">Could not start your session.</p>
          <p className="text-sm text-slate-600 mt-2">Try signing in from the home page.</p>
          <Link
            to="/"
            className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Home
          </Link>
        </div>
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
