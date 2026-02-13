import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // 🔑 necessario per refresh token cookie
});

/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
| Aggiunge sempre l’access token (se presente)
*/
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token && !config._retry) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
| Se riceviamo 401 → tentiamo refresh token UNA SOLA VOLTA
*/
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // ❌ Non è 401 → errore normale
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // ❌ Evita loop infinito
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // ❌ Non tentare refresh su refresh
    if (originalRequest.url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // 🔄 REFRESH TOKEN (cookie only)
      const res = await api.post("/auth/refresh");

      const newAccessToken = res.data.accessToken;

      // 💾 salva nuovo token
      localStorage.setItem("accessToken", newAccessToken);

      // 🔁 ripeti request originale
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);

    } catch (refreshError) {
      // ❌ refresh fallito → logout forzato
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");

      return Promise.reject(refreshError);
    }
  }
);

export default api;
