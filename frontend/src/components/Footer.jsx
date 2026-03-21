import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-emerald-600 to-violet-600 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 sm:py-6 text-white">
        <span className="text-sm opacity-90">© {new Date().getFullYear()} InvParser</span>
        <Link
          to="/privacy"
          className="text-sm opacity-90 hover:opacity-100 transition-opacity"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
