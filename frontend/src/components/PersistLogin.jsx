import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setUser, logout } from "../store/authSlice";
import PageLoader from "./PageLoader";

const PersistLogin = ({ children }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem("accessToken");

    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          dispatch(logout());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <PageLoader message="Checking session…" variant="inline" />
      </div>
    );
  }

  return children;
};

export default PersistLogin;
