import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { setUser } from "../store/authSlice";

const GoogleSuccess = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const finish = async () => {
      try {
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Google login error:", err);
        navigate("/?error=google", { replace: true });
      }
    };

    finish();
  }, [dispatch, navigate]);

  return <div className="pt-40 text-center text-xl">Logging you in…</div>;
};

export default GoogleSuccess;
