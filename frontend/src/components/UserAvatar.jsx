import { useState, useEffect, useRef } from "react";

/**
 * Avatar utente: mostra immagine se presente, altrimenti iniziale nome
 */
const UserAvatar = ({ user, size = 36, className = "" }) => {
  const [src, setSrc] = useState(null);
  const objectUrlRef = useRef(null);

  useEffect(() => {
    if (!user?.avatar_url) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear blob preview when avatar removed
      setSrc(null);
      return () => {
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
      };
    }
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const url = baseURL.replace("/api", "") + "/api/auth/avatar";

    fetch(url, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("");
        return r.blob();
      })
      .then((blob) => {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = URL.createObjectURL(blob);
        setSrc(objectUrlRef.current);
      })
      .catch(() => setSrc(null));

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [user?.avatar_url]);

  const fallback = user?.name ? user.name[0].toUpperCase() : "?";

  const dim = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={user?.name || "Avatar"}
        className={`rounded-full object-cover ${className}`}
        style={dim}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-white text-slate-900 font-bold ${className}`}
      style={{ ...dim, fontSize: Math.max(12, size * 0.45) }}
    >
      {fallback}
    </span>
  );
};

export default UserAvatar;
