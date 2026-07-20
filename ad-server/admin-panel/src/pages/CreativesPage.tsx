import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";
import {
  matchCreativeSizePreset,
  placementTagsForDimensions,
  readImageFileDimensions,
} from "../constants/creativeSizes";

/** Resolve image URL: full URLs and data URLs as-is, relative paths get API origin prepended */
function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  const origin = new URL(base).origin;
  return origin + (url.startsWith("/") ? url : "/" + url);
}

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

function CreativePreview({ creative }: { creative: Creative }) {
  const [failed, setFailed] = useState(false);
  const src = resolveImageUrl(creative.image_url);
  const showBroken = failed || !src.trim();

  return (
    <div className="relative pb-[56.25%] bg-gray-100">
      {showBroken ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xs font-semibold text-amber-800">Preview unavailable</span>
          <span className="mt-1 text-[11px] text-gray-500 break-all line-clamp-3">
            {creative.image_url?.trim() || "No image URL saved"}
          </span>
          <span className="mt-2 text-[11px] text-gray-400">Edit → upload a new image file</span>
        </div>
      ) : (
        <img
          src={src}
          alt={creative.alt_text}
          className="absolute inset-0 w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function CreativesPage() {
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
      <AdminHeader title="Ad Creatives" active="creatives" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="max-w-2xl">
            <p className="text-gray-600">Manage ad creatives and images</p>
            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950">
              <p className="font-medium">Events modal looks best at 320 × 50</p>
              <p className="mt-1 text-indigo-900/90">
                Upload a <strong>320 × 50</strong> creative alongside your 728 × 90 desktop banner for the same
                campaign. The listener app prefers the mobile size in the Events modal; desktop-only creatives still
                work but are scaled down.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shrink-0 self-start"
          >
            ➕ Upload Creative
          </button>
        </div>

        {/* Creatives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creatives && creatives.length > 0 ? (
            creatives.map((creative) => (
              <div key={creative.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <CreativePreview creative={creative} />
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {placementTagsForDimensions(creative.image_width, creative.image_height).map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            tag.includes("best fit")
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="truncate pt-1">
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
  const [imagePreview, setImagePreview] = useState<string>(
    creative ? resolveImageUrl(creative.image_url) : ""
  );
  const [dimensionNotice, setDimensionNotice] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const dims = await readImageFileDimensions(file);
      const matched = matchCreativeSizePreset(dims.width, dims.height);
      if (matched) {
        setDimensionNotice(
          matched.eventsModalPreferred
            ? `Detected ${dims.width}×${dims.height} — ideal for the Events modal and mobile banner.`
            : `Detected ${dims.width}×${dims.height} — best for the desktop top banner.`,
        );
      } else {
        setDimensionNotice(
          `Image is ${dims.width}×${dims.height}. Use 320×50 (Events modal) or 728×90 (desktop banner) for best results.`,
        );
      }
    } catch {
      setDimensionNotice(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (creative) {
        if (imageFile) {
          const formDataToSend = new FormData();
          const file = imageFile;
          const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".png";
          formDataToSend.append("image_file", file, file.name || `creative${ext}`);
          await api.post(`/creatives/${creative.id}/image`, formDataToSend);
        }

        await api.put(`/creatives/${creative.id}`, {
          name: formData.name,
          click_url: formData.click_url,
          alt_text: formData.alt_text || undefined,
        });
      } else {
        if (!formData.campaign_id) {
          setError("Please select a campaign.");
          setIsLoading(false);
          return;
        }
        if (!imageFile) {
          setError("Please choose an image file to upload.");
          setIsLoading(false);
          return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append("campaign_id", formData.campaign_id);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("click_url", formData.click_url.trim());
        formDataToSend.append("alt_text", formData.alt_text.trim());
        const file = imageFile;
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".png";
        formDataToSend.append("image_file", file, file.name || `creative${ext}`);
        await api.post("/creatives", formDataToSend);
      }

      onSuccess();
    } catch (err: any) {
      console.error("Creative save error:", err);
      let errorMessage: string;
      const detail = err.response?.data?.detail;
      if (detail !== undefined && detail !== null) {
        errorMessage = typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((e: any) => e?.msg ?? e?.loc?.join?.(" ") ?? e).filter(Boolean).join(", ") || JSON.stringify(detail)
            : JSON.stringify(detail);
      } else if (err.response?.data && typeof err.response.data === "string") {
        errorMessage = err.response.data;
      } else if (err.response?.status) {
        errorMessage = `Server error (${err.response.status}). Please try again.`;
      } else if (err.message === "Network Error" || !err.response) {
        errorMessage = "Request failed. Check browser Console (F12) for CORS/network errors.";
      } else {
        errorMessage = err.message || "Failed to save creative";
      }
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
            <p className="text-sm text-red-600 font-medium">{error}</p>
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
              type="text"
              required
              value={formData.click_url}
              onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
              placeholder="https://example.com or mailto:sales@newstarsradio.com"
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
              Image file {creative ? "(optional — choose to replace current image)" : "*"}
            </label>
            <input
              type="file"
              required={!creative}
              accept="image/png,image/jpeg,image/gif,image/webp,.png,.jpg,.jpeg,.gif,.webp"
              onChange={handleImageChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use PNG or JPEG at 728×90 (desktop banner) or 320×50 (Events modal). Size is detected automatically
              on upload.
            </p>
            {dimensionNotice ? (
              <p className="mt-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
                {dimensionNotice}
              </p>
            ) : null}
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

