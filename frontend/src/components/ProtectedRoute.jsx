import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);

  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{ openLogin: true, from: location.pathname }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
