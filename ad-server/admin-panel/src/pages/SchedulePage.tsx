import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { normalizeApiBaseUrl } from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";

type ScheduleDayKey = "mon_thu" | "fri" | "sat" | "sun";

const SCHEDULE_DAY_KEYS: ScheduleDayKey[] = ["mon_thu", "fri", "sat", "sun"];

const SCHEDULE_DAY_LABELS: Record<ScheduleDayKey, string> = {
  mon_thu: "Monday – Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

interface ScheduleShow {
  id: number;
  time: string;
  show: string;
  dj: string;
  description: string;
  current: boolean;
}

interface ScheduleByDay {
  mon_thu: ScheduleShow[];
  fri: ScheduleShow[];
  sat: ScheduleShow[];
  sun: ScheduleShow[];
}

const EMPTY_DAYS = (): ScheduleByDay => ({
  mon_thu: [],
  fri: [],
  sat: [],
  sun: [],
});

/** Same defaults as the ad-server schedule endpoint (first save seeds the file). */
const DEFAULT_SCHEDULE_TEMPLATE: ScheduleByDay = {
  mon_thu: [
    { id: 1, time: "12:00 AM - 5:00 AM", show: "Overnight Stars Mix", dj: "Auto DJ", description: "Non-stop overnight rotation of rising Hip-Hop, R&B, and Smooth Jazz artists.", current: false },
    { id: 2, time: "5:00 AM - 7:00 AM", show: "Sunrise Smooth Jazz", dj: "DJ Marcus", description: "Ease into the day with mellow jazz and soulful instrumentals.", current: false },
    { id: 3, time: "7:00 AM - 10:00 AM", show: "Morning Hip-Hop Rise", dj: "DJ Kaya", description: "Fresh bars and beats from tomorrow's stars — news and community shout-outs.", current: false },
    { id: 4, time: "10:00 AM - 2:00 PM", show: "Midday R&B Flow", dj: "DJ Lila", description: "Midday grooves and new voices in R&B — perfect for work or the road.", current: false },
    { id: 5, time: "2:00 PM - 6:00 PM", show: "Afternoon Discovery", dj: "New Stars Team", description: "Deep cuts and debut tracks from unsigned artists we're breaking first.", current: false },
    { id: 6, time: "6:00 PM - 9:00 PM", show: "Drive Time Heat", dj: "DJ Apex", description: "Peak-hour energy — Hip-Hop and R&B anthems for the commute home.", current: false },
    { id: 7, time: "9:00 PM - 12:00 AM", show: "Late Night Lounge", dj: "DJ Nova", description: "Smooth Jazz and slow R&B to wind down the evening.", current: false },
  ],
  fri: [],
  sat: [],
  sun: [],
};

interface ScheduleResponse {
  days: ScheduleByDay;
  items?: ScheduleShow[];
}

interface ScheduleUpdateResponse {
  ok: boolean;
  updated_items: number;
  days: ScheduleByDay;
}

function normalizeScheduleResponse(data: ScheduleResponse): ScheduleByDay {
  if (data.days) {
    return {
      mon_thu: data.days.mon_thu ?? [],
      fri: data.days.fri ?? [],
      sat: data.days.sat ?? [],
      sun: data.days.sun ?? [],
    };
  }
  if (Array.isArray(data.items) && data.items.length > 0) {
    return { ...EMPTY_DAYS(), mon_thu: data.items };
  }
  return EMPTY_DAYS();
}

function cloneDays(days: ScheduleByDay): ScheduleByDay {
  return {
    mon_thu: days.mon_thu.map((row) => ({ ...row })),
    fri: days.fri.map((row) => ({ ...row })),
    sat: days.sat.map((row) => ({ ...row })),
    sun: days.sun.map((row) => ({ ...row })),
  };
}

function maxScheduleId(days: ScheduleByDay): number {
  const ids = SCHEDULE_DAY_KEYS.flatMap((key) => days[key].map((row) => row.id));
  return ids.length === 0 ? 0 : Math.max(...ids);
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
  const [activeTab, setActiveTab] = useState<ScheduleDayKey>("mon_thu");
  const [editorDays, setEditorDays] = useState<ScheduleByDay | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["radio-schedule"],
    queryFn: async () => {
      const response = await api.get<ScheduleResponse>("/schedule/");
      return normalizeScheduleResponse(response.data);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (days: ScheduleByDay) => {
      const response = await api.put<ScheduleUpdateResponse>("/schedule/", { days });
      return response.data;
    },
    onSuccess: (res) => {
      setFeedback(`Saved ${res.updated_items} schedule entries across all day tabs.`);
      setEditorDays(cloneDays(res.days));
      void queryClient.invalidateQueries({ queryKey: ["radio-schedule"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Failed to save schedule.");
    },
  });

  const days = editorDays ?? data ?? EMPTY_DAYS();
  const rows = days[activeTab];

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return formatScheduleLoadError(error);
  }, [error]);

  const updateRow = (id: number, patch: Partial<ScheduleShow>) => {
    setEditorDays((prev) => {
      const base = cloneDays(prev ?? data ?? EMPTY_DAYS());
      base[activeTab] = base[activeTab].map((row) => (row.id === id ? { ...row, ...patch } : row));
      return base;
    });
  };

  const resetEdits = () => {
    setEditorDays(data ? cloneDays(data) : null);
    setFeedback(null);
  };

  const startFromTemplate = () => {
    setEditorDays(cloneDays(DEFAULT_SCHEDULE_TEMPLATE));
    setActiveTab("mon_thu");
    setFeedback("Template: Loaded Mon–Thu default shows. Add Friday, Saturday, and Sunday tabs as needed, then Save schedule.");
  };

  const addRow = () => {
    setEditorDays((prev) => {
      const base = cloneDays(prev ?? data ?? EMPTY_DAYS());
      const nextId = maxScheduleId(base) + 1;
      base[activeTab] = [
        ...base[activeTab],
        {
          id: nextId,
          time: "12:00 PM - 1:00 PM",
          show: "New show",
          dj: "DJ name",
          description: "Description",
          current: false,
        },
      ];
      return base;
    });
  };

  const removeRow = (id: number) => {
    setEditorDays((prev) => {
      const base = cloneDays(prev ?? data ?? EMPTY_DAYS());
      base[activeTab] = base[activeTab].filter((r) => r.id !== id);
      return base;
    });
  };

  const saveAll = () => {
    setFeedback(null);
    saveMutation.mutate(days);
  };

  const apiBaseHint = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Radio Schedule"
        subtitle="Edit the schedule shown in the listener app (by day)"
        active="schedule"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-gray-600">
            Use the tabs to manage Mon–Thu, Friday, Saturday, and Sunday line-ups. The listener app shows the tab that matches today.
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
              disabled={isLoading || saveMutation.isPending}
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
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
          {SCHEDULE_DAY_KEYS.map((key) => {
            const count = days[key].length;
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {SCHEDULE_DAY_LABELS[key]}
                <span className={`ml-2 text-xs ${active ? "text-indigo-100" : "text-gray-500"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

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
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-600">
                        <p className="mb-3">No shows for {SCHEDULE_DAY_LABELS[activeTab]} yet.</p>
                        <p className="mb-4 text-sm">
                          Click <strong>Add row</strong> to create slots, or copy from another day tab after saving.
                        </p>
                        <button
                          type="button"
                          onClick={addRow}
                          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                        >
                          Add row
                        </button>
                      </td>
                    </tr>
                  )}
                  {rows.map((row) => (
                    <tr key={`${activeTab}-${row.id}`} className="hover:bg-gray-50">
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
