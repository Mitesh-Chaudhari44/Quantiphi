import api from './axios';

/**
 * Generate share link for an event (requires active RSVP)
 */
export const createShareLink = async (eventId) => {
  const response = await api.post(`/events/${eventId}/share`);
  return response.data;
};

/**
 * Get count of friends attending an event
 */
export const getFriendsCount = async (eventId) => {
  const response = await api.get(`/events/${eventId}/friends`);
  return response.data;
};
