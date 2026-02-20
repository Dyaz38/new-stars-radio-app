import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  start_date: string;
  end_date: string;
  priority: number;
  impression_budget: number;
  impressions_served: number;
  target_countries: string[];
  target_cities: string[];
  target_states: string[];
}

interface CampaignForm {
  advertiser_id: string;
  name: string;
  status?: string;
  start_date: string;
  end_date: string;
  priority: number;
  impression_budget: number;
  target_countries?: string[];
  target_cities?: string[];
  target_states?: string[];
}

interface Advertiser {
  id: string;
  name: string;
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get<Campaign[]>("/campaigns");
      return response.data;
    },
  });

  const { data: advertisers } = useQuery({
    queryKey: ["advertisers"],
    queryFn: async () => {
      const response = await api.get<Advertiser[]>("/advertisers");
      return response.data;
    },
  });

  const [createError, setCreateError] = useState("");
  
  const createMutation = useMutation({
    mutationFn: async (data: CampaignForm) => {
      return await api.post("/campaigns", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setShowCreateModal(false);
      setCreateError("");
    },
    onError: (error: any) => {
      setCreateError(error.response?.data?.detail || "Failed to create campaign");
    },
  });

  const [updateError, setUpdateError] = useState("");
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CampaignForm }) => {
      return await api.put(`/campaigns/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditingCampaign(null);
      setUpdateError("");
    },
    onError: (error: any) => {
      setUpdateError(error.response?.data?.detail || "Failed to update campaign");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "pause" | "resume" | "activate" }) => {
      const statusMap = { activate: "active", pause: "paused", resume: "active" };
      return await api.put(`/campaigns/${id}`, { status: statusMap[action] });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
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
                  className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-600">Manage advertising campaigns</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Create Campaign
          </button>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns && campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <span
                      className={`mt-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        campaign.status === "active"
                          ? "bg-green-100 text-green-800"
                          : campaign.status === "paused"
                          ? "bg-yellow-100 text-yellow-800"
                          : campaign.status === "draft"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {campaign.status === "draft" ? (
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: campaign.id, action: "activate" })
                        }
                        className="text-green-600 hover:text-green-800"
                        title="Activate"
                      >
                        ▶️
                      </button>
                    ) : campaign.status === "active" ? (
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: campaign.id, action: "pause" })
                        }
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Pause"
                      >
                        ⏸️
                      </button>
                    ) : campaign.status === "paused" ? (
                      <button
                        onClick={() =>
                          toggleStatusMutation.mutate({ id: campaign.id, action: "resume" })
                        }
                        className="text-green-600 hover:text-green-800"
                        title="Resume"
                      >
                        ▶️
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Priority</p>
                    <p className="font-medium text-gray-900">Level {campaign.priority}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Impressions</p>
                    <p className="font-medium text-gray-900">
                      {campaign.impressions_served.toLocaleString()} /{" "}
                      {campaign.impression_budget.toLocaleString()}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
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
                  </div>
                  <div>
                    <p className="text-gray-500">Date Range</p>
                    <p className="font-medium text-gray-900">
                      {new Date(campaign.start_date).toLocaleDateString()} -{" "}
                      {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  {(campaign.target_countries?.length > 0 || campaign.target_cities?.length > 0 || campaign.target_states?.length > 0) && (
                    <div>
                      <p className="text-gray-500">Targeting</p>
                      <p className="font-medium text-gray-900">
                        {campaign.target_countries?.length > 0 &&
                          `${campaign.target_countries.length} countries`}
                        {campaign.target_countries?.length > 0 &&
                          (campaign.target_cities?.length > 0 || campaign.target_states?.length > 0) &&
                          ", "}
                        {campaign.target_cities?.length > 0 &&
                          `${campaign.target_cities.length} cities`}
                        {campaign.target_cities?.length > 0 &&
                          campaign.target_states?.length > 0 &&
                          ", "}
                        {campaign.target_states?.length > 0 &&
                          `${campaign.target_states.length} states`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-2">
                  <button
                    onClick={() => setEditingCampaign(campaign)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this campaign?")) {
                        deleteMutation.mutate(campaign.id);
                      }
                    }}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              No campaigns yet. Click "Create Campaign" to get started!
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CampaignModal
          advertisers={advertisers || []}
          onClose={() => {
            setShowCreateModal(false);
            setCreateError("");
          }}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          error={createError}
        />
      )}

      {/* Edit Modal */}
      {editingCampaign && (
        <CampaignModal
          campaign={editingCampaign}
          advertisers={advertisers || []}
          onClose={() => {
            setEditingCampaign(null);
            setUpdateError("");
          }}
          onSubmit={(data) =>
            updateMutation.mutate({ id: editingCampaign.id, data })
          }
          isLoading={updateMutation.isPending}
          error={updateError}
        />
      )}
    </div>
  );
}

// Campaign Modal Component
function CampaignModal({
  campaign,
  advertisers,
  onClose,
  onSubmit,
  isLoading,
  error: externalError = "",
}: {
  campaign?: Campaign;
  advertisers: Advertiser[];
  onClose: () => void;
  onSubmit: (data: CampaignForm) => void;
  isLoading: boolean;
  error?: string;
}) {
  const [formData, setFormData] = useState<CampaignForm>({
    advertiser_id: campaign?.advertiser_id || "",
    name: campaign?.name || "",
    status: campaign?.status || "draft",
    start_date: campaign?.start_date?.split("T")[0] || "",
    end_date: campaign?.end_date?.split("T")[0] || "",
    priority: campaign?.priority || 1,
    impression_budget: campaign?.impression_budget || 1000,
    target_countries: campaign?.target_countries || [],
    target_cities: campaign?.target_cities || [],
    target_states: campaign?.target_states || [],
  });

  const [countriesInput, setCountriesInput] = useState(
    campaign?.target_countries?.join(", ") || ""
  );
  const [citiesInput, setCitiesInput] = useState(
    campaign?.target_cities?.join(", ") || ""
  );
  const [statesInput, setStatesInput] = useState(
    campaign?.target_states?.join(", ") || ""
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Convert dates to ISO datetime format
    const submitData: Record<string, unknown> = {
      ...formData,
      start_date: formData.start_date + "T00:00:00",
      end_date: formData.end_date + "T23:59:59",
      target_countries: countriesInput ? countriesInput.split(",").map((c) => c.trim().toUpperCase()).filter(c => c) : [],
      target_cities: citiesInput ? citiesInput.split(",").map((c) => c.trim()).filter(c => c) : [],
      target_states: statesInput ? statesInput.split(",").map((s) => s.trim()).filter(s => s) : [],
    };
    // Only include status when editing (create always uses draft)
    if (campaign && formData.status) {
      submitData.status = formData.status;
    } else if (!campaign) {
      delete submitData.status;
    }
    
    try {
      onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || "Failed to save campaign");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold mb-6">
          {campaign ? "Edit Campaign" : "Create New Campaign"}
        </h2>
        
        {(error || externalError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error || externalError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advertiser *
            </label>
            <select
              required
              value={formData.advertiser_id}
              onChange={(e) =>
                setFormData({ ...formData, advertiser_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select advertiser...</option>
              {advertisers.map((adv) => (
                <option key={adv.id} value={adv.id}>
                  {adv.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {campaign && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status || "draft"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Set to Active to start serving ads.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority (1-5) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={5}
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Impression Budget *
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.impression_budget}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    impression_budget: parseInt(e.target.value),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Countries (comma-separated, 2-letter codes)
            </label>
            <input
              type="text"
              value={countriesInput}
              onChange={(e) => setCountriesInput(e.target.value)}
              placeholder="e.g., NA, ZA, US (Namibia, South Africa, USA)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use ISO 3166-1 alpha-2 codes (e.g., NA for Namibia, US for United States)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Cities (comma-separated)
            </label>
            <input
              type="text"
              value={citiesInput}
              onChange={(e) => setCitiesInput(e.target.value)}
              placeholder="e.g., Windhoek, Cape Town, Johannesburg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target States (comma-separated)
            </label>
            <input
              type="text"
              value={statesInput}
              onChange={(e) => setStatesInput(e.target.value)}
              placeholder="e.g., Khomas, Erongo, Otjozondjupa"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

