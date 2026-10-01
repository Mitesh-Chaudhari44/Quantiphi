# 🎪 Event Pulse: Real-Time Event Finder & Tracker Platform

> A full-stack, enterprise-grade event discovery, RSVP tracking, social sharing, and real-time AI assistant platform. Built with **Node.js, Express, MongoDB, Socket.IO, and React (Vite)** with modern Tailwind CSS styling.

---

## 🌟 Overview

**Event Pulse** allows users to discover local and global events in real-time, manage their event RSVPs with customized reminders, track friend referrals via unique invitation links, and interact with a real-time conversational AI assistant. All calculation, business logic, date manipulation, intent parsing, and state management are strictly enforced on the server.

---

## 🚀 Key Features

- **🔐 Authenticated User System**: JWT-based session security with bcrypt password hashing and customizable user profiles (default city, default reminder lead time, avatar).
- **📅 Dynamic Event Feed & Calendar Grid**: Unified API aggregating Ticketmaster Live Discovery API data with automatic fallback to realistic local seed events. 5-minute in-memory caching for zero redundant API latency.
- **🎫 RSVP & Attendance Management**: Save events as "Interested" or "Confirmed", track upcoming vs past events with dynamic `daysLeft` calculations.
- **🔔 Real-Time Event Reminders**: Automated background worker (`node-cron`) checking lead times (15m, 30m, 60m, 2h, 1 day) and dispatching real-time Socket.IO alerts and notifications.
- **🔗 Social Invite & Unique Share Tracking**: Instant creation of share links (`nanoid`) with atomic, race-condition-proof unique visitor click tracking (via HTTP-only cookies and JWT headers) and live "Friends Attending" count update.
- **🤖 Real-Time Chat Assistant**: Dual-engine conversational assistant available via a floating widget or dedicated chat page. Supports regex/keyword intent extraction and optional Anthropic Claude LLM API integration with automatic fallback.

---

## 🛠️ Tech Stack

### Backend (Server)
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB & Mongoose ORM
- **Real-Time WebSockets**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs
- **Validation**: express-validator middleware
- **Background Jobs**: node-cron
- **External Integration**: Ticketmaster Discovery API v2 & Anthropic Messages API (optional)

### Frontend (Client)
- **Framework**: React 18 (Vite)
- **Routing**: React Router v6 (Nested & Protected Routes)
- **Styling**: Tailwind CSS & Glassmorphism design system
- **Real-Time Client**: socket.io-client
- **HTTP Client**: Axios with request/response interceptors
- **Notifications**: react-hot-toast

---

## 🏗️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT (Vite / React 18)                         |
|  +-------------------+  +-------------------+  +-------------------+  +-----------+  |
|  |  Event Feed &     |  | RSVP Dashboard &  |  | Floating Chat     |  | Live      |  |
|  |  Custom Calendar  |  | Reminder Controls |  | Assistant Widget  |  | Toast Bell|  |
|  +---------+---------+  +---------+---------+  +---------+---------+  +-----+-----+  |
+------------|----------------------|----------------------|------------------|-----+
             | REST                 | REST                 | WebSockets       | Socket
             v                      v                      v                  v
+-----------------------------------------------------------------------------------+
|                                 SERVER (Node.js / Express)                        |
|                                                                                   |
|  +--------------------+  +-------------------+  +-------------------------------+ |
|  |  Express API       |  |  Socket.IO Server |  |  Cron Reminder Worker         | |
|  |  Routes & Auth     |  |  User Rooms       |  |  (Every minute schedule)      | |
|  +---------+----------+  +---------+---------+  +---------------+---------------+ |
|            |                       |                          |                   |
|            +-----------+-----------+                          |                   |
|                        |                                      |                   |
|                        v                                      v                   |
|  +-----------------------------------+     +-----------------------------------+  |
|  |  Services & Helpers               |     |  MongoDB Database                 |  |
|  |  - Assistant NLP & LLM Engine     |     |  - Users                          |  |
|  |  - Ticketmaster & Seed Cache      | <-> |  - RSVPs                          |  |
|  |  - Share Link Atomic Tracker      |     |  - ShareLinks                     |  |
|  |  - RSVP & Reminder Handlers       |     |  - ChatMessages & Notifications   |  |
|  +-----------------------------------+     +-----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Directory Structure

```
event-finder-tracker/
├── package.json                 # Root package.json (concurrently start scripts)
├── .gitignore                   # Covers node_modules, .env, build/dist
├── server/
│   ├── .env                     # Server environment variables
│   ├── .env.example             # Template for server env variables
│   ├── package.json             # Server dependencies & nodemon dev script
│   └── src/
│       ├── server.js            # Server entry point & HTTP listener
│       ├── app.js               # Express application initialization & middleware
│       ├── config/              # MongoDB connection setup (db.js)
│       ├── controllers/         # Thin controllers delegating to services
│       ├── data/                # Static fallback seed events (seedEvents.json)
│       ├── jobs/                # Recurring background cron worker (reminderJob.js)
│       ├── middleware/          # JWT auth, optional auth, validation, error handler
│       ├── models/              # Mongoose schemas (User, Rsvp, ShareLink, ChatMessage, Notification)
│       ├── routes/              # Express API route declarations
│       ├── services/            # Core business logic (assistant, ticketmaster, rsvp, share, auth)
│       ├── sockets/             # Socket.IO handshake auth & real-time handlers
│       └── utils/               # API response formatters, async wrappers, cache
└── client/
    ├── .env                     # Client environment variables
    ├── .env.example             # Template for client env variables
    ├── package.json             # Frontend dependencies & Vite dev script
    ├── vite.config.js           # Vite configuration & dev proxy
    └── src/
        ├── App.jsx              # Core React router layout
        ├── main.jsx             # Entry point wrapping providers
        ├── api/                 # Modular Axios API methods (events, rsvps, share, chat)
        ├── components/          # Reusable UI components (Navbar, EventCard, EventCalendar, ChatWidget)
        ├── context/             # React Contexts (AuthContext, SocketContext)
        └── pages/               # Top-level page views (Home, Dashboard, EventDetail, Profile, ChatPage)
```

---

## ⚡ Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Running instance locally on `mongodb://localhost:27017` or MongoDB Atlas connection string.

### 1. Installation
Clone the repository and install all root and sub-folder dependencies:

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Environment Configuration
Ensure `.env` files are created in both `/server` and `/client` directories using the provided templates:

**Server (`/server/.env`)**:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/event_finder_tracker
JWT_SECRET=super_secret_jwt_key_event_finder_2026
CLIENT_URL=http://localhost:5173
SERVER_PUBLIC_URL=http://localhost:5000
TICKETMASTER_API_KEY=fteSp1xtMU1g4ubbAtYmxFeL0ibKnHAO
ANTHROPIC_API_KEY=
```

**Client (`/client/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Running the Application

To run both backend and frontend concurrently with a single command from the root folder:

```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend Server API**: `http://localhost:5000/api`
- **Health Check Endpoint**: `http://localhost:5000/api/health`

---

## 🌐 API Endpoint Table

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account with profile defaults |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/users/profile` | Private | Get authenticated user profile & default settings |
| `PATCH` | `/api/users/profile` | Private | Update user profile defaults (city, reminder minutes) |
| `GET` | `/api/events` | Public / Optional Auth | Fetch paginated events with filters (keyword, city, date, category) |
| `GET` | `/api/events/calendar` | Public / Optional Auth | Get month event count summary (`[{date, count}]`) for calendar grid |
| `GET` | `/api/events/:eventId` | Public / Optional Auth | Get detailed event snapshot & current user RSVP status |
| `POST` | `/api/rsvps` | Private | Create or update event RSVP status (`interested`/`confirmed`) |
| `GET` | `/api/rsvps` | Private | Get user RSVPs filtered by status & `when` (`upcoming`/`past`) with `daysLeft` |
| `PATCH` | `/api/rsvps/:eventId/reminder` | Private | Update event reminder settings (15m, 30m, 60m, 2h, 1d) |
| `DELETE` | `/api/rsvps/:eventId` | Private | Remove RSVP entry for an event |
| `POST` | `/api/events/:eventId/share` | Private | Generate unique invitation token & link for an RSVPed event |
| `GET` | `/api/share/:token` | Public | Handle public referral click, log unique visitor, and redirect to client event page |
| `GET` | `/api/events/:eventId/friends` | Public / Optional Auth | Retrieve count of unique friends attending via user's share link |
| `GET` | `/api/notifications` | Private | Fetch user notifications list |
| `PATCH` | `/api/notifications/:id/read` | Private | Mark notification as read |
| `GET` | `/api/chat/history` | Private | Load recent chat conversation history |
| `POST` | `/api/dev/trigger-reminders` | Dev Only | Manually trigger reminder cron job for testing |

---

## 📡 Socket.IO Real-Time Events

| Event Name | Direction | Room / Recipient | Description |
| :--- | :--- | :--- | :--- |
| `connection` | Client -> Server | Server | Client connects passing JWT token in `auth.token` |
| `chat:message` | Client -> Server | User Room (`user:<id>`) | Client sends user chat query (`{ text }`) |
| `chat:typing` | Server -> Client | User Room (`user:<id>`) | Server emits typing indicator status (`{ typing: boolean }`) |
| `chat:reply` | Server -> Client | User Room (`user:<id>`) | Server sends assistant answer with formatted text & payload cards |
| `friends:updated` | Server -> Client | Link Owner Room | Real-time notification when a friend clicks user's share link |
| `reminder:due` | Server -> Client | User Room | Real-time notification emitted when an event reminder lead time triggers |

---

## 🔬 Deep-Dive Technical Mechanics

### 1. Race-Condition Proof Share-Click Tracking Mechanism
When a visitor clicks a generated referral link (`/api/share/:token`):
1. **Visitor Identification**: The server inspects HTTP cookies for `visitorId` (issuing a `crypto.randomUUID()` HTTP-Only cookie if absent) and checks for a JWT token in `?t=` or `Authorization` headers.
2. **Atomic MongoDB Update**: To prevent double-counting under concurrent clicks, `shareService` executes a single atomic `findOneAndUpdate` operation:
```js
const updatedLink = await ShareLink.findOneAndUpdate(
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
3. **Live Socket Notification**: If the click was unique, the server immediately triggers `emitToUserRoom(ownerId, 'friends:updated', { eventId, count })`.

### 2. Event Reminder Engine (`node-cron`)
1. A background cron worker runs every 60 seconds (`* * * * *`).
2. It queries unnotified RSVPs where `reminder.enabled: true` and `reminder.notified: false`.
3. Evaluates event start timestamp against configured lead time:
   $$\text{reminderDueMs} = \text{eventStartMs} - (\text{remindBeforeMinutes} \times 60000)$$
4. If $\text{reminderDueMs} \le \text{nowMs} < \text{eventStartMs}$, it sets `reminder.notified = true`, persists a `Notification` record in MongoDB, and dispatches a live `reminder:due` Socket.IO alert.

---

## ⚖️ Technical Design Decisions & Tradeoffs

1. **Server-Centric Computing**: All calculations (e.g., `daysLeft`, event filtering, date math, intent parsing) are strictly computed on the Node.js server. The React client acts purely as a presentation layer.
2. **In-Memory Caching vs. Redis**: Used a lightweight 5-minute TTL Node.js in-memory Map for caching Ticketmaster responses to eliminate external operational overhead while preventing rate-limiting.
3. **Dual Intent Parser Engine**: Built a deterministic Rule-Based NLP engine (regex + keyword extraction) that handles standard natural queries instantly with zero latency, alongside an optional Anthropic Claude LLM API wrapper for advanced semantics.
