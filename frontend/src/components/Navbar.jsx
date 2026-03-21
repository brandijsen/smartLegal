import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import AuthModal from "./AuthModal";
import { FiLogOut, FiUser, FiMenu, FiX } from "react-icons/fi";
import UserAvatar from "./UserAvatar";
import api from "../api/axios";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignora errore (offline, ecc.): comunque svuotiamo lo stato */
    }
    dispatch(logout());
    navigate("/");
    setProfileOpen(false);
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-emerald-600 to-violet-600">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between text-white">
          
          <Link to="/" className="text-white font-semibold text-base sm:text-lg tracking-tight shrink-0">
            InvParser
          </Link>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
            <Link to="/" className="opacity-90 hover:opacity-100">
              Home
            </Link>
            {user && (
              <>
                <Link to="/dashboard" className="opacity-90 hover:opacity-100">
                  Dashboard
                </Link>
                <Link to="/documents" className="opacity-90 hover:opacity-100">
                  Invoices
                </Link>
                <Link to="/suppliers" className="opacity-90 hover:opacity-100">
                  Suppliers
                </Link>
              </>
            )}
          </div>

          {/* DESKTOP AUTH */}
          <div className="hidden md:flex items-center gap-3 mr-2 sm:mr-4">
            {!user ? (
              <button
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 rounded-md bg-white text-slate-900 font-medium hover:bg-slate-100 text-sm"
              >
                Sign in
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="ring-2 ring-white/50 rounded-full overflow-hidden"
                >
                  <UserAvatar user={user} size={36} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg overflow-hidden">
                    <Link
                      to="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="block w-full px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-100 text-slate-800 rounded-t-xl"
                    >
                      <FiUser size={14} /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-slate-100 text-slate-800 text-left rounded-b-xl"
                    >
                      <FiLogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MOBILE: Sign in or Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <button
                onClick={() => setIsOpen(true)}
                className="px-3 py-1.5 rounded-md bg-white text-slate-900 font-medium text-sm"
              >
                Sign in
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-white hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-emerald-700/95">
            <div className="px-4 py-3 flex flex-col gap-1">
              <Link to="/" onClick={closeMobileMenu} className="py-3 text-white opacity-90 hover:opacity-100">
                Home
              </Link>
              {user && (
                <>
                  <Link to="/dashboard" onClick={closeMobileMenu} className="py-3 text-white opacity-90 hover:opacity-100">
                    Dashboard
                  </Link>
                  <Link to="/documents" onClick={closeMobileMenu} className="py-3 text-white opacity-90 hover:opacity-100">
                    Invoices
                  </Link>
                  <Link to="/suppliers" onClick={closeMobileMenu} className="py-3 text-white opacity-90 hover:opacity-100">
                    Suppliers
                  </Link>
                  <Link to="/profile" onClick={closeMobileMenu} className="py-3 text-white opacity-90 hover:opacity-100 flex items-center gap-2">
                    <FiUser size={16} /> Profile
                  </Link>
                  <button onClick={handleLogout} className="py-3 text-left text-white opacity-90 hover:opacity-100 flex items-center gap-2">
                    <FiLogOut size={16} /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default Navbar;
