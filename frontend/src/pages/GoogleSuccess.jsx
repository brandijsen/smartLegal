import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../store/authSlice";
import api from "../api/axios";

const GoogleSuccess = () => {
  const [params] = useSearchParams();
  const token = params.get("token");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const finish = async () => {
      try {
        // salva SOLO access token
        localStorage.setItem("accessToken", token);

        // fetch utente
        const res = await api.get("/auth/me");
        dispatch(setUser(res.data));

        navigate("/", { replace: true });
      } catch (err) {
        console.error("Google login error:", err);
      }
    };

    if (token) finish();
  }, [token, dispatch, navigate]);

  return <div className="pt-40 text-center text-xl">Logging you in…</div>;
};

export default GoogleSuccess;
