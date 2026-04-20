import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { normalizeApiBaseUrl } from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";

interface ScheduleShow {
  id: number;
  time: string;
  show: string;
  dj: string;
  description: string;
  current: boolean;
}

/** Same defaults as the ad-server schedule endpoint (first save seeds the file). */
const DEFAULT_SCHEDULE_TEMPLATE: ScheduleShow[] = [
  { id: 1, time: "5:00 AM - 6:00 AM", show: "Early Bird Music", dj: "Auto DJ", description: "Wake up with your favorite hits", current: false },
  { id: 2, time: "6:00 AM - 10:00 AM", show: "Morning Drive", dj: "Sarah Martinez", description: "Start your day right with Sarah! News, traffic, and the hottest pop hits", current: true },
  { id: 3, time: "10:00 AM - 2:00 PM", show: "Mid-Morning Mix", dj: "Jake Thompson", description: "Non-stop music to keep your energy up", current: false },
  { id: 4, time: "2:00 PM - 6:00 PM", show: "Afternoon Groove", dj: "Maria Lopez", description: "The perfect soundtrack for your afternoon", current: false },
  { id: 5, time: "6:00 PM - 8:00 PM", show: "Drive Time Hits", dj: "Alex Chen", description: "Beating traffic with the biggest hits", current: false },
  { id: 6, time: "8:00 PM - 10:00 PM", show: "Pop Tonight", dj: "Emma Wilson", description: "Tonight's biggest pop anthems and new releases", current: false },
  { id: 7, time: "10:00 PM - 12:00 AM", show: "Late Night Vibes", dj: "Ryan Brooks", description: "Chill out with smooth pop and indie favorites", current: false },
  { id: 8, time: "12:00 AM - 5:00 AM", show: "Overnight Mix", dj: "Auto DJ", description: "Continuous music through the night", current: false },
];

interface ScheduleResponse {
  items: ScheduleShow[];
}

interface ScheduleUpdateResponse {
  ok: boolean;
  updated_items: number;
  items: ScheduleShow[];
}

function formatScheduleLoadError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data && typeof err.response.data === "object" && "detail" in err.response.data) {
      const d = (err.response.data as { detail: unknown }).detail;
      if (typeof d === "string") return d;
    }
    if (err.response?.status) {
      return `Server returned ${err.response.status}. Check that Railway is running the latest API with /api/v1/schedule.`;
    }
    if (err.code === "ERR_NETWORK") {
      return "Network error (no response). Often this is a wrong API URL in Vercel or CORS. Set VITE_API_BASE_URL to your Railway API root including /api/v1 (see admin-panel/.env.example), redeploy the admin panel, and redeploy the ad-server after pulling the schedule feature.";
    }
    return err.message || "Request failed.";
  }
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [editorRows, setEditorRows] = useState<ScheduleShow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["radio-schedule"],
    queryFn: async () => {
      const response = await api.get<ScheduleResponse>("/schedule/");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items: ScheduleShow[]) => {
      const response = await api.put<ScheduleUpdateResponse>("/schedule/", { items });
      return response.data;
    },
    onSuccess: (res) => {
      setFeedback(`Saved ${res.updated_items} schedule entries.`);
      setEditorRows(res.items);
      void queryClient.invalidateQueries({ queryKey: ["radio-schedule"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Failed to save schedule.");
    },
  });

  const rows = editorRows.length > 0 ? editorRows : data?.items ?? [];

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return formatScheduleLoadError(error);
  }, [error]);

  const updateRow = (id: number, patch: Partial<ScheduleShow>) => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  };

  const markCurrent = (id: number) => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      return base.map((row) => ({ ...row, current: row.id === id }));
    });
  };

  const resetEdits = () => {
    setEditorRows(data?.items ? [...data.items] : []);
    setFeedback(null);
  };

  const startFromTemplate = () => {
    setEditorRows(DEFAULT_SCHEDULE_TEMPLATE.map((row) => ({ ...row })));
    setFeedback("Template: Loaded the default day template. Edit as needed, then click Save schedule.");
  };

  const addRow = () => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      const nextId = base.length === 0 ? 1 : Math.max(...base.map((r) => r.id)) + 1;
      const hasCurrent = base.some((r) => r.current);
      return [
        ...base.map((r) => ({ ...r })),
        {
          id: nextId,
          time: "12:00 PM - 1:00 PM",
          show: "New show",
          dj: "DJ name",
          description: "Description",
          current: !hasCurrent && base.length === 0,
        },
      ];
    });
  };

  const removeRow = (id: number) => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      const filtered = base.filter((r) => r.id !== id);
      if (filtered.length === 0) return [];
      const removedCurrent = base.find((r) => r.id === id)?.current;
      if (removedCurrent && !filtered.some((r) => r.current)) {
        return filtered.map((r, i) => (i === 0 ? { ...r, current: true } : { ...r, current: false }));
      }
      return filtered.map((r) => ({ ...r }));
    });
  };

  const saveAll = () => {
    setFeedback(null);
    saveMutation.mutate(rows);
  };

  const apiBaseHint = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Radio Schedule"
        subtitle="Edit the schedule shown in the listener app"
        active="schedule"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-gray-600">
            Changes here are published to the shared schedule API for your app.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {isFetching ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={startFromTemplate}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-indigo-800 bg-indigo-100 border border-indigo-200 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
            >
              Start from template
            </button>
            <button
              type="button"
              onClick={addRow}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Add row
            </button>
            <button
              type="button"
              onClick={resetEdits}
              disabled={isLoading || saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reset edits
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={isLoading || saveMutation.isPending || rows.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save schedule"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm ${
              feedback.startsWith("Saved")
                ? "bg-green-50 border border-green-200 text-green-800"
                : feedback.startsWith("Template:")
                ? "bg-blue-50 border border-blue-200 text-blue-900"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {feedback}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 space-y-2">
            <p className="font-medium">{errorMessage}</p>
            <p className="text-red-800/90">
              This admin panel loads schedule from: <code className="rounded bg-red-100 px-1 py-0.5 text-xs">{apiBaseHint}</code>
            </p>
            <ul className="list-disc pl-5 text-red-800/90">
              <li>Redeploy the ad-server on Railway after the schedule API was added.</li>
              <li>In Vercel project settings, set <code className="rounded bg-red-100 px-1">VITE_API_BASE_URL</code> to your Railway API (must end with <code className="rounded bg-red-100 px-1">/api/v1</code>), then redeploy the admin panel.</li>
              <li>While the API is down, use <strong>Start from template</strong> below to build rows locally, then <strong>Save schedule</strong> once the API responds.</li>
            </ul>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading schedule...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Live
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Show
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DJ
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Remove
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-600">
                        <p className="mb-3">No rows yet. The list fills when the schedule API loads successfully.</p>
                        <p className="mb-4 text-sm">
                          To <strong>create</strong> a schedule here: click <strong>Start from template</strong> for a full day outline, or <strong>Add row</strong> for a single blank slot. Edit the fields, pick which slot is <strong>Live</strong>, then click <strong>Save schedule</strong>.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={startFromTemplate}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                          >
                            Start from template
                          </button>
                          <button
                            type="button"
                            onClick={addRow}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Add row
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="current-show"
                          checked={row.current}
                          onChange={() => markCurrent(row.id)}
                          aria-label={`Mark ${row.show} as current show`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.time}
                          onChange={(e) => updateRow(row.id, { time: e.target.value })}
                          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.show}
                          onChange={(e) => updateRow(row.id, { show: e.target.value })}
                          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.dj}
                          onChange={(e) => updateRow(row.id, { dj: e.target.value })}
                          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          rows={2}
                          className="w-96 max-w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-sm text-red-600 hover:text-red-800 underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
