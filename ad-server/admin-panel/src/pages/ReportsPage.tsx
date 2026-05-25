import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import {
  buildShareReportUrl,
  createCampaignShareLink,
  downloadCampaignCsv,
  downloadCampaignsCsv,
  type CampaignStatsRow,
} from "../lib/reports";
import { AdminHeader } from "../components/AdminHeader";

export default function ReportsPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const querySuffix = useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("start_date", new Date(startDate).toISOString());
    if (endDate) params.set("end_date", new Date(endDate).toISOString());
    const q = params.toString();
    return q ? `?${q}` : "";
  }, [startDate, endDate]);

  const { data: stats, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["campaign-reports", startDate, endDate],
    queryFn: async () => {
      const response = await api.get<CampaignStatsRow[]>(`/reports/campaigns/stats${querySuffix}`);
      return response.data;
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (campaignId: string) => createCampaignShareLink(campaignId, 30),
    onSuccess: (data) => {
      const url = buildShareReportUrl(data.token);
      setShareUrl(url);
      setShareFeedback(`Share link created — valid until ${new Date(data.expires_at).toLocaleDateString()}.`);
    },
    onError: () => {
      setShareFeedback("Failed to create share link.");
      setShareUrl(null);
    },
  });

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("Link copied to clipboard.");
    } catch {
      setShareFeedback("Could not copy — select the link and copy manually.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Advertiser Reports"
        subtitle="Export performance data and share read-only reports with clients"
        active="reports"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Report period</h2>
          <p className="mt-1 text-sm text-gray-600">
            Leave dates empty for all-time stats. Filters apply to impressions and clicks in the table,
            exports, and new share links.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="report-start" className="block text-xs font-medium text-gray-600 mb-1">
                From
              </label>
              <input
                id="report-start"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="report-end" className="block text-xs font-medium text-gray-600 mb-1">
                To
              </label>
              <input
                id="report-end"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => void downloadCampaignsCsv(startDate, endDate)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Export all (CSV)
            </button>
          </div>
        </section>

        {shareFeedback && (
          <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            <p>{shareFeedback}</p>
            {shareUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="rounded bg-white px-2 py-1 text-xs break-all">{shareUrl}</code>
                <button
                  type="button"
                  onClick={() => void copyShareUrl()}
                  className="text-xs font-medium text-indigo-700 underline"
                >
                  Copy link
                </button>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-indigo-700 underline"
                >
                  Open preview
                </a>
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Failed to load reports.
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Campaign
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Impressions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Clicks
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      CTR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Budget
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {!stats?.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-600">
                        No campaigns yet. Create campaigns and serve ads to see reporting data.
                      </td>
                    </tr>
                  ) : (
                    stats.map((row) => (
                      <tr key={row.campaign_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {row.campaign_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row.click_through_rate}%</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {row.impressions_served.toLocaleString()} served ·{" "}
                          {row.budget_utilized_percentage.toFixed(1)}% used
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void downloadCampaignCsv(
                                  row.campaign_id,
                                  row.campaign_name,
                                  startDate,
                                  endDate,
                                )
                              }
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            >
                              CSV
                            </button>
                            <button
                              type="button"
                              disabled={shareMutation.isPending}
                              onClick={() => shareMutation.mutate(row.campaign_id)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                            >
                              Share link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500">
          Share links are read-only and expire after 30 days. Clients can open the link in a browser and
          use Print → Save as PDF for a PDF copy.
        </p>
      </main>
    </div>
  );
}
