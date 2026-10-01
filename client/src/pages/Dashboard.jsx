import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getRsvps, updateRsvpStatus, updateRsvpReminder, deleteRsvp } from '../api/rsvps';

const TABS = [
  { key: 'all', label: 'All RSVPs' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past Events' },
  { key: 'interested', label: 'Interested' },
  { key: 'confirmed', label: 'Confirmed' },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchUserRsvps = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (activeTab === 'upcoming') params.when = 'upcoming';
      if (activeTab === 'past') params.when = 'past';
      if (activeTab === 'interested') params.status = 'interested';
      if (activeTab === 'confirmed') params.status = 'confirmed';

      const data = await getRsvps(params);
      if (data.success) {
        setRsvps(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load RSVPs:', err);
      toast.error('Failed to load RSVPs');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUserRsvps();
  }, [fetchUserRsvps]);

  const handleStatusChange = async (eventId, newStatus) => {
    setActionLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      await updateRsvpStatus(eventId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchUserRsvps();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleReminderSettingChange = async (eventId, newEnabled, newMinutes) => {
    setActionLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      await updateRsvpReminder(eventId, {
        enabled: newEnabled,
        remindBeforeMinutes: Number(newMinutes),
      });
      toast.success('Event reminder settings updated!');
      setRsvps((prev) =>
        prev.map((r) =>
          r.eventId === eventId
            ? {
                ...r,
                reminder: {
                  ...r.reminder,
                  enabled: newEnabled,
                  remindBeforeMinutes: Number(newMinutes),
                  notified: false,
                },
              }
            : r
        )
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update reminder settings');
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleCancelRsvp = async (eventId) => {
    setActionLoading((prev) => ({ ...prev, [eventId]: true }));
    try {
      await deleteRsvp(eventId);
      toast.success('RSVP removed');
      setRsvps((prev) => prev.filter((r) => r.eventId !== eventId));
    } catch (err) {
      toast.error(err.message || 'Failed to cancel RSVP');
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const renderDaysLeftBadge = (daysLeft) => {
    if (daysLeft === 0) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold">
          🔥 Today!
        </span>
      );
    } else if (daysLeft > 0) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
          ⏳ In {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
        </span>
      );
    } else {
      const positiveDays = Math.abs(daysLeft);
      return (
        <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
          ⌛ {positiveDays} {positiveDays === 1 ? 'day' : 'days'} ago
        </span>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Event Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your saved events, confirmations, and reminders</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/30 transition-all self-start sm:self-auto"
        >
          <span>🔍 Discover More Events</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 animate-pulse">
              <div className="w-full sm:w-48 h-32 bg-slate-800/60 rounded-xl"></div>
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-800/80 rounded w-1/2"></div>
                <div className="h-4 bg-slate-800/60 rounded w-1/3"></div>
                <div className="h-4 bg-slate-800/60 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : rsvps.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="text-4xl">🎫</div>
          <h3 className="text-xl font-bold text-white">No RSVPs found</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            You haven't saved or confirmed attendance for any events in this view yet.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            Explore Events Feed
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {rsvps.map((rsvp) => {
            const event = rsvp.eventSnapshot;
            const isConfirmed = rsvp.status === 'confirmed';
            const isBusy = actionLoading[rsvp.eventId];
            const reminder = rsvp.reminder || { enabled: true, remindBeforeMinutes: 60 };

            return (
              <div
                key={rsvp._id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  {/* Event Image & Overview */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-5 w-full sm:w-auto">
                    <div className="w-full sm:w-36 h-28 bg-slate-950 rounded-xl overflow-hidden flex-shrink-0">
                      <img
                        src={event?.imageUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800'}
                        alt={event?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            isConfirmed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {isConfirmed ? '✓ Confirmed' : '⭐ Interested'}
                        </span>
                        {renderDaysLeftBadge(rsvp.daysLeft)}
                        
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                          👥 Friends: {rsvp.friendsAttending || 0}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white leading-snug">{event?.title}</h3>
                      <p className="text-xs text-slate-400">
                        📍 {event?.venue}, {event?.city}
                      </p>
                      <p className="text-xs text-indigo-400 font-medium">
                        📅 {event?.date} at {event?.time}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    {isConfirmed ? (
                      <button
                        disabled={isBusy}
                        onClick={() => handleStatusChange(rsvp.eventId, 'interested')}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                      >
                        Set to Interested
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => handleStatusChange(rsvp.eventId, 'confirmed')}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all"
                      >
                        Confirm Attendance
                      </button>
                    )}

                    <button
                      disabled={isBusy}
                      onClick={() => handleCancelRsvp(rsvp.eventId)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl text-xs font-semibold transition-all"
                    >
                      Cancel RSVP
                    </button>
                  </div>
                </div>

                {/* Per-Event Reminder Settings Strip */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <span className="text-base">🔔</span>
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-semibold text-slate-300 cursor-pointer">
                        Event Reminder:
                      </label>
                      <input
                        type="checkbox"
                        checked={reminder.enabled}
                        onChange={(e) =>
                          handleReminderSettingChange(rsvp.eventId, e.target.checked, reminder.remindBeforeMinutes)
                        }
                        className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400">
                        {reminder.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {reminder.enabled && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">Remind me:</span>
                      <select
                        value={reminder.remindBeforeMinutes}
                        onChange={(e) =>
                          handleReminderSettingChange(rsvp.eventId, reminder.enabled, e.target.value)
                        }
                        className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      >
                        <option value={15}>15 Minutes Before</option>
                        <option value={30}>30 Minutes Before</option>
                        <option value={60}>1 Hour Before</option>
                        <option value={120}>2 Hours Before</option>
                        <option value={1440}>1 Day Before</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
