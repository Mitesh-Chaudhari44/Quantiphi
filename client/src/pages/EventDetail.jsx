import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getEventById } from '../api/events';
import { createRsvp, updateRsvpStatus, deleteRsvp } from '../api/rsvps';
import { createShareLink } from '../api/share';

const EventDetail = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const refToken = searchParams.get('ref');

  const { isAuthenticated } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const data = await getEventById(eventId);
        if (data.success && data.data) {
          setEvent(data.data);
          setFriendsCount(data.data.friendsAttending || 0);
        } else {
          setErrorMsg('Event details could not be loaded.');
        }
      } catch (err) {
        setErrorMsg(err.message || 'Event not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [eventId]);

  // Real-time socket listener
  useEffect(() => {
    if (!socket || !eventId) return;

    const handleFriendsUpdate = (data) => {
      if (data && data.eventId === eventId) {
        setFriendsCount(data.count);
        toast.success(`🎉 Real-time Update: A friend clicked your invite link! Friends count is now ${data.count}.`);
      }
    };

    socket.on('friends:updated', handleFriendsUpdate);

    return () => {
      socket.off('friends:updated', handleFriendsUpdate);
    };
  }, [socket, eventId]);

  const isInterested = event?.rsvpStatus === 'interested';
  const isConfirmed = event?.rsvpStatus === 'confirmed';
  const hasRsvp = isInterested || isConfirmed;

  const handleInterestedToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save events');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      if (isInterested || isConfirmed) {
        await deleteRsvp(event.eventId);
        toast.success('Removed from saved events');
        setEvent((prev) => ({ ...prev, rsvpStatus: null }));
      } else {
        await createRsvp(event.eventId, 'interested');
        toast.success('Marked as Interested!');
        setEvent((prev) => ({ ...prev, rsvpStatus: 'interested' }));
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to confirm attendance');
      navigate('/login');
      return;
    }

    setActionLoading(true);
    try {
      if (isConfirmed) {
        await updateRsvpStatus(event.eventId, 'interested');
        toast.success('Status set to Interested');
        setEvent((prev) => ({ ...prev, rsvpStatus: 'interested' }));
      } else {
        await createRsvp(event.eventId, 'confirmed');
        toast.success('Attendance Confirmed!');
        setEvent((prev) => ({ ...prev, rsvpStatus: 'confirmed' }));
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareLink = async () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to generate invite links');
      navigate('/login');
      return;
    }

    if (!hasRsvp) {
      toast.error('You must RSVP to this event before generating an invite link!');
      return;
    }

    try {
      const res = await createShareLink(event.eventId);
      if (res.success && res.data?.fullUrl) {
        await navigator.clipboard.writeText(res.data.fullUrl);
        toast.success('Unique invite link copied to clipboard!');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to generate share link');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800/80 rounded w-1/4"></div>
        <div className="w-full h-80 bg-slate-800/60 rounded-3xl"></div>
        <div className="h-8 bg-slate-800/80 rounded w-3/4"></div>
        <div className="h-4 bg-slate-800/60 rounded w-1/2"></div>
      </div>
    );
  }

  if (errorMsg || !event) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <p className="text-slate-400 text-sm">{errorMsg || 'The requested event could not be found.'}</p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          Back to Discover Events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      {/* Friend Referral Banner */}
      {refToken && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900 border border-indigo-500/40 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="text-sm font-bold text-white">You were invited by a friend!</p>
              <p className="text-xs text-indigo-300">Invitation Referral Code: <code className="bg-indigo-900/60 px-2 py-0.5 rounded text-indigo-200">{refToken}</code></p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60">
            Active Referral
          </span>
        </div>
      )}

      {/* Back Link */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Events Feed</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="relative h-80 sm:h-96 w-full bg-slate-950">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-indigo-300">
            {event.category}
          </div>

          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-300">
              <span>📅 {event.date}</span>
              <span>•</span>
              <span>⏰ {event.time}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
              {event.title}
            </h1>
            <p className="text-sm text-slate-300">
              📍 {event.venue}, {event.city}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-6">
            <button
              onClick={handleInterestedToggle}
              disabled={actionLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                isInterested
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
              }`}
            >
              <span>{isInterested ? '⭐ Saved as Interested' : '☆ Save / Interested'}</span>
            </button>

            <button
              onClick={handleConfirmToggle}
              disabled={actionLoading}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
                isConfirmed
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <span>{isConfirmed ? '✓ Attendance Confirmed' : '+ Confirm Attendance'}</span>
            </button>

            <button
              onClick={handleShareLink}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                hasRsvp
                  ? 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-950 text-slate-500 border border-slate-800'
              }`}
            >
              <span>🔗</span>
              <span>{hasRsvp ? 'Copy Friend Invite Link' : 'RSVP to Invite Friends'}</span>
            </button>

            {event.url && (
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all ml-auto"
              >
                Official Ticket Info ↗
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Venue Location</h3>
              <p className="text-base font-bold text-white">{event.venue}</p>
              <p className="text-sm text-slate-300">{event.city}, {event.countryCode || 'US'}</p>
            </div>

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event Schedule</h3>
              <p className="text-base font-bold text-white">{event.date}</p>
              <p className="text-sm text-slate-300">Starts at {event.time}</p>
            </div>
          </div>

          {/* Social Friends Attending Real-time Section */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-950 p-5 rounded-2xl border border-indigo-500/30 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg font-bold">
                👥
              </div>
              <div>
                <p className="text-sm font-bold text-white">Friends Attending (Unique Clicks)</p>
                <p className="text-xs text-slate-400">Tracked via your unique invitation share links with real-time updates</p>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/30">
              {friendsCount} Friends
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
