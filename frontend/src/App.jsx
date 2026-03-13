import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import VerificationBanner from "./components/VerificationBanner";
import ResetSuccessBanner from "./components/ResetSuccessBanner";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import VerifySuccess from "./pages/VerifySuccess";
import VerifyError from "./pages/VerifyError";
import GoogleSuccess from "./pages/GoogleSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
import Suppliers from "./pages/Suppliers";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AccountDeleted from "./pages/AccountDeleted";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import PersistLogin from "./components/PersistLogin";

import "./App.css";

function App() {
  return (
    <>
      <Navbar />
      <VerificationBanner />
      <ResetSuccessBanner />

      <div className="pt-16 sm:pt-20 lg:pt-24">
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

        </Routes>
      </div>

      <Footer />
    </>
  );
}

export default App;
