/**
 * Centralized loader for API fetches and route transitions.
 * Prevents jarring layout shifts and gives clear feedback while data loads.
 */
const PageLoader = ({ message = "Loading…", variant = "page", className = "" }) => {
  const isPage = variant === "page";

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        isPage ? "min-h-[calc(100vh-8rem)] p-8" : "min-h-[200px]"
      } ${className}`}
    >
      <div
        className="animate-spin h-10 w-10 rounded-full border-4 border-slate-200 border-t-emerald-600"
        aria-hidden="true"
      />
      {message && (
        <p className="text-slate-600 text-sm font-medium">{message}</p>
      )}
    </div>
  );
};

export default PageLoader;
