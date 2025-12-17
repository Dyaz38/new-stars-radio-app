import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import api from "../lib/api";

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  impressions_served: number;
  impression_budget: number;
  clicks: number;
  ctr: number;
}

interface DashboardStats {
  total_campaigns: number;
  active_campaigns: number;
  total_impressions: number;
  total_clicks: number;
  overall_ctr: number;
  top_campaigns: CampaignStats[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<DashboardStats>("/reports/campaigns/stats");
      return response.data;
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ad Manager Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate("/advertisers")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Advertisers
                </button>
                <button
                  onClick={() => navigate("/campaigns")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Campaigns
                </button>
                <button
                  onClick={() => navigate("/creatives")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Creatives
                </button>
              </nav>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Campaigns"
            value={stats?.total_campaigns || 0}
            icon="📊"
            color="blue"
          />
          <StatCard
            title="Active Campaigns"
            value={stats?.active_campaigns || 0}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Total Impressions"
            value={(stats?.total_impressions || 0).toLocaleString()}
            icon="👁️"
            color="purple"
          />
          <StatCard
            title="Total Clicks"
            value={(stats?.total_clicks || 0).toLocaleString()}
            subtitle={`CTR: ${(stats?.overall_ctr || 0).toFixed(2)}%`}
            icon="🖱️"
            color="orange"
          />
        </div>

        {/* Top Campaigns */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Performing Campaigns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget Progress
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CTR
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats?.top_campaigns && stats.top_campaigns.length > 0 ? (
                  stats.top_campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            campaign.status === "active"
                              ? "bg-green-100 text-green-800"
                              : campaign.status === "paused"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.impressions_served.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (campaign.impressions_served / campaign.impression_budget) * 100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {((campaign.impressions_served / campaign.impression_budget) * 100).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.clicks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {campaign.ctr.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No campaigns yet. Create your first campaign to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            title="Create Campaign"
            description="Start a new advertising campaign"
            icon="➕"
            onClick={() => navigate("/campaigns")}
          />
          <QuickActionCard
            title="Manage Advertisers"
            description="View and edit advertiser information"
            icon="👥"
            onClick={() => navigate("/advertisers")}
          />
          <QuickActionCard
            title="Upload Creative"
            description="Add new ad creatives to campaigns"
            icon="🖼️"
            onClick={() => navigate("/creatives")}
          />
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <span className={`text-2xl ${colorClasses[color]} w-10 h-10 rounded-lg flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-6 text-left hover:shadow-md transition-shadow"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

