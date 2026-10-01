const eventService = require('./eventService');
const rsvpService = require('./rsvpService');
const shareService = require('./shareService');

// In-memory cache to remember last search results per user for numbered commands like "rsvp 2"
const userSearchResultsMap = new Map();

/**
 * Helper to calculate date string for natural language phrases
 */
const resolveNaturalDate = (phrase) => {
  const now = new Date();
  const lower = phrase.toLowerCase();

  if (lower.includes('today')) {
    return now.toISOString().split('T')[0];
  }
  if (lower.includes('tomorrow')) {
    const tom = new Date(now);
    tom.setDate(now.getDate() + 1);
    return tom.toISOString().split('T')[0];
  }
  if (lower.includes('weekend') || lower.includes('this weekend')) {
    const day = now.getDay();
    const distToSat = (6 - day + 7) % 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() + distToSat);
    return sat.toISOString().split('T')[0];
  }
  return null;
};

/**
 * Rule-based intent parser (Regex & Natural Keyword Extraction)
 */
const parseIntentRuleBased = (text) => {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. HELP
  if (/^(help|commands|what can you do|\?)$/i.test(lower)) {
    return { intent: 'HELP', entities: {} };
  }

  // 2. LIST_RSVPS
  if (/(my rsvps|saved events|my schedule|what am i attending|show my rsvps)/i.test(lower)) {
    return { intent: 'LIST_RSVPS', entities: {} };
  }

  // 3. RSVP_EVENT (e.g. "rsvp 1", "interested in 2", "confirm 1")
  const rsvpMatch = lower.match(/(?:rsvp|interested in|confirm)\s+(?:event\s+)?#?(\d+)/i);
  if (rsvpMatch) {
    const index = parseInt(rsvpMatch[1], 10) - 1;
    const status = lower.includes('confirm') ? 'confirmed' : 'interested';
    return { intent: 'RSVP_EVENT', entities: { index, status } };
  }

  // 4. CANCEL_RSVP (e.g. "cancel 2", "delete rsvp 1")
  const cancelMatch = lower.match(/(?:cancel|remove|delete)\s+(?:rsvp\s+)?#?(\d+)/i);
  if (cancelMatch) {
    const index = parseInt(cancelMatch[1], 10) - 1;
    return { intent: 'CANCEL_RSVP', entities: { index } };
  }

  // 5. SHARE_LINK (e.g. "share 1", "get share link for 2")
  const shareMatch = lower.match(/(?:share|invite|link)\s+(?:event\s+)?#?(\d+)/i);
  if (shareMatch) {
    const index = parseInt(shareMatch[1], 10) - 1;
    return { intent: 'SHARE_LINK', entities: { index } };
  }

  // 6. SET_REMINDER (e.g. "remind me 1 hour before", "set reminder 30 minutes for 1")
  const remindMatch = lower.match(/(?:remind|reminder)\s+(?:me\s+)?(\d+)\s*(min|minute|hour|hr|day)/i);
  if (remindMatch) {
    let value = parseInt(remindMatch[1], 10);
    const unit = remindMatch[2];
    if (unit.startsWith('hr') || unit.startsWith('hour')) value *= 60;
    if (unit.startsWith('day')) value *= 1440;

    const eventIndexMatch = lower.match(/for\s+#?(\d+)/i);
    const index = eventIndexMatch ? parseInt(eventIndexMatch[1], 10) - 1 : 0;

    return { intent: 'SET_REMINDER', entities: { remindBeforeMinutes: value, index } };
  }

  // 7. FRIENDS_ATTENDING
  if (/(friends attending|who is attending|how many friends)/i.test(lower)) {
    const eventIndexMatch = lower.match(/for\s+#?(\d+)/i);
    const index = eventIndexMatch ? parseInt(eventIndexMatch[1], 10) - 1 : 0;
    return { intent: 'FRIENDS_ATTENDING', entities: { index } };
  }

  // 8. SEARCH_EVENTS
  if (/(find|search|show|get|list|events|concert|music|sports|tech|food)/i.test(lower)) {
    let city = null;
    const cityMatch = lower.match(/in\s+([a-z\s]+?)(?=\s+for|\s+on|\s+this|\s+$)/i);
    if (cityMatch) city = cityMatch[1].trim();

    let category = null;
    if (lower.includes('music') || lower.includes('concert')) category = 'Music';
    if (lower.includes('sport') || lower.includes('game')) category = 'Sports';
    if (lower.includes('tech') || lower.includes('ai')) category = 'Technology';
    if (lower.includes('food') || lower.includes('drink')) category = 'Food & Drink';
    if (lower.includes('art') || lower.includes('theatre')) category = 'Arts & Theatre';

    const date = resolveNaturalDate(lower);

    // Extract keyword if not pure command
    let keyword = clean.replace(/(find|search|show|events|in\s+[a-z\s]+|today|tomorrow|this weekend)/gi, '').trim();

    return {
      intent: 'SEARCH_EVENTS',
      entities: { keyword: keyword || undefined, city, category, date },
    };
  }

  return { intent: 'UNKNOWN', entities: {} };
};

/**
 * Optional LLM parser (Anthropic Messages API) if ANTHROPIC_API_KEY is configured
 */
const parseIntentLLM = async (text) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: 'You are an event assistant. Parse intent from user message. Return ONLY valid JSON with keys "intent" (one of SEARCH_EVENTS, LIST_RSVPS, RSVP_EVENT, CANCEL_RSVP, SET_REMINDER, SHARE_LINK, FRIENDS_ATTENDING, HELP, UNKNOWN) and "entities" (keyword, city, date, category, index, status).',
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (response.ok) {
      const json = await response.json();
      const content = json.content?.[0]?.text;
      if (content) return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Assistant LLM Fallback]: Anthropic API call failed, falling back to rule parser.', e.message);
  }

  return null;
};

/**
 * Main intent parser combining LLM (optional) and Rule-based parser
 */
const parseIntent = async (text) => {
  const llmResult = await parseIntentLLM(text);
  if (llmResult && llmResult.intent) return llmResult;
  return parseIntentRuleBased(text);
};

/**
 * Process user text message, execute logic via core services, and build response
 */
const processUserMessage = async (userId, text) => {
  const { intent, entities } = await parseIntent(text);
  const userLastEvents = userSearchResultsMap.get(userId) || [];

  switch (intent) {
    case 'HELP': {
      return {
        text: "👋 Hi! I'm your Event Pulse Real-time Assistant. Here is what you can ask me:\n\n• **Search Events**: *\"Find music events in San Francisco\"* or *\"Show tech summits today\"*\n• **View My RSVPs**: *\"Show my RSVPs\"*\n• **RSVP to Event**: *\"RSVP 1\"* or *\"Confirm 2\"*\n• **Get Share Link**: *\"Share 1\"*\n• **Set Reminder**: *\"Remind me 30 minutes before 1\"*\n• **Friends Count**: *\"Friends attending 1\"*",
        payload: {
          suggestions: ['Search Music Events', 'Show My RSVPs', 'Help'],
        },
      };
    }

    case 'SEARCH_EVENTS': {
      const result = await eventService.getEventsList({
        queryParams: {
          keyword: entities.keyword,
          city: entities.city,
          category: entities.category,
          date: entities.date,
          size: 5,
        },
        userId,
      });

      const events = result.events || [];

      if (events.length === 0) {
        return {
          text: `🔍 I searched for events but couldn't find any matching your criteria. Try searching for a different city or category!`,
          payload: { suggestions: ['Search in San Francisco', 'Show All Events', 'Help'] },
        };
      }

      // Store search results in memory for numbered commands like "rsvp 1"
      userSearchResultsMap.set(userId, events);

      const eventListText = events
        .map((e, idx) => `**#${idx + 1}** ${e.title} (${e.city} • ${e.date})`)
        .join('\n');

      return {
        text: `🎉 Found **${events.length} events** for you:\n\n${eventListText}\n\n*Type "rsvp 1" or "share 1" to interact!*`,
        payload: {
          events,
          suggestions: ['RSVP 1', 'Share 1', 'Show My RSVPs'],
        },
      };
    }

    case 'LIST_RSVPS': {
      const rsvps = await rsvpService.getUserRsvps({ userId, when: 'upcoming' });
      if (rsvps.length === 0) {
        return {
          text: `📋 You don't have any upcoming RSVPs saved yet. Try asking me to *"Find events in New York"*!`,
          payload: { suggestions: ['Find Events', 'Search Music'] },
        };
      }

      const rsvpListText = rsvps
        .map((r, idx) => `**#${idx + 1}** ${r.eventSnapshot.title} [${r.status.toUpperCase()}] • ${r.eventSnapshot.date}`)
        .join('\n');

      return {
        text: `🎫 Here are your upcoming saved RSVPs:\n\n${rsvpListText}`,
        payload: {
          suggestions: ['Find More Events', 'Help'],
        },
      };
    }

    case 'RSVP_EVENT': {
      const idx = entities.index ?? 0;
      const targetEvent = userLastEvents[idx];

      if (!targetEvent) {
        return {
          text: `⚠️ Please search for events first (e.g., *"Find events in San Francisco"*), then specify a number like *"RSVP 1"*!`,
          payload: { suggestions: ['Find Events', 'Help'] },
        };
      }

      const status = entities.status || 'interested';
      const rsvp = await rsvpService.createOrUpdateRsvp({
        userId,
        eventId: targetEvent.eventId,
        status,
      });

      return {
        text: `✅ Success! Marked **${targetEvent.title}** as **${status.toUpperCase()}**. You can view it anytime on your Dashboard!`,
        payload: {
          event: rsvp.eventSnapshot,
          suggestions: [`Share ${idx + 1}`, 'Show My RSVPs'],
        },
      };
    }

    case 'CANCEL_RSVP': {
      const idx = entities.index ?? 0;
      const targetEvent = userLastEvents[idx];

      if (!targetEvent) {
        return {
          text: `⚠️ Could not find event #${idx + 1}. Please search for events or list your RSVPs first!`,
          payload: { suggestions: ['Show My RSVPs'] },
        };
      }

      await rsvpService.deleteRsvp({ userId, eventId: targetEvent.eventId });

      return {
        text: `🗑️ Removed RSVP for **${targetEvent.title}**.`,
        payload: { suggestions: ['Find Events'] },
      };
    }

    case 'SHARE_LINK': {
      const idx = entities.index ?? 0;
      const targetEvent = userLastEvents[idx];

      if (!targetEvent) {
        return {
          text: `⚠️ Please search for events first, then type *"Share 1"*!`,
          payload: { suggestions: ['Find Events'] },
        };
      }

      try {
        const shareData = await shareService.generateShareLink({
          userId,
          eventId: targetEvent.eventId,
        });

        return {
          text: `🔗 Here is your unique invite link for **${targetEvent.title}**:\n\n\`${shareData.fullUrl}\`\n\nShare this link with friends to track real-time attendance!`,
          payload: {
            shareUrl: shareData.fullUrl,
            suggestions: ['Show My RSVPs', 'Help'],
          },
        };
      } catch (err) {
        return {
          text: `⚠️ ${err.message || 'Must RSVP to the event before sharing an invite link!'}`,
          payload: { suggestions: [`RSVP ${idx + 1}`] },
        };
      }
    }

    case 'SET_REMINDER': {
      const idx = entities.index ?? 0;
      const targetEvent = userLastEvents[idx];
      const minutes = entities.remindBeforeMinutes || 60;

      if (!targetEvent) {
        return {
          text: `⚠️ Please search for events first, then set a reminder!`,
          payload: { suggestions: ['Find Events'] },
        };
      }

      try {
        await rsvpService.updateRsvpReminder({
          userId,
          eventId: targetEvent.eventId,
          enabled: true,
          remindBeforeMinutes: minutes,
        });

        return {
          text: `🔔 Set reminder for **${targetEvent.title}** to notify you **${minutes} minutes** before start time!`,
          payload: { suggestions: ['Show My RSVPs'] },
        };
      } catch (err) {
        return {
          text: `⚠️ ${err.message || 'Please save the event first before setting a reminder!'}`,
          payload: { suggestions: [`RSVP ${idx + 1}`] },
        };
      }
    }

    case 'FRIENDS_ATTENDING': {
      const idx = entities.index ?? 0;
      const targetEvent = userLastEvents[idx];

      if (!targetEvent) {
        return {
          text: `⚠️ Please search for events first!`,
          payload: { suggestions: ['Find Events'] },
        };
      }

      const count = await shareService.getFriendsAttendingCount({
        userId,
        eventId: targetEvent.eventId,
      });

      return {
        text: `👥 **${count} friends** have clicked your invite link for **${targetEvent.title}**!`,
        payload: { suggestions: [`Share ${idx + 1}`] },
      };
    }

    case 'UNKNOWN':
    default: {
      return {
        text: `🤖 I'm not sure I understood that request. Try asking me:\n\n• *"Find music events in San Francisco"*\n• *"Show my RSVPs"*\n• *"Help"*`,
        payload: {
          suggestions: ['Find Events', 'Show My RSVPs', 'Help'],
        },
      };
    }
  }
};

module.exports = {
  parseIntent,
  processUserMessage,
};
