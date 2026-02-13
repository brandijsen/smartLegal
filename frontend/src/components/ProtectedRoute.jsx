import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  const storedToken = localStorage.getItem("accessToken");

  if (!storedToken) {
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
