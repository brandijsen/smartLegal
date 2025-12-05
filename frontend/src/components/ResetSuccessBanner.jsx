import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { clearResetSuccess } from "../store/authSlice";

const ResetSuccessBanner = () => {
  const dispatch = useDispatch();
  const resetSuccess = useSelector((state) => state.auth.resetSuccess);

  useEffect(() => {
    if (resetSuccess) {
      const timer = setTimeout(() => {
        dispatch(clearResetSuccess());
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [resetSuccess, dispatch]);

  if (!resetSuccess) return null;

  return (
    <div className="bg-green-100 border-b border-green-300 py-3 text-center text-green-900 text-sm">
      <span className="font-semibold">Password updated successfully ✔️</span>
    </div>
  );
};

export default ResetSuccessBanner;
