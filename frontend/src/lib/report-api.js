import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
// Submit a report
export const submitReport = async (data) => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/reports`, data, {
        withCredentials: true,
    });
    return response.data;
};
// List reports (admin only)
export const listReports = async (page = 1, limit = 20, status, type) => {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    });
    if (status)
        params.append('status', status);
    if (type)
        params.append('type', type);
    const response = await axios.get(`${API_BASE_URL}/api/v1/admin/reports?${params}`, {
        withCredentials: true,
    });
    return response.data;
};
// Get report details (admin only)
export const getReport = async (reportId) => {
    const response = await axios.get(`${API_BASE_URL}/api/v1/admin/reports/${reportId}`, {
        withCredentials: true,
    });
    return response.data;
};
// Update report (admin only)
export const updateReport = async (reportId, data) => {
    const response = await axios.put(`${API_BASE_URL}/api/v1/admin/reports/${reportId}`, data, {
        withCredentials: true,
    });
    return response.data;
};
