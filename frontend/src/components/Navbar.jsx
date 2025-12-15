import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { logout } from "../store/authSlice";
import AuthModal from "./AuthModal";
import { FiShield, FiLogOut } from "react-icons/fi";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-emerald-600 to-violet-600">
        <div className="w-full max-w-none px-8 h-16 flex items-center justify-between text-white">
          
          {/* LOGO — BIANCO BLINDATO */}
          <Link
            to="/"
            className="text-white font-semibold text-lg tracking-tight"
          >
            DocuExtract
          </Link>

          {/* LINKS */}
          <div className="flex items-center gap-8 text-sm">
            <Link to="/" className="opacity-90 hover:opacity-100">
              Home
            </Link>
            {user && (
              <Link to="/documents" className="opacity-90 hover:opacity-100">
                Documents
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="flex items-center gap-1 opacity-90 hover:opacity-100">
                <FiShield size={14} /> Admin
              </Link>
            )}
          </div>

          {/* AUTH */}
          {!user ? (
            <button
              onClick={() => setIsOpen(true)}
              className="px-4 py-2 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100"
            >
              Sign in
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-white text-slate-900 font-bold"
              >
                {user.name[0].toUpperCase()}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow">
                  <button
                    onClick={() => dispatch(logout())}
                    className="w-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 text-slate-800"
                  >
                    <FiLogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;
