import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import VerificationBanner from "./components/VerificationBanner";
import ResetSuccessBanner from "./components/ResetSuccessBanner";
import PageLoader from "./components/PageLoader";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import PersistLogin from "./components/PersistLogin";
import ErrorBoundary from "./components/ErrorBoundary";

import "./App.css";

// Lazy-loaded route components
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const VerifySuccess = lazy(() => import("./pages/VerifySuccess"));
const VerifyError = lazy(() => import("./pages/VerifyError"));
const GoogleSuccess = lazy(() => import("./pages/GoogleSuccess"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Documents = lazy(() => import("./pages/Documents"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AccountDeleted = lazy(() => import("./pages/AccountDeleted"));
const NotFound = lazy(() => import("./pages/NotFound"));

function App() {
  return (
    <>
      <Navbar />
      <VerificationBanner />
      <ResetSuccessBanner />

      <div className="pt-16 sm:pt-20 lg:pt-24">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader message="Loading…" />}>
            <Routes>

            {/* HOME (public) */}
            <Route
              path="/"
              element={
                <PersistLogin>
                  <Home />
                </PersistLogin>
              }
            />

            {/* DASHBOARD (default after login) */}
            <Route
              path="/dashboard"
              element={
                <PersistLogin>
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </PersistLogin>
              }
            />

            {/* DOCUMENTS */}
            <Route
              path="/documents"
              element={
                <PersistLogin>
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                </PersistLogin>
              }
            />

            <Route
              path="/documents/:id"
              element={
                <PersistLogin>
                  <ProtectedRoute>
                    <DocumentDetail />
                  </ProtectedRoute>
                </PersistLogin>
              }
            />

            {/* SUPPLIERS */}
            <Route
              path="/suppliers"
              element={
                <PersistLogin>
                  <ProtectedRoute>
                    <Suppliers />
                  </ProtectedRoute>
                </PersistLogin>
              }
            />

            {/* PROFILE */}
            <Route
              path="/profile"
              element={
                <PersistLogin>
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </PersistLogin>
              }
            />

            {/* GOOGLE */}
            <Route
              path="/auth/google/success"
              element={
                <PersistLogin>
                  <GoogleSuccess />
                </PersistLogin>
              }
            />

            {/* EMAIL VERIFY */}
            <Route
              path="/verify/success"
              element={
                <PersistLogin>
                  <VerifySuccess />
                </PersistLogin>
              }
            />

            <Route
              path="/verify/error"
              element={
                <PersistLogin>
                  <VerifyError />
                </PersistLogin>
              }
            />

            {/* ACCOUNT DELETED (redirect da link email) */}
            <Route path="/account-deleted" element={<AccountDeleted />} />

            {/* PASSWORD FLOW */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route
              path="/reset-password"
              element={<ResetPassword />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </div>

      <Footer />
    </>
  );
}

export default App;
