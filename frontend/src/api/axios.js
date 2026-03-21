import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

const isBackendDownError = (err) => {
  if (!err) return false;
  if (!err.response) {
    const code = err.code;
    return (
      code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      code === "ETIMEDOUT" ||
      code === "ERR_CONNECTION_REFUSED"
    );
  }
  const status = err.response?.status;
  return status === 502 || status === 503 || status === 504;
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (isBackendDownError(error)) {
      window.dispatchEvent(new CustomEvent("backend-down"));
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await api.post("/auth/refresh");
      delete originalRequest.headers.Authorization;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("user");
      return Promise.reject(refreshError);
    }
  }
);

export default api;
