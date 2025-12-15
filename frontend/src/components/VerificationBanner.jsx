import { useDispatch, useSelector } from "react-redux";
import { sendVerificationEmail } from "../store/authSlice";
import { useEffect, useState } from "react";

const VerificationBanner = () => {
  const dispatch = useDispatch();
  const { user, emailSent } = useSelector((state) => state.auth);

  // stato SOLO LOCALE (non persistito)
  const [visible, setVisible] = useState(true);

  // auto-hide dopo invio email
  useEffect(() => {
    if (emailSent) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [emailSent]);

  // condizioni di render
  if (!user || user.verified === 1 || !visible) return null;

  return (
    <div className="fixed top-16 left-0 w-full z-50 bg-yellow-100 border-b border-yellow-300 py-3 text-center text-sm text-yellow-900">
      {!emailSent ? (
        <>
          <span className="font-semibold">
            Your email is not verified.
          </span>
          <button
            onClick={() => dispatch(sendVerificationEmail())}
            className="ml-2 underline font-medium hover:text-yellow-800"
          >
            Verify now
          </button>
        </>
      ) : (
        <span className="font-semibold text-green-700">
          Verification email sent ✔️
        </span>
      )}
    </div>
  );
};

export default VerificationBanner;
