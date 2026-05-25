import axios from "axios";
import api, { normalizeApiBaseUrl } from "./api";

export interface CampaignReportDetail {
  campaign_id: string;
  campaign_name: string;
  advertiser_name: string;
  status: string;
  campaign_start_date: string;
  campaign_end_date: string;
  impressions: number;
  clicks: number;
  click_through_rate: number;
  impressions_served: number;
  budget_remaining: number;
  budget_utilized_percentage: number;
  report_period_start?: string | null;
  report_period_end?: string | null;
  generated_at: string;
  creatives: {
    creative_id: string;
    creative_name: string;
    impressions: number;
    clicks: number;
    click_through_rate: number;
  }[];
}

export interface CampaignStatsRow {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  click_through_rate: number;
  impressions_served: number;
  budget_remaining: number;
  budget_utilized_percentage: number;
}

function dateQuery(startDate: string, endDate: string): string {
  const params = new URLSearchParams();
  if (startDate.trim()) params.set("start_date", new Date(startDate).toISOString());
  if (endDate.trim()) params.set("end_date", new Date(endDate).toISOString());
  const q = params.toString();
  return q ? `?${q}` : "";
}

export async function downloadCampaignsCsv(startDate = "", endDate = ""): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const base = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
  const response = await axios.get(`${base}/reports/campaigns/export.csv${dateQuery(startDate, endDate)}`, {
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  triggerBlobDownload(response.data, `campaigns-report-${todayStamp()}.csv`);
}

export async function downloadCampaignCsv(
  campaignId: string,
  campaignName: string,
  startDate = "",
  endDate = "",
): Promise<void> {
  const token = localStorage.getItem("auth_token");
  const base = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
  const response = await axios.get(
    `${base}/reports/campaigns/${campaignId}/export.csv${dateQuery(startDate, endDate)}`,
    {
      responseType: "blob",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  const safe = campaignName.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40);
  triggerBlobDownload(response.data, `report-${safe}-${todayStamp()}.csv`);
}

export async function createCampaignShareLink(
  campaignId: string,
  daysValid = 30,
): Promise<{ token: string; expires_at: string; days_valid: number }> {
  const response = await api.post(`/reports/campaigns/${campaignId}/share`, null, {
    params: { days_valid: daysValid },
  });
  return response.data;
}

export async function fetchSharedCampaignReport(token: string): Promise<CampaignReportDetail> {
  const base = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL as string | undefined);
  const response = await axios.get(`${base}/reports/share`, {
    params: { token },
  });
  return response.data;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

export function buildShareReportUrl(token: string): string {
  return `${window.location.origin}/report?token=${encodeURIComponent(token)}`;
}
