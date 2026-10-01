const fs = require('fs');
const path = require('path');
const eventCache = require('../utils/cache');

// Path to static seed events JSON
const SEED_EVENTS_PATH = path.join(__dirname, '../data/seedEvents.json');

/**
 * Format dynamic dates for seed events relative to current date
 */
const getSeedEventsWithDynamicDates = () => {
  try {
    const rawData = fs.readFileSync(SEED_EVENTS_PATH, 'utf-8');
    const seedData = JSON.parse(rawData);

    const now = new Date();
    
    return seedData.map((event) => {
      const eventDate = new Date(now);
      eventDate.setDate(now.getDate() + (event.dayOffset || 0));

      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, '0');
      const day = String(eventDate.getDate()).padStart(2, '0');

      return {
        eventId: event.eventId,
        title: event.title,
        venue: event.venue,
        city: event.city,
        countryCode: event.countryCode || 'US',
        date: `${year}-${month}-${day}`,
        time: event.time,
        imageUrl: event.imageUrl,
        url: event.url,
        category: event.category,
        source: 'local_seed',
      };
    });
  } catch (error) {
    console.error('Error loading seed events:', error.message);
    return [];
  }
};

/**
 * Filter and paginate seed events when API fails or returns no results
 */
const getFilteredSeedEvents = ({ keyword, city, date, category, page = 1, size = 20 }) => {
  let events = getSeedEventsWithDynamicDates();

  if (keyword) {
    const kw = keyword.toLowerCase();
    events = events.filter(
      (e) =>
        e.title.toLowerCase().includes(kw) ||
        e.venue.toLowerCase().includes(kw) ||
        e.category.toLowerCase().includes(kw)
    );
  }

  if (city) {
    const c = city.toLowerCase();
    events = events.filter((e) => e.city.toLowerCase().includes(c));
  }

  if (date) {
    events = events.filter((e) => e.date === date);
  }

  if (category && category !== 'All') {
    const cat = category.toLowerCase();
    events = events.filter((e) => e.category.toLowerCase() === cat);
  }

  const pageNum = parseInt(page, 10) || 1;
  const sizeNum = parseInt(size, 10) || 20;
  const total = events.length;
  const totalPages = Math.ceil(total / sizeNum) || 1;

  const startIndex = (pageNum - 1) * sizeNum;
  const paginatedEvents = events.slice(startIndex, startIndex + sizeNum);

  return {
    events: paginatedEvents,
    pagination: {
      page: pageNum,
      size: sizeNum,
      total,
      totalPages,
    },
    source: 'local_seed_fallback',
  };
};

/**
 * Normalize raw Ticketmaster API event objects
 */
const normalizeTicketmasterEvent = (item) => {
  const venueObj = item._embedded?.venues?.[0];
  const imageObj = item.images?.find((img) => img.width >= 500) || item.images?.[0];

  return {
    eventId: item.id,
    title: item.name || 'Untitled Event',
    venue: venueObj?.name || 'Venue TBD',
    city: venueObj?.city?.name || 'Unknown City',
    countryCode: venueObj?.country?.countryCode || 'US',
    date: item.dates?.start?.localDate || '',
    time: item.dates?.start?.localTime ? item.dates.start.localTime.substring(0, 5) : '19:00',
    imageUrl: imageObj?.url || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800',
    url: item.url || '',
    category: item.classifications?.[0]?.segment?.name || 'General',
    source: 'ticketmaster',
  };
};

/**
 * Fetch events from Ticketmaster API with 5-minute in-memory caching & fallback
 */
const fetchEventsFromTicketmaster = async (queryParams) => {
  const { keyword, city, countryCode = 'US', date, category, page = 1, size = 20 } = queryParams;

  const apiKey = process.env.TICKETMASTER_API_KEY;

  // If API key is missing or default placeholder, immediately return seed events
  if (!apiKey || apiKey === 'your_ticketmaster_api_key_here') {
    return getFilteredSeedEvents({ keyword, city, date, category, page, size });
  }

  // Construct cache key
  const cacheKey = `tm_events_${JSON.stringify(queryParams)}`;
  const cachedData = eventCache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const pageZeroBased = Math.max(0, parseInt(page, 10) - 1);
    const tmUrl = new URL('https://app.ticketmaster.com/discovery/v2/events.json');

    tmUrl.searchParams.append('apikey', apiKey);
    tmUrl.searchParams.append('page', pageZeroBased.toString());
    tmUrl.searchParams.append('size', size.toString());
    tmUrl.searchParams.append('countryCode', countryCode);

    if (keyword) tmUrl.searchParams.append('keyword', keyword);
    if (city) tmUrl.searchParams.append('city', city);
    if (category && category !== 'All') tmUrl.searchParams.append('classificationName', category);

    if (date) {
      tmUrl.searchParams.append('startDateTime', `${date}T00:00:00Z`);
      tmUrl.searchParams.append('endDateTime', `${date}T23:59:59Z`);
    }

    const response = await fetch(tmUrl.toString());

    if (!response.ok) {
      console.warn(`Ticketmaster API returned status ${response.status}. Falling back to seed events.`);
      return getFilteredSeedEvents({ keyword, city, date, category, page, size });
    }

    const json = await response.json();
    const rawEvents = json._embedded?.events || [];

    if (rawEvents.length === 0) {
      // Fallback to seed events if API returns 0 results
      return getFilteredSeedEvents({ keyword, city, date, category, page, size });
    }

    const normalizedEvents = rawEvents.map(normalizeTicketmasterEvent);
    const pageInfo = json.page || {};

    const result = {
      events: normalizedEvents,
      pagination: {
        page: (pageInfo.number || 0) + 1,
        size: pageInfo.size || 20,
        total: pageInfo.totalElements || normalizedEvents.length,
        totalPages: pageInfo.totalPages || 1,
      },
      source: 'ticketmaster',
    };

    // Store in 5-minute cache
    eventCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Ticketmaster API fetch error:', error.message);
    return getFilteredSeedEvents({ keyword, city, date, category, page, size });
  }
};

/**
 * Fetch single event details by eventId
 */
const fetchEventById = async (eventId) => {
  // First check if it's a seed event ID
  const seedEvents = getSeedEventsWithDynamicDates();
  const seedMatch = seedEvents.find((e) => e.eventId === eventId);
  if (seedMatch) return seedMatch;

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey || apiKey === 'your_ticketmaster_api_key_here') {
    return null;
  }

  const cacheKey = `tm_event_detail_${eventId}`;
  const cachedEvent = eventCache.get(cacheKey);
  if (cachedEvent) return cachedEvent;

  try {
    const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${apiKey}`;
    const response = await fetch(tmUrl);
    if (!response.ok) return null;

    const json = await response.json();
    const normalized = normalizeTicketmasterEvent(json);

    eventCache.set(cacheKey, normalized);
    return normalized;
  } catch (error) {
    console.error(`Error fetching event by ID ${eventId}:`, error.message);
    return null;
  }
};

module.exports = {
  fetchEventsFromTicketmaster,
  fetchEventById,
  getSeedEventsWithDynamicDates,
  getFilteredSeedEvents,
};
