import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";

interface ScheduleShow {
  id: number;
  time: string;
  show: string;
  dj: string;
  description: string;
  current: boolean;
}

interface ScheduleResponse {
  items: ScheduleShow[];
}

interface ScheduleUpdateResponse {
  ok: boolean;
  updated_items: number;
  items: ScheduleShow[];
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [editorRows, setEditorRows] = useState<ScheduleShow[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["radio-schedule"],
    queryFn: async () => {
      const response = await api.get<ScheduleResponse>("/schedule");
      return response.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (items: ScheduleShow[]) => {
      const response = await api.put<ScheduleUpdateResponse>("/schedule", { items });
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
    const e = error as { response?: { data?: { detail?: string }; status?: number } };
    return e.response?.data?.detail || `Request failed (${e.response?.status || "error"})`;
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

  const saveAll = () => {
    setFeedback(null);
    saveMutation.mutate(rows);
  };

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
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {feedback}
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMessage}
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
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
                          className="w-96 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
                        />
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
