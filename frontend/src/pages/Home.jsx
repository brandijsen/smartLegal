import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

import AuthModal from "../components/AuthModal";

const Home = () => {
  const location = useLocation();

  const [openAuth, setOpenAuth] = useState(false);

  useEffect(() => {
    if (location.state?.openLogin) {
      setOpenAuth(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return (
    <>
      {/* SOLO MODAL */}
      <AuthModal isOpen={openAuth} onClose={() => setOpenAuth(false)} />

      <section className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-5xl mb-6">
          Clear, competent and transparent legal assistance.
        </h1>

        <p className="text-lg text-[#4A4F57] max-w-2xl">
          Rossi Law Firm — civil, criminal and commercial legal services.
        </p>

        <button
          onClick={() => setOpenAuth(true)}
          className="mt-6 px-6 py-3 bg-[#0A2342] text-white rounded"
        >
          Login / Register
        </button>
      </section>
    </>
  );
};

export default Home;
