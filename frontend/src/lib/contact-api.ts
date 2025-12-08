import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export interface ContactMessageRequest {
  email: string;
  category: 'abuse' | 'account' | 'billing' | 'feedback';
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
  status: string;
}

// Submit a contact message
export const submitContactMessage = async (data: ContactMessageRequest): Promise<ContactMessageResponse> => {
  const response = await axios.post(`${API_BASE_URL}/contact`, data, {
    withCredentials: true,
  });
  return response.data;
};
