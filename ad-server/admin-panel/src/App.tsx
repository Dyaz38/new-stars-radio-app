import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AdvertisersPage from "./pages/AdvertisersPage";
import CampaignsPage from "./pages/CampaignsPage";
import CreativesPage from "./pages/CreativesPage";
import SettingsPage from "./pages/SettingsPage";
import SongLikesPage from "./pages/SongLikesPage";
import SchedulePage from "./pages/SchedulePage";
import EventsPage from "./pages/EventsPage";
import ReportsPage from "./pages/ReportsPage";
import PublicCampaignReportPage from "./pages/PublicCampaignReportPage";
import AdvertiserPortalPage from "./pages/AdvertiserPortalPage";
import PromoterPortalPage from "./pages/PromoterPortalPage";

const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role === "advertiser") {
    return <Navigate to="/portal" replace />;
  }
  if (role === "promoter") {
    return <Navigate to="/portal/events" replace />;
  }

  return <>{children}</>;
};

const AdvertiserRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role !== "advertiser") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PromoterRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role !== "promoter") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Component
function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      <Route
        path="/portal"
        element={
          <AdvertiserRoute>
            <AdvertiserPortalPage />
          </AdvertiserRoute>
        }
      />

      <Route
        path="/portal/events"
        element={
          <PromoterRoute>
            <PromoterPortalPage />
          </PromoterRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <StaffRoute>
            <DashboardPage />
          </StaffRoute>
        }
      />

      <Route
        path="/advertisers"
        element={
          <StaffRoute>
            <AdvertisersPage />
          </StaffRoute>
        }
      />

      <Route
        path="/campaigns"
        element={
          <StaffRoute>
            <CampaignsPage />
          </StaffRoute>
        }
      />

      <Route
        path="/creatives"
        element={
          <StaffRoute>
            <CreativesPage />
          </StaffRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <StaffRoute>
            <SettingsPage />
          </StaffRoute>
        }
      />

      <Route
        path="/song-likes"
        element={
          <StaffRoute>
            <SongLikesPage />
          </StaffRoute>
        }
      />

      <Route
        path="/schedule"
        element={
          <StaffRoute>
            <SchedulePage />
          </StaffRoute>
        }
      />

      <Route path="/report" element={<PublicCampaignReportPage />} />

      <Route
        path="/reports"
        element={
          <StaffRoute>
            <ReportsPage />
          </StaffRoute>
        }
      />

      <Route
        path="/events"
        element={
          <StaffRoute>
            <EventsPage />
          </StaffRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;

