import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import VerificationBanner from "./components/VerificationBanner";
import ResetSuccessBanner from "./components/ResetSuccessBanner";

import Home from "./pages/Home";
import VerifySuccess from "./pages/VerifySuccess";
import VerifyError from "./pages/VerifyError";
import GoogleSuccess from "./pages/GoogleSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DummyPrivatePage from "./pages/DummyPrivatePage";
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";

import ProtectedRoute from "./components/ProtectedRoute";
import PersistLogin from "./components/PersistLogin";

import "./App.css";

function App() {
  return (
    <>
      <Navbar />
      <VerificationBanner />
      <ResetSuccessBanner />

      <div className="pt-24">
        <Routes>

          {/* HOME */}
          <Route
            path="/"
            element={
              <PersistLogin>
                <Home />
              </PersistLogin>
            }
          />

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

          {/* PASSWORD FLOW */}
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* PRIVATE AREA */}
          <Route
            path="/private-test"
            element={
              <PersistLogin>
                <ProtectedRoute>
                  <DummyPrivatePage />
                </ProtectedRoute>
              </PersistLogin>
            }
          />

        </Routes>
      </div>
    </>
  );
}

export default App;
