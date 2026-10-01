# 🎓 Viva Preparation & Technical Q&A Guide

This document contains **15 technical Viva questions and answers** covering the exact architecture, database design, real-time communication, security, and algorithmic decisions used in this codebase.

---

### Q1: Why is business logic kept strictly on the server, and what calculations are computed server-side?
**Answer:**  
Keeping business logic on the server ensures data integrity, security, and consistency across all client platforms (web, mobile, or third-party clients). In our codebase:
- `daysLeft` calculations for upcoming/past RSVPs are computed dynamically on the server based on UTC date comparisons.
- Event query normalization, Ticketmaster API fallbacks, and calendar month event counts are computed in `ticketmasterService.js` and `rsvpService.js`.
- NLP Intent parsing (`parseIntent`) and recommendation filtering are processed entirely on the server. The client is purely a view layer rendering standard JSON structures.

---

### Q2: How does JWT authentication work in this application, and how is it secured?
**Answer:**  
Upon login/registration, `authService.js` signs a JWT containing `{ id: user._id, email: user.email }` using a server secret key (`JWT_SECRET`) and a 7-day expiration time.
- **HTTP Requests**: The client sends the token in the `Authorization: Bearer <token>` header. Our `authMiddleware.js` verifies the token, fetches user details (excluding password hash via `-password`), and attaches `req.user`.
- **Sockets**: `socketManager.js` performs handshake validation using `socket.handshake.auth.token` or headers. Invalid tokens reject the WebSocket connection immediately.

---

### Q3: Explain the compound unique database index on the `Rsvp` model and why it is necessary.
**Answer:**  
In `Rsvp.js`, we define a compound unique index:
```js
rsvpSchema.index({ user: 1, eventId: 1 }, { unique: true });
```
This guarantees at the database engine level that a user can have at most **one** RSVP document per event. If concurrent requests try to create duplicate RSVPs for the same event, MongoDB throws a `11000` duplicate key error, preventing data corruption without requiring expensive application-level locking.

---

### Q4: How does unique share-click tracking work atomically, avoiding race conditions?
**Answer:**  
In `shareService.js`, when a visitor clicks a share link (`/api/share/:token`):
1. The server identifies the visitor using HTTP-only cookies (`visitorId`) or JWT credentials.
2. An atomic `findOneAndUpdate` operation is executed with condition checks:
```js
ShareLink.findOneAndUpdate(
  {
    token,
    owner: { $ne: visitorUserId },
    'clicks.visitorId': { $ne: visitorId },
    'clicks.userId': { $ne: visitorUserId }
  },
  {
    $push: { clicks: { userId: visitorUserId, visitorId, clickedAt: new Date() } },
    $inc: { uniqueClickCount: 1 }
  },
  { new: true }
);
```
If the visitor has already clicked or is the link owner, MongoDB's query fails to match, returning `null` without modifying the document or incrementing `uniqueClickCount`.

---

### Q5: How is Socket.IO structured for targeting individual users?
**Answer:**  
When a user connects, Socket.IO verifies their JWT and automatically assigns their connection socket to a personal room named `user:<userId>` (`socket.join('user:' + socket.user.id)`).  
When background jobs (e.g. `reminderJob.js`) or referral events (e.g. `shareService.js`) need to send alerts to a specific user, `emitToUserRoom(userId, event, payload)` emits the event exclusively to that user's room.

---

### Q6: How does the background cron job for event reminders work?
**Answer:**  
`reminderJob.js` utilizes `node-cron` scheduled to run every minute (`* * * * *`).
1. It queries MongoDB for RSVPs with `reminder.enabled: true` and `reminder.notified: false`.
2. For each RSVP, it calculates the reminder trigger time:
   $$\text{dueTime} = \text{eventStart} - \text{remindBeforeMinutes}$$
3. If `dueTime <= currentTime` and the event is in the future, it atomically sets `reminder.notified = true`, persists a `Notification` document, and dispatches a live `reminder:due` WebSocket event to the user's Socket room.

---

### Q7: Explain the fallback mechanism when Ticketmaster API is unconfigured or fails.
**Answer:**  
In `ticketmasterService.js`:
- If `TICKETMASTER_API_KEY` is missing or default, or if the Ticketmaster HTTP call fails or returns 0 items, the service falls back to `getFilteredSeedEvents()`.
- Seed events are loaded from `seedEvents.json`. Dates are dynamically generated relative to today's date (`now.getDate() + dayOffset`), and in-memory filtering (keyword, city, date, category, page, size) is applied to return realistic mock data.

---

### Q8: How does in-memory caching work for event queries?
**Answer:**  
In `cache.js`, we implemented a zero-dependency in-memory Map wrapper.  
When `fetchEventsFromTicketmaster(queryParams)` is called:
1. It creates a deterministic cache key: `tm_events_${JSON.stringify(queryParams)}`.
2. If `cache.get(cacheKey)` exists and hasn't expired (5-minute TTL), it immediately returns cached data without making an external HTTP request.
3. Upon expiry or cache miss, it fetches fresh data and stores it via `cache.set(cacheKey, data, 300000)`.

---

### Q9: How is circular dependency avoided between `shareService.js` and `socketManager.js`?
**Answer:**  
`socketManager.js` requires `assistantService.js`, which in turn requires `shareService.js`. If `shareService.js` had required `socketManager.js` at top-level module scope, Node.js module resolution would produce an incomplete module export object (circular reference).  
To prevent this, `shareService.js` uses **late-requiring** inside the function body (`const { emitToUserRoom } = require('../sockets/socketManager');`) only when a WebSocket notification needs to be dispatched.

---

### Q10: How does the real-time AI assistant parse user intents?
**Answer:**  
In `assistantService.js`:
1. **Rule-Based Engine**: Uses regular expressions and natural language keyword extraction to match intents (`SEARCH_EVENTS`, `LIST_RSVPS`, `RSVP_EVENT`, `CANCEL_RSVP`, `SET_REMINDER`, `SHARE_LINK`, `FRIENDS_ATTENDING`, `HELP`). It resolves natural date keywords like *"today"*, *"tomorrow"*, and *"this weekend"*.
2. **LLM Engine (Optional)**: If `ANTHROPIC_API_KEY` is provided, it calls Anthropic's Claude Messages API with a strict system prompt returning JSON intents. If LLM fails or is absent, it seamlessly falls back to the rule-based parser inside a `try/catch` block.

---

### Q11: How does the assistant remember context for commands like "RSVP 1" or "Share 2"?
**Answer:**  
`assistantService.js` maintains an in-memory Map (`userSearchResultsMap`) mapping `userId -> lastSearchEventsList`.  
When a user performs an event search, the resulting event list is cached in this map. When the user subsequently types *"RSVP 1"*, the assistant retrieves index `0` from `userSearchResultsMap.get(userId)` and creates the RSVP for that specific event.

---

### Q12: How are password hashes secured in the `User` model?
**Answer:**  
In `User.js`, a Mongoose `pre('save')` hook intercepts password creation/updates. If `isModified('password')` is true, it generates a salt (`bcrypt.genSalt(10)`) and hashes the password before saving. The schema also includes a helper method `matchPassword(enteredPassword)` that compares candidates via `bcrypt.compare()`.

---

### Q13: What security headers and practices are applied in Express (`app.js`)?
**Answer:**  
- **Helmet**: `app.use(helmet())` sets standard HTTP security headers (e.g. X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).
- **CORS Configuration**: Restricts cross-origin requests specifically to `CLIENT_URL` with `credentials: true`.
- **Cookie Security**: Referral visitor cookies use `httpOnly: true` and `sameSite: 'lax'` to prevent XSS cookie theft.

---

### Q14: How does the custom frontend `EventCalendar` component render dates without external calendar libraries?
**Answer:**  
In `EventCalendar.jsx`:
1. It computes `daysInMonth` and `firstDayOffset` using native JavaScript `Date` methods (`new Date(year, month, 0).getDate()`).
2. It constructs a 7-column grid (Sun-Sat), padding initial blank cells according to `firstDayOffset`.
3. It fetches month event aggregations from `GET /api/events/calendar?month=YYYY-MM` and maps event counts to each specific day cell, highlighting days with count badges and outlining today's date.

---

### Q15: How are central error handling and route validations managed across Express routes?
**Answer:**  
- **Input Validation**: `express-validator` rules are attached as route middleware arrays (e.g. checking query formats, enum bounds, parameter strings). `validateMiddleware.js` checks `validationResult(req)` and returns formatted `400 Bad Request` responses if errors exist.
- **Async Errors**: All controller functions are wrapped in `asyncHandler`, which automatically catches promise rejections and forwards them to `next(err)`.
- **Global Error Handler**: `errorMiddleware.js` handles all unhandled errors, returning a standardized response format `{ success: false, message, data: null }`.
