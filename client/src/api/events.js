import api from './axios';

/**
 * Fetch paginated event feed with search/filter parameters
 */
export const getEvents = async (params = {}) => {
  const response = await api.get('/events', { params });
  return response.data;
};

/**
 * Fetch monthly event counts for calendar view
 */
export const getCalendarEvents = async (params = {}) => {
  const response = await api.get('/events/calendar', { params });
  return response.data;
};

/**
 * Fetch single event details by event ID
 */
export const getEventById = async (eventId) => {
  const response = await api.get(`/events/${eventId}`);
  return response.data;
};
