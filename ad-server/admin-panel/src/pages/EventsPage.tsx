import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { normalizeApiBaseUrl } from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";

interface StationEvent {
  id: number;
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  is_this_week: boolean;
  status: "upcoming" | "live" | "past";
  description: string;
}

interface EventsResponse {
  items: StationEvent[];
}

interface EventsUpdateResponse {
  ok: boolean;
  updated_items: number;
  items: StationEvent[];
}

const EMPTY_TEMPLATE: StationEvent = {
  id: 1,
  title: "New event",
  date_label: "Sat, Jan 1 - 7:00 PM",
  location: "Venue or Online",
  is_online: false,
  is_this_week: true,
  status: "upcoming",
  description: "Short description for the app.",
};

function formatEventsLoadError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.data && typeof err.response.data === "object" && "detail" in err.response.data) {
      const d = (err.response.data as { detail: unknown }).detail;
      if (typeof d === "string") return d;
    }
    if (err.response?.status) {
      return `Server returned ${err.response.status}. Check that the API exposes GET /api/v1/events/`;
    }
    if (err.code === "ERR_NETWORK") {
      return "Network error (no response). Check VITE_API_BASE_URL (must end with /api/v1) and redeploy after the events API is live.";
    }
    return err.message || "Request failed.";
  }
  if (err instanceof Error) return err.message;
  return "Request failed.";
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [editorRows, setEditorRows] = useState<StationEvent[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["station-events"],
    queryFn: async () => {
      const response = await api.get<EventsResponse>("/events/");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items: StationEvent[]) => {
      const response = await api.put<EventsUpdateResponse>("/events/", { items });
      return response.data;
    },
    onSuccess: (res) => {
      setFeedback(`Saved ${res.updated_items} event(s).`);
      setEditorRows(res.items);
      void queryClient.invalidateQueries({ queryKey: ["station-events"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Failed to save events.");
    },
  });

  const rows = editorRows.length > 0 ? editorRows : data?.items ?? [];

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return formatEventsLoadError(error);
  }, [error]);

  const updateRow = (id: number, patch: Partial<StationEvent>) => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  };

  const resetEdits = () => {
    setEditorRows(data?.items ? [...data.items] : []);
    setFeedback(null);
  };

  const addRow = () => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      const nextId = base.length === 0 ? 1 : Math.max(...base.map((r) => r.id)) + 1;
      return [...base.map((r) => ({ ...r })), { ...EMPTY_TEMPLATE, id: nextId }];
    });
  };

  const removeRow = (id: number) => {
    setEditorRows((prev) => {
      const base = prev.length > 0 ? prev : data?.items ?? [];
      return base.filter((r) => r.id !== id).map((r) => ({ ...r }));
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
        title="Station Events"
        subtitle="Create and edit events shown in the listener app"
        active="events"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-gray-600">Published to the public events API (GET /api/v1/events/).</p>
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
              onClick={addRow}
              disabled={saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Add event
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
              disabled={isLoading || saveMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving..." : "Save events"}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm ${
              feedback.startsWith("Saved")
                ? "bg-green-50 border border-green-200 text-green-800"
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
              API base: <code className="rounded bg-red-100 px-1 py-0.5 text-xs">{apiBaseHint}</code>
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">When (label)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Online</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">This week</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-gray-600">
                        <p className="mb-4">No events yet. Click <strong>Add event</strong>, fill in the fields, then <strong>Save events</strong>.</p>
                        <button
                          type="button"
                          onClick={addRow}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          Add event
                        </button>
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={row.title}
                          onChange={(e) => updateRow(row.id, { title: e.target.value })}
                          className="w-44 min-w-[11rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={row.date_label}
                          onChange={(e) => updateRow(row.id, { date_label: e.target.value })}
                          className="w-48 min-w-[12rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => updateRow(row.id, { location: e.target.value })}
                          className="w-40 min-w-[10rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={row.is_online}
                          onChange={(e) => updateRow(row.id, { is_online: e.target.checked })}
                          aria-label="Online event"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={row.is_this_week}
                          onChange={(e) => updateRow(row.id, { is_this_week: e.target.checked })}
                          aria-label="This week filter"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={row.status}
                          onChange={(e) =>
                            updateRow(row.id, { status: e.target.value as StationEvent["status"] })
                          }
                          className="rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        >
                          <option value="upcoming">upcoming</option>
                          <option value="live">live</option>
                          <option value="past">past</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <textarea
                          value={row.description}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          rows={2}
                          className="w-72 max-w-full rounded-lg border border-gray-300 px-2 py-2 text-sm resize-y"
                        />
                      </td>
                      <td className="px-3 py-3">
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
