import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { fetchSharedCampaignReport } from "../lib/reports";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function PublicCampaignReportPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-campaign-report", token],
    queryFn: () => fetchSharedCampaignReport(token!),
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Invalid report link.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900">Report unavailable</h1>
        <p className="mt-2 text-gray-600 max-w-md">
          This link may have expired or is invalid. Ask New Stars Radio for a new report link.
        </p>
        <Link to="/login" className="mt-6 text-sm text-indigo-600 underline">
          Ad Manager login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <header className="bg-white border-b border-gray-200 print:border-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">New Stars Radio · Advertiser Report</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{data.campaign_name}</h1>
            <p className="text-sm text-gray-600">{data.advertiser_name}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Print / Save PDF
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm print:shadow-none">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium text-gray-900 capitalize">{data.status}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Campaign dates</dt>
              <dd className="font-medium text-gray-900">
                {formatDate(data.campaign_start_date)} — {formatDate(data.campaign_end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Report generated</dt>
              <dd className="font-medium text-gray-900">{formatDate(data.generated_at)}</dd>
            </div>
            {(data.report_period_start || data.report_period_end) && (
              <div>
                <dt className="text-gray-500">Report period</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(data.report_period_start)} — {formatDate(data.report_period_end)}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label="Impressions" value={data.impressions.toLocaleString()} />
            <MetricCard label="Clicks" value={data.clicks.toLocaleString()} />
            <MetricCard label="CTR" value={`${data.click_through_rate}%`} />
            <MetricCard
              label="Budget used"
              value={`${data.budget_utilized_percentage.toFixed(1)}%`}
            />
          </div>
        </section>

        {data.creatives.length > 0 ? (
          <section className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden print:shadow-none">
            <h2 className="px-6 py-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
              Creatives
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Creative
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.creatives.map((c) => (
                    <tr key={c.creative_id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.creative_name}</td>
                      <td className="px-4 py-3 text-gray-700">{c.impressions.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{c.clicks.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">{c.click_through_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <p className="text-xs text-gray-500 print:mt-8">
          Confidential — prepared for {data.advertiser_name}. Data reflects tracked impressions and
          clicks in the New Stars Radio listener app.
        </p>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-4 print:border print:border-gray-200">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
