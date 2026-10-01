import api from './axios';

/**
 * Fetch chat message history for current user
 */
export const getChatHistory = async () => {
  const response = await api.get('/chat/history');
  return response.data;
};
