import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import { setUser, setToken } from "../store/authSlice";

const PersistLogin = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");

    // ❌ Nessun token → fine, non loggato
    if (!storedToken) {
      setLoading(false);
      return;
    }

    // Se Redux non ha ancora il token, lo rimettiamo
    if (!token) {
      dispatch(setToken(storedToken));
    }

    // 🔥 Recupero dati utente dal backend
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
      } catch (err) {
        console.error("PersistLogin error:", err);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  // ⏳ Loading durante il recupero sessione
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-[#0A2342]"></div>
      </div>
    );
  }

  // 👇 Quando tutto è pronto → mostra i children
  return children;
};

export default PersistLogin;
