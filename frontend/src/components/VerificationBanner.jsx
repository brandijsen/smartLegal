import { useDispatch, useSelector } from "react-redux";
import { sendVerificationEmail } from "../store/authSlice";
import { useEffect, useState, useCallback } from "react";
import { FiMail, FiCheckCircle, FiX } from "react-icons/fi";

const dismissStorageKey = (userId) =>
  `invparser:dismissVerifyBanner:${userId}`;

function isEmailVerified(user) {
  if (!user) return false;
  const v = user.verified;
  return v === 1 || v === true || v === "1" || Number(v) === 1;
}

const VerificationBanner = () => {
  const dispatch = useDispatch();
  const { user, emailSent } = useSelector((state) => state.auth);

  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const readDismissed = useCallback((userId) => {
    if (userId == null) return false;
    try {
      return localStorage.getItem(dismissStorageKey(userId)) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setDismissed(false);
      return;
    }
    if (isEmailVerified(user)) {
      try {
        localStorage.removeItem(dismissStorageKey(user.id));
      } catch {
        /* ignore */
      }
      setDismissed(false);
      return;
    }
    setDismissed(readDismissed(user.id));
  }, [user?.id, user?.verified, readDismissed]);

  useEffect(() => {
    if (emailSent) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [emailSent]);

  const handleDismiss = () => {
    if (user?.id) {
      try {
        localStorage.setItem(dismissStorageKey(user.id), "1");
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  };

  if (!user || isEmailVerified(user) || !visible || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed top-14 sm:top-16 left-0 right-0 z-40 flex justify-center px-3 sm:px-4 pt-2 sm:pt-3 pointer-events-none"
    >
      <div
        className={`pointer-events-auto relative flex w-full max-w-2xl flex-col gap-3 rounded-xl border py-3 pl-4 pr-11 shadow-md shadow-slate-900/6 sm:flex-row sm:items-center sm:justify-between sm:pr-12 ${
          emailSent
            ? "border-emerald-200 bg-emerald-50/90"
            : "border-slate-200 bg-white"
        }`}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Dismiss"
        >
          <FiX className="h-5 w-5" strokeWidth={2} />
        </button>

        {!emailSent ? (
          <>
            <div className="flex min-w-0 items-start gap-3 text-left">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                aria-hidden
              >
                <FiMail className="h-5 w-5" />
              </span>
              <p className="pt-1 text-sm leading-snug text-slate-700">
                <span className="font-semibold text-slate-900">
                  Your email is not verified.
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(sendVerificationEmail())}
              className="shrink-0 self-start rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:self-center"
            >
              Verify now
            </button>
          </>
        ) : (
          <div className="flex w-full items-center justify-center gap-2.5 text-emerald-900 sm:justify-start">
            <FiCheckCircle className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <span className="text-sm font-semibold">Verification email sent</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationBanner;
