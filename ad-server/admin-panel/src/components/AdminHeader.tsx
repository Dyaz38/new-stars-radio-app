import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export type AdminNavKey =
  | "dashboard"
  | "advertisers"
  | "campaigns"
  | "creatives"
  | "song-likes"
  | "schedule"
  | "settings";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  active: AdminNavKey;
}

const navBtn = (
  active: AdminNavKey,
  key: AdminNavKey,
  label: string,
  path: string,
  navigate: (p: string) => void
) => (
  <button
    type="button"
    onClick={() => navigate(path)}
    className={
      active === key
        ? "px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
        : "px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
    }
  >
    {label}
  </button>
);

export function AdminHeader({ title, subtitle, active }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-4 flex-wrap justify-end gap-y-2">
            <nav className="flex flex-wrap gap-1 sm:space-x-2">
              {navBtn(active, "dashboard", "Dashboard", "/dashboard", navigate)}
              {navBtn(active, "advertisers", "Advertisers", "/advertisers", navigate)}
              {navBtn(active, "campaigns", "Campaigns", "/campaigns", navigate)}
              {navBtn(active, "creatives", "Creatives", "/creatives", navigate)}
              {navBtn(active, "song-likes", "Song Likes", "/song-likes", navigate)}
              {navBtn(active, "schedule", "Schedule", "/schedule", navigate)}
              {navBtn(active, "settings", "Settings", "/settings", navigate)}
            </nav>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
