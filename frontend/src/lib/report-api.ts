import axios from 'axios';
import type { CreateReportRequest, UpdateReportRequest, Report, ReportWithDetails, ReportListResponse } from '../types/report';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Submit a report
export const submitReport = async (data: CreateReportRequest): Promise<{ message: string; report: Report }> => {
  const response = await axios.post(`${API_BASE_URL}/reports`, data, {
    withCredentials: true,
  });
  return response.data;
};

// List reports (admin only)
export const listReports = async (
  page: number = 1,
  limit: number = 20,
  status?: string,
  type?: string
): Promise<ReportListResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (status) params.append('status', status);
  if (type) params.append('type', type);

  const response = await axios.get(`${API_BASE_URL}/admin/reports?${params}`, {
    withCredentials: true,
  });
  return response.data;
};

// Get report details (admin only)
export const getReport = async (reportId: string): Promise<ReportWithDetails> => {
  const response = await axios.get(`${API_BASE_URL}/admin/reports/${reportId}`, {
    withCredentials: true,
  });
  return response.data;
};

// Update report (admin only)
export const updateReport = async (reportId: string, data: UpdateReportRequest): Promise<{ message: string }> => {
  const response = await axios.put(`${API_BASE_URL}/admin/reports/${reportId}`, data, {
    withCredentials: true,
  });
  return response.data;
};
