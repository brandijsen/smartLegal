import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setUser } from "../store/authSlice";

const PersistLogin = ({ children }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");

    // ❌ Nessun token → utente non loggato
    if (!accessToken) {
      setLoading(false);
      return;
    }

    // 🔥 Recuperiamo i dati utente
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
      } catch (err) {
        console.error("PersistLogin error:", err);

        // Token non valido → pulizia
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dispatch]);

  // ⏳ Loading mentre recuperiamo la sessione
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-gray-300 border-t-[#0A2342]"></div>
      </div>
    );
  }

  return children;
};

export default PersistLogin;
