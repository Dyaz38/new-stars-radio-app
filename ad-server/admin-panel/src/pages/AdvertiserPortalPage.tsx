import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";

interface PortalClient {
  id: string;
  name: string;
  company_name: string | null;
}

interface PortalOverview {
  advertiser_name: string;
  company_name: string | null;
  campaign_count: number;
  pending_creatives_count: number;
  client_count: number;
  is_agency_account: boolean;
}

interface PortalCampaign {
  id: string;
  name: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface PortalCreative {
  id: string;
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  advertiser_name: string;
  name: string;
  image_url: string;
  image_width: number;
  image_height: number;
  click_url: string;
  status: string;
  created_at: string;
}

function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
  const origin = new URL(base).origin;
  return origin + (url.startsWith("/") ? url : "/" + url);
}

function statusBadge(status: string) {
  if (status === "pending_review") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  if (status === "active") {
    return "bg-green-100 text-green-900 border-green-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
}

export default function AdvertiserPortalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: clients = [] } = useQuery({
    queryKey: ["advertiser-portal-clients"],
    queryFn: async () => {
      const { data } = await api.get<PortalClient[]>("/advertiser-portal/clients");
      return data;
    },
  });

  useEffect(() => {
    if (clients.length === 0) return;
    if (!selectedClientId || !clients.some((c) => c.id === selectedClientId)) {
      const fromUser = user?.advertiser_id;
      const pick = fromUser && clients.some((c) => c.id === fromUser) ? fromUser : clients[0].id;
      setSelectedClientId(pick);
    }
  }, [clients, selectedClientId, user?.advertiser_id]);

  const isAgency = clients.length > 1;
  const clientQuery = isAgency && selectedClientId ? { params: { advertiser_id: selectedClientId } } : {};

  const { data: overview } = useQuery({
    queryKey: ["advertiser-portal-overview", selectedClientId],
    enabled: Boolean(selectedClientId) || !isAgency,
    queryFn: async () => {
      const { data } = await api.get<PortalOverview>("/advertiser-portal/overview", clientQuery);
      return data;
    },
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["advertiser-portal-campaigns", selectedClientId],
    enabled: Boolean(selectedClientId) || !isAgency,
    queryFn: async () => {
      const { data } = await api.get<PortalCampaign[]>("/advertiser-portal/campaigns", clientQuery);
      return data;
    },
  });

  const { data: creatives = [], isLoading } = useQuery({
    queryKey: ["advertiser-portal-creatives", selectedClientId, isAgency],
    enabled: !isAgency || Boolean(selectedClientId),
    queryFn: async () => {
      const params =
        isAgency && selectedClientId ? { advertiser_id: selectedClientId } : undefined;
      const { data } = await api.get<PortalCreative[]>("/advertiser-portal/creatives", { params });
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !campaignId) throw new Error("Missing fields");
      const fd = new FormData();
      fd.append("campaign_id", campaignId);
      fd.append("name", name);
      fd.append("click_url", clickUrl);
      if (altText.trim()) fd.append("alt_text", altText.trim());
      fd.append("image_file", file);
      return api.post("/advertiser-portal/creatives", fd);
    },
    onSuccess: () => {
      setFeedback(
        "Upload received — your creative is pending review. New Stars Radio will activate it when approved.",
      );
      setName("");
      setClickUrl("");
      setAltText("");
      setFile(null);
      void queryClient.invalidateQueries({ queryKey: ["advertiser-portal-creatives"] });
      void queryClient.invalidateQueries({ queryKey: ["advertiser-portal-overview"] });
      setCampaignId("");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Upload failed. Try again or email sales@newstarsradio.com.");
    },
  });

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Advertiser portal</p>
            <h1 className="text-xl font-bold text-gray-900">
              {overview?.advertiser_name || user?.full_name || "Your account"}
            </h1>
            {overview?.company_name ? (
              <p className="text-sm text-gray-600">{overview.company_name}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {isAgency ? (
          <section className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
            <label htmlFor="portal-client" className="block text-sm font-medium text-gray-700 mb-1">
              Client you are uploading for
            </label>
            <select
              id="portal-client"
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setCampaignId("");
              }}
              className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company_name ? ` (${c.company_name})` : ""}
                </option>
              ))}
            </select>
          </section>
        ) : null}

        <section className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <p className="text-sm text-gray-700">
            Upload banner artwork for your active campaigns. Creatives stay <strong>pending review</strong> until
            New Stars Radio approves them in Ad Manager. Need help? Email{" "}
            <a href="mailto:sales@newstarsradio.com" className="text-indigo-600 underline">
              sales@newstarsradio.com
            </a>
            .
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
            <span>
              Campaigns: <strong className="text-gray-900">{overview?.campaign_count ?? "—"}</strong>
            </span>
            <span>
              Pending review:{" "}
              <strong className="text-gray-900">{overview?.pending_creatives_count ?? "—"}</strong>
            </span>
          </div>
        </section>

        {feedback ? (
          <div
            className={`p-4 rounded-lg text-sm border ${
              feedback.includes("failed") || feedback.includes("Missing")
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            {feedback}
          </div>
        ) : null}

        <section className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload creative</h2>
          {sortedCampaigns.length === 0 ? (
            <p className="text-sm text-gray-600">
              No campaigns are linked to your account yet. Contact sales@newstarsradio.com when your campaign is
              ready.
            </p>
          ) : (
            <form
              className="space-y-4 max-w-xl"
              onSubmit={(e) => {
                e.preventDefault();
                setFeedback(null);
                uploadMutation.mutate();
              }}
            >
              <div>
                <label htmlFor="portal-campaign" className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign
                </label>
                <select
                  id="portal-campaign"
                  required
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Select campaign</option>
                  {sortedCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="portal-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Creative name
                </label>
                <input
                  id="portal-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Desktop banner March"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="portal-url" className="block text-sm font-medium text-gray-700 mb-1">
                  Click URL
                </label>
                <input
                  id="portal-url"
                  type="url"
                  required
                  value={clickUrl}
                  onChange={(e) => setClickUrl(e.target.value)}
                  placeholder="https://your-landing-page.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="portal-alt" className="block text-sm font-medium text-gray-700 mb-1">
                  Alt text (optional)
                </label>
                <input
                  id="portal-alt"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="portal-file" className="block text-sm font-medium text-gray-700 mb-1">
                  Image file
                </label>
                <input
                  id="portal-file"
                  type="file"
                  required
                  accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use 728×90 for the main banner or 320×50 for the events placement. We can generate mobile sizes after
                  approval if needed.
                </p>
              </div>
              <button
                type="submit"
                disabled={uploadMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {uploadMutation.isPending ? "Uploading…" : "Submit for review"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-lg bg-white border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your uploads</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : creatives.length === 0 ? (
            <p className="text-sm text-gray-600">No uploads yet.</p>
          ) : (
            <ul className="space-y-4">
              {creatives.map((c) => (
                <li key={c.id} className="flex flex-col sm:flex-row gap-4 border border-gray-100 rounded-lg p-3">
                  <img
                    src={resolveImageUrl(c.image_url)}
                    alt=""
                    className="w-full sm:w-40 h-auto object-contain bg-gray-50 border border-gray-200 rounded"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-600">
                      {isAgency ? `${c.advertiser_name} · ` : ""}
                      {c.campaign_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {c.image_width}×{c.image_height} · {new Date(c.created_at).toLocaleString()}
                    </p>
                    <span
                      className={`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full border ${statusBadge(c.status)}`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
