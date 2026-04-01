import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { AdminHeader } from "../components/AdminHeader";

interface SongCatalogRow {
  song_key: string;
  artist: string;
  title: string;
  genre: string | null;
  like_events: number;
  unlike_events: number;
  net_score: number;
  last_event_at: string | null;
}

interface SongCatalogResponse {
  items: SongCatalogRow[];
  total_songs: number;
  offset: number;
  limit: number;
}

interface SongCatalogClearResponse {
  deleted_rows: number;
  ok: boolean;
}

const PAGE_SIZE = 100;

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(rows: SongCatalogRow[], filename: string) {
  const headers = [
    "Artist",
    "Title",
    "Genre",
    "Song key",
    "Like events",
    "Unlike events",
    "Net score",
    "Last activity (UTC)",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        escapeCsvCell(r.artist),
        escapeCsvCell(r.title),
        escapeCsvCell(r.genre ?? ""),
        escapeCsvCell(r.song_key),
        String(r.like_events),
        String(r.unlike_events),
        String(r.net_score),
        escapeCsvCell(r.last_event_at ? new Date(r.last_event_at).toISOString() : ""),
      ].join(",")
    ),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SongLikesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [clearFeedback, setClearFeedback] = useState<string | null>(null);

  const offset = page * PAGE_SIZE;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["song-likes-catalog", offset],
    queryFn: async () => {
      const response = await api.get<SongCatalogResponse>(
        `/likes/catalog?limit=${PAGE_SIZE}&offset=${offset}`
      );
      return response.data;
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total_songs / PAGE_SIZE)) : 1;

  const clearCatalogMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete<SongCatalogClearResponse>("/likes/catalog");
      return response.data;
    },
    onSuccess: (res) => {
      setPage(0);
      setClearFeedback(`Cleared ${res.deleted_rows.toLocaleString()} stored like/unlike events.`);
      void queryClient.invalidateQueries({ queryKey: ["song-likes-catalog"] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setClearFeedback(e.response?.data?.detail || "Failed to clear catalog.");
    },
  });

  const handleClearAll = () => {
    if (!data?.total_songs) return;
    const ok = window.confirm(
      "Delete ALL song like data?\n\nThis removes every stored like/unlike event from the database. The Song Likes list will be empty. This cannot be undone."
    );
    if (!ok) return;
    setClearFeedback(null);
    clearCatalogMutation.mutate();
  };

  const exportAll = async () => {
    const limit = 500;
    let offset = 0;
    const all: SongCatalogRow[] = [];
    for (;;) {
      const res = await api.get<SongCatalogResponse>(`/likes/catalog?limit=${limit}&offset=${offset}`);
      const batch = res.data.items;
      all.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(all, `new-stars-radio-song-likes-${stamp}.csv`);
  };

  const errorMessage = useMemo(() => {
    if (!error) return null;
    const e = error as { response?: { data?: { detail?: string }; status?: number } };
    return e.response?.data?.detail || `Request failed (${e.response?.status || "error"})`;
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader
        title="Song Likes"
        subtitle="Listener hearts from the radio app (catalog)"
        active="song-likes"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <p className="text-gray-600">
            Each row is one song. <strong>Like events</strong> is how many times listeners tapped
            like. Data comes from your database.
          </p>
          <div className="flex flex-wrap gap-2">
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
              onClick={() => void exportAll()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Export all (CSV)
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={
                !data?.total_songs ||
                clearCatalogMutation.isPending ||
                isFetching
              }
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {clearCatalogMutation.isPending ? "Clearing…" : "Clear all song likes"}
            </button>
          </div>
        </div>

        {clearFeedback && (
          <div
            className={`mb-4 p-4 rounded-lg text-sm ${
              clearFeedback.startsWith("Cleared")
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {clearFeedback}
            <button
              type="button"
              className="ml-3 underline font-medium"
              onClick={() => setClearFeedback(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMessage}
            {String((error as Error)?.message || "").includes("401") && (
              <span> Try logging in again.</span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading song likes…</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-3 border-b border-gray-200 text-sm text-gray-500">
                {data ? (
                  <>
                    Showing {data.items.length} of {data.total_songs} songs (page {page + 1} of{" "}
                    {totalPages})
                  </>
                ) : (
                  "No data"
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Artist
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Genre
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Like events
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unlike events
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.items && data.items.length > 0 ? (
                      data.items.map((row) => (
                        <tr key={row.song_key} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap max-w-[200px] truncate" title={row.artist}>
                            {row.artist}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={row.title}>
                            {row.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate" title={row.genre ?? ""}>
                            {row.genre ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                            {row.like_events.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {row.unlike_events.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span
                              className={
                                row.net_score > 0
                                  ? "text-green-700 font-medium"
                                  : row.net_score < 0
                                  ? "text-red-600"
                                  : "text-gray-600"
                              }
                            >
                              {row.net_score.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {row.last_event_at
                              ? new Date(row.last_event_at).toLocaleString()
                              : "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No likes recorded yet. When listeners tap ❤️ on the radio app (after deploy +
                          migration), counts appear here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {data && data.total_songs > PAGE_SIZE && (
              <div className="mt-6 flex justify-center items-center gap-4">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
