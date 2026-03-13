import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-white py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 sm:py-6">
        <span className="text-slate-600 text-sm">© {new Date().getFullYear()} InvParser</span>
        <Link
          to="/privacy"
          className="text-slate-600 hover:text-emerald-600 text-sm transition-colors"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
