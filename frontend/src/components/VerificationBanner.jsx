import { useDispatch, useSelector } from "react-redux";
import { sendVerificationEmail } from "../store/authSlice";
import { useEffect, useState } from "react";

const VerificationBanner = () => {
  const dispatch = useDispatch();
  const { user, emailSent } = useSelector((state) => state.auth);

  const [hide, setHide] = useState(false);

  // Nasconde il banner dopo 3 secondi dall'invio
  useEffect(() => {
    if (emailSent) {
      const timer = setTimeout(() => setHide(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [emailSent]);

  if (!user || user.verified === 1 || hide) return null;

  return (
    <div className="bg-yellow-100 border-b border-yellow-300 py-3 text-center text-sm text-yellow-900">
      {!emailSent ? (
        <>
          <span className="font-semibold">Your email is not verified.</span>
          <button
            onClick={() => dispatch(sendVerificationEmail())}
            className="ml-2 underline text-yellow-800 hover:text-yellow-900"
          >
            Verify now
          </button>
        </>
      ) : (
        <span className="text-green-700 font-semibold">Email sent ✔️</span>
      )}
    </div>
  );
};

export default VerificationBanner;
