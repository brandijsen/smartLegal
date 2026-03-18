import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="mt-4 text-slate-600 text-lg">Page not found</p>
      <Link
        to="/"
        className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
      >
        Go to Home
      </Link>
    </div>
  );
};

export default NotFound;
