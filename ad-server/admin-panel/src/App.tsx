import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AdvertisersPage from "./pages/AdvertisersPage";
import CampaignsPage from "./pages/CampaignsPage";
import CreativesPage from "./pages/CreativesPage";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Component
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/advertisers"
        element={
          <ProtectedRoute>
            <AdvertisersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <ProtectedRoute>
            <CampaignsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/creatives"
        element={
          <ProtectedRoute>
            <CreativesPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

