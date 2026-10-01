const ticketmasterService = require('./ticketmasterService');
const Rsvp = require('../models/Rsvp');
const shareService = require('./shareService');

/**
 * Service to retrieve paginated event feeds with user's RSVP status & friendsAttending attached
 */
const getEventsList = async ({ queryParams, userId = null }) => {
  const result = await ticketmasterService.fetchEventsFromTicketmaster(queryParams);

  let userRsvpMap = {};
  let friendsMap = {};

  if (userId) {
    const eventIds = result.events.map((e) => e.eventId);
    
    // Fetch RSVPs
    const rsvps = await Rsvp.find({ user: userId, eventId: { $in: eventIds } }).lean();
    rsvps.forEach((r) => {
      userRsvpMap[r.eventId] = r.status;
    });

    // Fetch Friends Attending Counts
    friendsMap = await shareService.getFriendsAttendingMap({ userId, eventIds });
  }

  const enrichedEvents = result.events.map((event) => ({
    ...event,
    rsvpStatus: userRsvpMap[event.eventId] || null,
    friendsAttending: friendsMap[event.eventId] || 0,
  }));

  return {
    events: enrichedEvents,
    pagination: result.pagination,
    source: result.source,
  };
};

/**
 * Service to aggregate event counts per day for a specific month (YYYY-MM)
 */
const getCalendarCounts = async ({ month, city, category, userId = null }) => {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const error = new Error('Invalid month format. Expected YYYY-MM');
    error.statusCode = 400;
    throw error;
  }

  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const startDateStr = `${month}-01`;
  const endDateStr = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const feedResult = await ticketmasterService.fetchEventsFromTicketmaster({
    city,
    category,
    startDateTime: `${startDateStr}T00:00:00Z`,
    endDateTime: `${endDateStr}T23:59:59Z`,
    size: 100,
  });

  const dateCountsMap = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${month}-${String(day).padStart(2, '0')}`;
    dateCountsMap[dateKey] = 0;
  }

  feedResult.events.forEach((event) => {
    if (event.date && dateCountsMap[event.date] !== undefined) {
      dateCountsMap[event.date] += 1;
    }
  });

  const calendarData = Object.keys(dateCountsMap)
    .sort()
    .map((date) => ({
      date,
      count: dateCountsMap[date],
    }));

  return {
    month,
    totalDays: daysInMonth,
    calendar: calendarData,
  };
};

/**
 * Service to retrieve a single event detail by ID with RSVP status & friendsAttending attached
 */
const getSingleEventDetail = async ({ eventId, userId = null }) => {
  const event = await ticketmasterService.fetchEventById(eventId);

  if (!event) {
    const error = new Error(`Event with ID '${eventId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  let rsvpStatus = null;
  let friendsAttending = 0;

  if (userId) {
    const rsvp = await Rsvp.findOne({ user: userId, eventId }).lean();
    if (rsvp) rsvpStatus = rsvp.status;

    friendsAttending = await shareService.getFriendsAttendingCount({ userId, eventId });
  }

  return {
    ...event,
    rsvpStatus,
    friendsAttending,
  };
};

module.exports = {
  getEventsList,
  getCalendarCounts,
  getSingleEventDetail,
};
