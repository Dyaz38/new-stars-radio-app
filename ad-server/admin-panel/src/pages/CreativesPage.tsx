import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface Creative {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string;
  image_width: number;
  image_height: number;
  click_url: string;
  alt_text: string;
  status: "active" | "inactive";
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

export default function CreativesPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);

  const { data: creatives, isLoading, error: creativesError } = useQuery({
    queryKey: ["creatives"],
    queryFn: async () => {
      const response = await api.get<Creative[]>("/creatives");
      return response.data;
    },
    retry: 1,
  });

  const { data: campaigns, error: campaignsError } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get<Campaign[]>("/campaigns");
      return response.data;
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/creatives/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading creatives...</p>
        </div>
      </div>
    );
  }

  if (creativesError || campaignsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-4">Error loading data</div>
          <p className="text-gray-600 mb-4">
            {(creativesError as any)?.message || (campaignsError as any)?.message || "Failed to load creatives"}
          </p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["creatives"] });
              queryClient.invalidateQueries({ queryKey: ["campaigns"] });
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
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
              <h1 className="text-2xl font-bold text-gray-900">Ad Creatives</h1>
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
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Campaigns
                </button>
                <button
                  onClick={() => navigate("/creatives")}
                  className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
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
          <p className="text-gray-600">Manage ad creatives and images</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Upload Creative
          </button>
        </div>

        {/* Creatives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatives && creatives.length > 0 ? (
            creatives.map((creative) => (
              <div key={creative.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="relative pb-[56.25%] bg-gray-100">
                  <img
                    src={creative.image_url}
                    alt={creative.alt_text}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{creative.name}</h3>
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        creative.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {creative.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <strong>Size:</strong> {creative.image_width} × {creative.image_height}
                    </p>
                    <p className="truncate">
                      <strong>Click URL:</strong>{" "}
                      <a
                        href={creative.click_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {creative.click_url}
                      </a>
                    </p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => setEditingCreative(creative)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this creative?")) {
                          deleteMutation.mutate(creative.id);
                        }
                      }}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
              No creatives yet. Click "Upload Creative" to add one!
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreativeModal
          campaigns={campaigns || []}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["creatives"] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingCreative && (
        <CreativeModal
          creative={editingCreative}
          campaigns={campaigns || []}
          onClose={() => setEditingCreative(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["creatives"] });
            setEditingCreative(null);
          }}
        />
      )}
    </div>
  );
}

// Creative Modal Component
function CreativeModal({
  creative,
  campaigns,
  onClose,
  onSuccess,
}: {
  creative?: Creative;
  campaigns: Campaign[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    campaign_id: creative?.campaign_id || "",
    name: creative?.name || "",
    click_url: creative?.click_url || "",
    alt_text: creative?.alt_text || "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(creative?.image_url || "");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("campaign_id", formData.campaign_id);
      formDataToSend.append("name", formData.name);
      formDataToSend.append("click_url", formData.click_url);
      formDataToSend.append("alt_text", formData.alt_text);

      if (imageFile) {
        formDataToSend.append("image_file", imageFile);
      }

      if (creative) {
        // Update existing creative (api interceptor clears Content-Type for FormData)
        await api.put(`/creatives/${creative.id}`, formDataToSend);
      } else {
        // Create new creative (api interceptor clears Content-Type for FormData)
        await api.post("/creatives", formDataToSend);
      }

      onSuccess();
    } catch (err: any) {
      console.error("Creative save error:", err);
      const errorMessage = err.response?.data?.detail || 
                          (typeof err.response?.data === 'string' ? err.response?.data : null) ||
                          err.message || 
                          "Failed to save creative";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 my-8">
        <h2 className="text-2xl font-bold mb-6">
          {creative ? "Edit Creative" : "Upload New Creative"}
        </h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign *
            </label>
            <select
              required
              value={formData.campaign_id}
              onChange={(e) =>
                setFormData({ ...formData, campaign_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select campaign...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creative Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Click URL *
            </label>
            <input
              type="url"
              required
              value={formData.click_url}
              onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alt Text *
            </label>
            <input
              type="text"
              required
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              placeholder="Description for screen readers"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image {creative ? "(Leave empty to keep current image)" : "*"}
            </label>
            <input
              type="file"
              accept="image/*"
              required={!creative}
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {imagePreview && (
              <div className="mt-4 relative pb-[56.25%] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              </div>
            )}
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

