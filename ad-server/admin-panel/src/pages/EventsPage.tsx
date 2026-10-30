import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { normalizeApiBaseUrl } from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";
import { CountryPicker } from "../components/CountryPicker";

interface StationEvent {
  id: number;
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  is_this_week: boolean;
  status: "upcoming" | "live" | "past";
  description: string;
  /** ISO 8601 — calendar export in the listener app */
  starts_at?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  /** ISO 3166-1 alpha-2 — empty = worldwide; else listeners must match by IP */
  country_code?: string | null;
  doors_at?: string | null;
  ticket_url?: string | null;
  ticket_price?: string | null;
  review_status?: "published" | "pending_review";
  submitted_by_user_id?: string | null;
}

interface EventsResponse {
  items: StationEvent[];
}

interface EventsUpdateResponse {
  ok: boolean;
  updated_items: number;
  items: StationEvent[];
}

interface EventLocationsResponse {
  places: string[];
}

interface EventLocationsUpdateResponse {
  ok: boolean;
  places: string[];
}

const CUSTOM_LOCATION = "__custom__";

const EMPTY_TEMPLATE: StationEvent = {
  id: 1,
  title: "New event",
  date_label: "Sat, Jan 1 - 7:00 PM",
  location: "Venue or Online",
  is_online: false,
  is_this_week: true,
  status: "upcoming",
  description: "Short description for the app.",
  starts_at: null,
  ends_at: null,
  image_url: null,
  country_code: null,
  doors_at: null,
  ticket_url: null,
  ticket_price: null,
  review_status: "published",
};

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function adServerOriginFromEnv(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined).replace(
    /\/api\/v1\/?$/i,
    "",
  );
}

function resolveEventImagePreview(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  const origin = adServerOriginFromEnv();
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${origin}${path}`;
}

function placeIsInPresetList(location: string, places: string[]): boolean {
  return places.some((p) => p === location);
}

/** Value for the location `<select>`: preset name, empty, or Custom. */
function locationSelectValue(location: string, places: string[]): string {
  if (!location.trim()) return "";
  if (placeIsInPresetList(location, places)) return location;
  return CUSTOM_LOCATION;
}

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
  /** `null` = show server data; `[]` = user removed all rows (must not fall back to server). */
  const [editorRows, setEditorRows] = useState<StationEvent[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);
  const [newPlaceInput, setNewPlaceInput] = useState("");
  const [customLocationIds, setCustomLocationIds] = useState<Set<number>>(() => new Set());
  const [showPromoterLogins, setShowPromoterLogins] = useState(false);

  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: ["station-events"],
    queryFn: async () => {
      const response = await api.get<EventsResponse>("/events/");
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await api.post<StationEvent>(`/events/${eventId}/approve`);
      return response.data;
    },
    onSuccess: (approved) => {
      setFeedback("Event approved — visible in the listener app.");
      // Keep the local draft in sync so a later Save cannot overwrite with pending_review.
      setEditorRows((prev) => {
        const base = prev ?? data?.items ?? [];
        return base.map((row) => (row.id === approved.id ? { ...row, ...approved } : row));
      });
      void queryClient.invalidateQueries({ queryKey: ["station-events"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: unknown } } };
      const detail = e.response?.data?.detail;
      setFeedback(typeof detail === "string" ? detail : "Approve failed.");
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

  const {
    data: locationsData,
    isLoading: locationsLoading,
    error: locationsError,
  } = useQuery({
    queryKey: ["event-locations"],
    queryFn: async () => {
      const response = await api.get<EventLocationsResponse>("/events/locations");
      return response.data;
    },
  });

  const saveLocationsMutation = useMutation({
    mutationFn: async (places: string[]) => {
      const response = await api.put<EventLocationsUpdateResponse>("/events/locations", { places });
      return response.data;
    },
    onSuccess: () => {
      setFeedback("Saved location list.");
      void queryClient.invalidateQueries({ queryKey: ["event-locations"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Failed to save locations.");
    },
  });

  const presetPlaces = locationsData?.places ?? [];
  const sortedPresetPlaces = useMemo(
    () => [...presetPlaces].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [presetPlaces],
  );

  const rows = editorRows !== null ? editorRows : (data?.items ?? []);

  const errorMessage = useMemo(() => {
    if (!error) return null;
    return formatEventsLoadError(error);
  }, [error]);

  const updateRow = (id: number, patch: Partial<StationEvent>) => {
    setEditorRows((prev) => {
      const base = prev ?? data?.items ?? [];
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  };

  const setRowCustomLocation = (id: number, enabled: boolean) => {
    setCustomLocationIds((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const resetEdits = () => {
    setEditorRows(null);
    setCustomLocationIds(new Set());
    setFeedback(null);
  };

  const addRow = () => {
    setEditorRows((prev) => {
      const base = prev ?? data?.items ?? [];
      const nextId = base.length === 0 ? 1 : Math.max(...base.map((r) => r.id)) + 1;
      return [...base.map((r) => ({ ...r })), { ...EMPTY_TEMPLATE, id: nextId }];
    });
  };

  const removeRow = (id: number) => {
    setEditorRows((prev) => {
      const base = prev ?? data?.items ?? [];
      return base.filter((r) => r.id !== id).map((r) => ({ ...r }));
    });
    setRowCustomLocation(id, false);
    setFeedback('Event removed from the list — click Save events to publish.');
  };

  const saveAll = () => {
    setFeedback(null);
    saveMutation.mutate(rows);
  };

  const addPlaceAndSave = () => {
    const next = newPlaceInput.trim();
    if (!next) {
      setFeedback("Enter a town or city name before adding.");
      return;
    }
    if (presetPlaces.some((p) => p.toLowerCase() === next.toLowerCase())) {
      setFeedback("That place is already in the list.");
      return;
    }
    setFeedback(null);
    saveLocationsMutation.mutate([...presetPlaces, next]);
    setNewPlaceInput("");
  };

  const removePlace = (place: string) => {
    setFeedback(null);
    saveLocationsMutation.mutate(presetPlaces.filter((p) => p !== place));
  };

  const apiBaseHint = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
  const locationsErrorText = useMemo(() => {
    if (!locationsError) return null;
    return formatEventsLoadError(locationsError);
  }, [locationsError]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Station Events"
        subtitle="Create and edit events shown in the listener app"
        active="events"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2 items-center justify-between">
          <p className="text-gray-600">
            Published to the public events API (GET /api/v1/events/). Listeners only see events for their
            detected country (by IP) plus worldwide events with no country set. Use <strong>Global (all countries)</strong>{' '}
            on each event unless it should be limited to one country (e.g. Namibia only). Events disappear from the app
            automatically after their end time (or two hours after start if no end is set). Past rows stay here for
            your records until you remove them. Promoter submissions appear as <strong>pending review</strong> until you
            approve them.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPromoterLogins(true)}
              className="px-4 py-2 text-sm font-medium text-violet-800 border border-violet-700 rounded-lg hover:bg-violet-50"
            >
              Promoter logins
            </button>
            <button
              type="button"
              onClick={() => {
                // Drop local draft so Refresh cannot leave stale pending_review over approved rows.
                setEditorRows(null);
                setCustomLocationIds(new Set());
                setFeedback(null);
                void refetch();
              }}
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

        <section className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Event locations (towns &amp; cities)</h2>
          <p className="mt-1 text-sm text-gray-600">
            These names power the <strong>Location</strong> dropdown for each event. Add places here, then pick
            them when editing events (or choose Custom for a one-off venue).
          </p>
          {locationsErrorText ? (
            <p className="mt-2 text-sm text-red-700">{locationsErrorText}</p>
          ) : null}
          {locationsLoading ? (
            <p className="mt-3 text-sm text-gray-500">Loading locations…</p>
          ) : (
            <>
              {presetPlaces.length === 0 ? (
                <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                  No saved places yet. Add towns or cities below so the dropdown is available for events.
                </p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {presetPlaces.map((place) => (
                    <li
                      key={place}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-800"
                    >
                      <span>{place}</span>
                      <button
                        type="button"
                        disabled={saveLocationsMutation.isPending}
                        onClick={() => removePlace(place)}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        aria-label={`Remove ${place}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div className="min-w-[12rem] flex-1">
                  <label htmlFor="new-place" className="block text-xs font-medium text-gray-600 mb-1">
                    Add town or city
                  </label>
                  <input
                    id="new-place"
                    type="text"
                    value={newPlaceInput}
                    onChange={(e) => setNewPlaceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPlaceAndSave();
                      }
                    }}
                    placeholder="e.g. Windhoek"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={addPlaceAndSave}
                  disabled={saveLocationsMutation.isPending || locationsLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saveLocationsMutation.isPending ? "Saving…" : "Add & save"}
                </button>
              </div>
            </>
          )}
        </section>

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
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[12rem]">
                      Image
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">When (label)</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Start (calendar)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      End (optional)
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Doors open
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[9rem]">
                      Ticket URL
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      Country
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Online</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">This week</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={16} className="px-6 py-10 text-center text-gray-600">
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
                      <td className="px-3 py-3 align-top">
                        <div className="flex flex-col gap-2 min-w-[12rem]">
                          <input
                            type="url"
                            placeholder="https://… or upload"
                            value={row.image_url ?? ""}
                            onChange={(e) =>
                              updateRow(row.id, { image_url: e.target.value.trim() || null })
                            }
                            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                          />
                          <label className="text-xs text-gray-600">
                            <span className="sr-only">Upload image file</span>
                            <input
                              type="file"
                              accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                              disabled={uploadingImageId === row.id || saveMutation.isPending}
                              className="block w-full text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-sm"
                              onChange={async (e) => {
                                const input = e.target;
                                const file = input.files?.[0];
                                input.value = "";
                                if (!file) return;
                                setUploadingImageId(row.id);
                                setFeedback(null);
                                try {
                                  const fd = new FormData();
                                  fd.append("image_file", file);
                                  const { data } = await api.post<{ image_url: string }>(
                                    "/events/upload-image",
                                    fd,
                                  );
                                  updateRow(row.id, { image_url: data.image_url });
                                  setFeedback("Image uploaded — click Save events to publish.");
                                } catch (err: unknown) {
                                  if (axios.isAxiosError(err) && err.response?.data?.detail) {
                                    setFeedback(
                                      typeof err.response.data.detail === "string"
                                        ? err.response.data.detail
                                        : "Upload failed.",
                                    );
                                  } else {
                                    setFeedback("Upload failed.");
                                  }
                                } finally {
                                  setUploadingImageId(null);
                                }
                              }}
                            />
                          </label>
                          <p className="text-xs text-gray-500">
                            Flyer recommendation: portrait 2:3 ratio (for example 1200x1800).
                          </p>
                          {uploadingImageId === row.id ? (
                            <span className="text-xs text-indigo-600">Uploading…</span>
                          ) : null}
                          {resolveEventImagePreview(row.image_url) ? (
                            <img
                              src={resolveEventImagePreview(row.image_url) ?? undefined}
                              alt=""
                              className="w-28 mx-auto aspect-[2/3] object-contain rounded border border-gray-200 bg-gray-50"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={row.date_label}
                          onChange={(e) => updateRow(row.id, { date_label: e.target.value })}
                          className="w-48 min-w-[12rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="datetime-local"
                          value={isoToDatetimeLocal(row.starts_at)}
                          onChange={(e) =>
                            updateRow(row.id, { starts_at: datetimeLocalToIso(e.target.value) })
                          }
                          className="min-w-[11rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                          title="Used for Google Calendar and .ics in the listener app"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="datetime-local"
                          value={isoToDatetimeLocal(row.ends_at)}
                          onChange={(e) =>
                            updateRow(row.id, { ends_at: datetimeLocalToIso(e.target.value) })
                          }
                          className="min-w-[11rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                          title="Leave empty for a 2-hour default length"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="datetime-local"
                          value={isoToDatetimeLocal(row.doors_at)}
                          onChange={(e) =>
                            updateRow(row.id, { doors_at: datetimeLocalToIso(e.target.value) })
                          }
                          className="min-w-[11rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                          title="Optional — shown as Doors in the listener app"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="url"
                          placeholder="https://…"
                          value={row.ticket_url ?? ""}
                          onChange={(e) =>
                            updateRow(row.id, { ticket_url: e.target.value.trim() || null })
                          }
                          className="w-44 min-w-[11rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <input
                          type="text"
                          placeholder="e.g. N$150 or Free"
                          value={row.ticket_price ?? ""}
                          onChange={(e) =>
                            updateRow(row.id, { ticket_price: e.target.value.trim() || null })
                          }
                          className="w-28 min-w-[7rem] rounded-lg border border-gray-300 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        {(() => {
                          const inList = placeIsInPresetList(row.location, presetPlaces);
                          const selectValue = customLocationIds.has(row.id)
                            ? CUSTOM_LOCATION
                            : locationSelectValue(row.location, presetPlaces);
                          const showCustomInput =
                            customLocationIds.has(row.id) || selectValue === CUSTOM_LOCATION;
                          return (
                            <div className="flex flex-col gap-1.5 min-w-[11rem]">
                              <select
                                value={selectValue}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "") {
                                    setRowCustomLocation(row.id, false);
                                    updateRow(row.id, { location: "" });
                                    return;
                                  }
                                  if (v === CUSTOM_LOCATION) {
                                    setRowCustomLocation(row.id, true);
                                    updateRow(row.id, {
                                      location: inList ? "" : row.location,
                                    });
                                    return;
                                  }
                                  setRowCustomLocation(row.id, false);
                                  updateRow(row.id, { location: v });
                                }}
                                className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                                aria-label="Event location preset"
                              >
                                <option value="">— Select —</option>
                                {sortedPresetPlaces.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                                <option value={CUSTOM_LOCATION}>Custom…</option>
                              </select>
                              {showCustomInput && (
                                <input
                                  type="text"
                                  value={row.location}
                                  onChange={(e) => updateRow(row.id, { location: e.target.value })}
                                  placeholder="Venue or one-off location"
                                  className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                                />
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 align-top min-w-[11rem]">
                        <CountryPicker
                          mode="single"
                          compact
                          value={row.country_code ?? null}
                          onChange={(code) => updateRow(row.id, { country_code: code })}
                          hint="Germany = DE, Greece = GR"
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
                      <td className="px-3 py-3 align-top whitespace-nowrap">
                        {(row.review_status ?? "published") === "pending_review" ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              pending
                            </span>
                            <button
                              type="button"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate(row.id)}
                              className="block text-xs font-medium text-emerald-700 hover:text-emerald-900"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">published</span>
                        )}
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

      {showPromoterLogins ? <PromoterLoginsModal onClose={() => setShowPromoterLogins(false)} /> : null}
    </div>
  );
}

interface PromoterUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

function PromoterLoginsModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<PromoterUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["promoter-portal-users"],
    queryFn: async () => {
      const response = await api.get<PromoterUser[]>("/auth/promoter-users");
      return response.data;
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Promoter portal logins</h2>
            <p className="text-sm text-gray-600">Event promoters submit listings at /portal/events after login.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditUser(null);
            }}
            className="text-sm font-medium text-white bg-violet-700 px-3 py-2 rounded-lg hover:bg-violet-800"
          >
            New login
          </button>
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-600">No promoter logins yet.</p>
        ) : (
          <table className="min-w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 border-b">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4">{u.full_name}</td>
                  <td className="py-3 pr-4">{u.is_active ? "active" : "inactive"}</td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="text-indigo-600 font-medium"
                      onClick={() => {
                        setEditUser(u);
                        setCreating(false);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
          Close
        </button>
        {creating || editUser ? (
          <PromoterLoginForm
            user={editUser}
            onDone={() => {
              setCreating(false);
              setEditUser(null);
              void queryClient.invalidateQueries({ queryKey: ["promoter-portal-users"] });
            }}
            onCancel={() => {
              setCreating(false);
              setEditUser(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function PromoterLoginForm({
  user,
  onDone,
  onCancel,
}: {
  user: PromoterUser | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(user);
  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEdit && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (isEdit && user) {
        const body: { full_name: string; is_active: boolean; password?: string } = {
          full_name: fullName,
          is_active: isActive,
        };
        if (password.trim()) body.password = password;
        await api.patch(`/auth/promoter-users/${user.id}`, body);
      } else {
        await api.post("/auth/promoter-users", { email, full_name: fullName, password });
      }
      onDone();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 border-t pt-4 space-y-3">
      <h3 className="font-semibold text-gray-900">{isEdit ? "Edit login" : "Create login"}</h3>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <input
        type="email"
        required
        readOnly={isEdit}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="text"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Display name"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        type="password"
        required={!isEdit}
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={isEdit ? "New password (optional)" : "Temporary password"}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      {isEdit ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Account active
        </label>
      ) : null}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm border rounded-lg">
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
