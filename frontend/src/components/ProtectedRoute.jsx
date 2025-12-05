// src/components/ProtectedRoute.jsx
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  const location = useLocation();

  // ❌ Non loggato → torna alla home e apri il modal login
  if (!token) {
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
