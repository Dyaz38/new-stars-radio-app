import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { CountryPicker } from "../components/CountryPicker";

interface StationEvent {
  id: number;
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  description: string;
  starts_at?: string | null;
  ends_at?: string | null;
  doors_at?: string | null;
  ticket_url?: string | null;
  ticket_price?: string | null;
  image_url?: string | null;
  country_code?: string | null;
  review_status: "published" | "pending_review";
}

interface EventForm {
  title: string;
  date_label: string;
  location: string;
  is_online: boolean;
  description: string;
  starts_at: string;
  ends_at: string;
  doors_at: string;
  ticket_url: string;
  ticket_price: string;
  image_url: string;
  country_code: string | null;
}

const EMPTY_FORM: EventForm = {
  title: "",
  date_label: "",
  location: "",
  is_online: false,
  description: "",
  starts_at: "",
  ends_at: "",
  doors_at: "",
  ticket_url: "",
  ticket_price: "",
  image_url: "",
  country_code: null,
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

function eventToForm(e: StationEvent): EventForm {
  return {
    title: e.title,
    date_label: e.date_label,
    location: e.location,
    is_online: e.is_online,
    description: e.description,
    starts_at: isoToDatetimeLocal(e.starts_at),
    ends_at: isoToDatetimeLocal(e.ends_at),
    doors_at: isoToDatetimeLocal(e.doors_at),
    ticket_url: e.ticket_url ?? "",
    ticket_price: e.ticket_price ?? "",
    image_url: e.image_url ?? "",
    country_code: e.country_code ?? null,
  };
}

function payloadFromForm(form: EventForm) {
  return {
    title: form.title.trim(),
    date_label: form.date_label.trim(),
    location: form.location.trim(),
    is_online: form.is_online,
    description: form.description.trim(),
    starts_at: datetimeLocalToIso(form.starts_at),
    ends_at: datetimeLocalToIso(form.ends_at),
    doors_at: datetimeLocalToIso(form.doors_at),
    ticket_url: form.ticket_url.trim() || null,
    ticket_price: form.ticket_price.trim() || null,
    image_url: form.image_url.trim() || null,
    country_code: form.country_code,
  };
}

export default function PromoterPortalPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["promoter-portal-events"],
    queryFn: async () => {
      const { data } = await api.get<{ items: StationEvent[] }>("/promoter-portal/events");
      return data.items;
    },
  });

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.id - a.id),
    [events],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = payloadFromForm(form);
      if (editingId) {
        return api.put(`/promoter-portal/events/${editingId}`, body);
      }
      return api.post("/promoter-portal/events", body);
    },
    onSuccess: () => {
      setFeedback(
        "Submitted for review — New Stars Radio will publish it in the app when approved.",
      );
      setForm(EMPTY_FORM);
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["promoter-portal-events"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setFeedback(e.response?.data?.detail || "Could not save. Check required fields.");
    },
  });

  const uploadPoster = async (file: File) => {
    setUploading(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append("image_file", file);
      const { data } = await api.post<{ image_url: string }>("/promoter-portal/upload-image", fd);
      setForm((f) => ({ ...f, image_url: data.image_url }));
    } catch {
      setFeedback("Poster upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Promoter portal</p>
            <h1 className="text-xl font-bold text-gray-900">{user?.full_name || "Your events"}</h1>
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-4">
          Submit gigs and listings for the New Stars Radio app. Listings stay{" "}
          <strong>pending review</strong> until our team approves them. Questions?{" "}
          <a href="mailto:sales@newstarsradio.com" className="text-indigo-600 underline">
            sales@newstarsradio.com
          </a>
        </p>

        {feedback ? (
          <div
            className={`p-4 rounded-lg text-sm border ${
              feedback.includes("failed") || feedback.includes("Could not")
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            {feedback}
          </div>
        ) : null}

        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? `Edit event #${editingId}` : "New event listing"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">When (display label)</span>
              <input
                required
                placeholder="Sat, 15 Nov — 8:00 PM"
                value={form.date_label}
                onChange={(e) => setForm({ ...form, date_label: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Start (calendar)</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">End (optional)</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Doors open</span>
              <input
                type="datetime-local"
                value={form.doors_at}
                onChange={(e) => setForm({ ...form, doors_at: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Location</span>
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_online}
                onChange={(e) => setForm({ ...form, is_online: e.target.checked })}
              />
              Online event
            </label>
            <div className="sm:col-span-2">
              <CountryPicker
                mode="single"
                value={form.country_code}
                onChange={(code) => setForm({ ...form, country_code: code })}
                hint="Leave worldwide empty, or pick a country to limit visibility."
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ticket URL</span>
              <input
                type="url"
                value={form.ticket_url}
                onChange={(e) => setForm({ ...form, ticket_url: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Ticket price</span>
              <input
                value={form.ticket_price}
                onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
                placeholder="From R150"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Poster image</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPoster(f);
                }}
                className="mt-1 block w-full text-sm"
              />
              {form.image_url ? (
                <p className="mt-1 text-xs text-green-700 truncate">Uploaded: {form.image_url}</p>
              ) : null}
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMutation.isPending || !form.title.trim() || !form.date_label.trim()}
              onClick={() => {
                setFeedback(null);
                saveMutation.mutate();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Submit changes" : "Submit for review"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your listings</h2>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-gray-600">No submissions yet.</p>
          ) : (
            <ul className="space-y-3">
              {sorted.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-sm text-gray-600">{e.date_label}</p>
                    <span
                      className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        e.review_status === "pending_review"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-green-100 text-green-900"
                      }`}
                    >
                      {e.review_status === "pending_review" ? "pending review" : "live in app"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(e.id);
                      setForm(eventToForm(e));
                      setFeedback(null);
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 self-start"
                  >
                    Edit
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
