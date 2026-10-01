import api from './axios';

/**
 * Create or upsert an RSVP for an event
 */
export const createRsvp = async (eventId, status = 'interested') => {
  const response = await api.post('/rsvps', { eventId, status });
  return response.data;
};

/**
 * Update RSVP status ('interested' <-> 'confirmed')
 */
export const updateRsvpStatus = async (eventId, status) => {
  const response = await api.patch(`/rsvps/${eventId}`, { status });
  return response.data;
};

/**
 * Remove / cancel an RSVP
 */
export const deleteRsvp = async (eventId) => {
  const response = await api.delete(`/rsvps/${eventId}`);
  return response.data;
};

/**
 * Get user's RSVPs (filtered by status or when)
 */
export const getRsvps = async (params = {}) => {
  const response = await api.get('/rsvps', { params });
  return response.data;
};
