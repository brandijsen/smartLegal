import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { setUser, logout } from "../store/authSlice";
import UserAvatar from "../components/UserAvatar";
import { FiUser, FiLock, FiCamera, FiDownload, FiTrash2 } from "react-icons/fi";

const Profile = () => {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteEmailSent, setDeleteEmailSent] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);
    setProfileLoading(true);
    try {
      const res = await api.patch("/auth/profile", { name: name.trim(), email: email.trim() });
      dispatch(setUser(res.data));
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Update failed");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Solo JPEG, PNG e WebP (max 2MB)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Immagine troppo grande (max 2MB)");
      return;
    }
    setAvatarError("");
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await api.post("/auth/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      dispatch(setUser(res.data));
    } catch (err) {
      setAvatarError(err?.response?.data?.message || "Upload failed");
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await api.get("/auth/export-data", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invparser-data-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleRequestDelete = async (e) => {
    e.preventDefault();
    setDeleteError("");
    setDeleteLoading(true);
    try {
      await api.post("/auth/request-delete");
      setDeleteEmailSent(true);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Richiesta non inviata");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err?.response?.data?.message || "Password change failed");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    navigate("/", { state: { openLogin: true } });
    return null;
  }

  return (
    <div className="pt-20 sm:pt-24 pb-16 sm:pb-24 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2 mb-2">
          <FiUser className="text-emerald-600" />
          Profile
        </h1>
        <p className="text-slate-600 mb-8">Manage your account settings.</p>

        {/* Avatar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Profile picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <UserAvatar user={user} size={96} className="ring-2 ring-slate-200" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 shadow"
              >
                <FiCamera size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600">
                JPEG, PNG o WebP. Dimensione massima 2MB.
              </p>
              {avatarError && <p className="text-red-600 text-sm mt-1">{avatarError}</p>}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Personal info</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && (
              <p className="text-red-600 text-sm">{profileError}</p>
            )}
            {profileSuccess && (
              <p className="text-emerald-600 text-sm">Profile updated successfully.</p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={profileLoading}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {profileLoading ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>

        {/* Password form */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FiLock className="text-slate-500" />
            Change password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <p className="text-red-600 text-sm">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-emerald-600 text-sm">Password updated successfully.</p>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {passwordLoading ? "Updating…" : "Update password"}
            </button>
          </form>
          <p className="text-sm text-slate-500 mt-3">
            If you signed up with Google and want to set a password, use the Forgot password flow.
          </p>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Data & Privacy</h2>
          <p className="text-sm text-slate-600 mb-4">
            Export your data or permanently delete your account (GDPR rights).
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportLoading}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-800 font-medium hover:bg-slate-200 disabled:opacity-50 flex items-center gap-2"
            >
              <FiDownload size={16} />
              {exportLoading ? "Exporting…" : "Export my data"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-red-50 text-red-700 font-medium hover:bg-red-100 flex items-center gap-2"
            >
              <FiTrash2 size={16} />
              Delete account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 my-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Elimina account</h3>
            {deleteEmailSent ? (
              <>
                <p className="text-slate-600 text-sm mb-4">
                  Ti abbiamo inviato un'email con un link per confermare l'eliminazione. Controlla la casella di posta (anche spam). Il link scade tra 24 ore.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteEmailSent(false);
                    setDeleteError("");
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 text-white font-medium hover:bg-slate-800"
                >
                  Chiudi
                </button>
              </>
            ) : (
              <>
                <p className="text-slate-600 text-sm mb-4">
                  L'account e tutti i dati (documenti, fornitori, tag) saranno eliminati in modo permanente. Ti invieremo un'email con un link per confermare. L'azione è irreversibile.
                </p>
                <form onSubmit={handleRequestDelete} className="space-y-4">
                  {deleteError && <p className="text-red-600 text-sm">{deleteError}</p>}
                  <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setDeleteError("");
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={deleteLoading}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteLoading ? "Invio…" : "Invia link via email"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
