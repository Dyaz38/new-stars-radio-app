import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface Advertiser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  status: "active" | "inactive";
  created_at: string;
}

interface AdvertiserForm {
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
}

export default function AdvertisersPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);

  const { data: advertisers, isLoading } = useQuery({
    queryKey: ["advertisers"],
    queryFn: async () => {
      const response = await api.get<Advertiser[]>("/advertisers");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AdvertiserForm) => {
      return await api.post("/advertisers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisers"] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdvertiserForm }) => {
      return await api.put(`/advertisers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisers"] });
      setEditingAdvertiser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/advertisers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advertisers"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading advertisers...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Advertisers</h1>
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
                  className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg"
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
          <p className="text-gray-600">
            Manage advertiser accounts and information
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
          >
            ➕ Add Advertiser
          </button>
        </div>

        {/* Advertisers Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {advertisers && advertisers.length > 0 ? (
                advertisers.map((advertiser) => (
                  <tr key={advertiser.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{advertiser.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{advertiser.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{advertiser.phone || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{advertiser.company_name || "—"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          advertiser.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {advertiser.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingAdvertiser(advertiser)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this advertiser?")) {
                            deleteMutation.mutate(advertiser.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No advertisers yet. Click "Add Advertiser" to create one!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <AdvertiserModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingAdvertiser && (
        <AdvertiserModal
          advertiser={editingAdvertiser}
          onClose={() => setEditingAdvertiser(null)}
          onSubmit={(data) =>
            updateMutation.mutate({ id: editingAdvertiser.id, data })
          }
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Advertiser Modal Component
function AdvertiserModal({
  advertiser,
  onClose,
  onSubmit,
  isLoading,
}: {
  advertiser?: Advertiser;
  onClose: () => void;
  onSubmit: (data: AdvertiserForm) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<AdvertiserForm>({
    name: advertiser?.name || "",
    email: advertiser?.email || "",
    phone: advertiser?.phone || "",
    company_name: advertiser?.company_name || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6">
          {advertiser ? "Edit Advertiser" : "Add New Advertiser"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name *
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
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
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

