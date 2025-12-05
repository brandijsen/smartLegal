import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser, setToken } from "../store/authSlice";
import api from "../api/axios";

const GoogleSuccess = () => {
  const [params] = useSearchParams();
  const token = params.get("token");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const finish = async () => {
      localStorage.setItem("accessToken", token);
      dispatch(setToken(token));

      const res = await api.get("/auth/me");
      dispatch(setUser(res.data));

      navigate("/", { replace: true });
    };

    if (token) finish();
  }, [token]);

  return <div className="pt-40 text-center text-xl">Logging you in…</div>;
};

export default GoogleSuccess;
