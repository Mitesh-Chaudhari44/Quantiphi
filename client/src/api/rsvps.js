import api from './axios';

export const createRsvp = async (eventId, status = 'interested') => {
  const response = await api.post('/rsvps', { eventId, status });
  return response.data;
};

export const updateRsvpStatus = async (eventId, status) => {
  const response = await api.patch(`/rsvps/${eventId}`, { status });
  return response.data;
};

/**
 * Update per-event reminder settings ({ enabled, remindBeforeMinutes })
 */
export const updateRsvpReminder = async (eventId, { enabled, remindBeforeMinutes }) => {
  const response = await api.patch(`/rsvps/${eventId}/reminder`, { enabled, remindBeforeMinutes });
  return response.data;
};

export const deleteRsvp = async (eventId) => {
  const response = await api.delete(`/rsvps/${eventId}`);
  return response.data;
};

export const getRsvps = async (params = {}) => {
  const response = await api.get('/rsvps', { params });
  return response.data;
};
