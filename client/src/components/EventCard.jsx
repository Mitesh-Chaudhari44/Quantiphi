import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { createRsvp, updateRsvpStatus, deleteRsvp } from '../api/rsvps';
import { createShareLink } from '../api/share';

const EventCard = ({ event, onRsvpUpdate }) => {
  const { isAuthenticated } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [friendsCount, setFriendsCount] = useState(event.friendsAttending || 0);

  useEffect(() => {
    setFriendsCount(event.friendsAttending || 0);
  }, [event.friendsAttending]);

  // Listen to real-time socket events for friends attending updates
  useEffect(() => {
    if (!socket) return;

    const handleFriendsUpdate = (data) => {
      if (data && data.eventId === event.eventId) {
        setFriendsCount(data.count);
        toast.success(`🎉 Someone clicked your invite link for "${event.title}"! Friends count is now ${data.count}.`);
      }
    };

    socket.on('friends:updated', handleFriendsUpdate);

    return () => {
      socket.off('friends:updated', handleFriendsUpdate);
    };
  }, [socket, event.eventId, event.title]);

  const isInterested = event.rsvpStatus === 'interested';
  const isConfirmed = event.rsvpStatus === 'confirmed';
  const hasRsvp = isInterested || isConfirmed;

  const handleInterestedToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to save events');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      if (isInterested || isConfirmed) {
        await deleteRsvp(event.eventId);
        toast.success('Removed from your saved events');
        if (onRsvpUpdate) onRsvpUpdate(event.eventId, null);
      } else {
        await createRsvp(event.eventId, 'interested');
        toast.success('Marked as Interested!');
        if (onRsvpUpdate) onRsvpUpdate(event.eventId, 'interested');
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmToggle = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to confirm attendance');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      if (isConfirmed) {
        await updateRsvpStatus(event.eventId, 'interested');
        toast.success('Status set to Interested');
        if (onRsvpUpdate) onRsvpUpdate(event.eventId, 'interested');
      } else {
        await createRsvp(event.eventId, 'confirmed');
        toast.success('Attendance Confirmed!');
        if (onRsvpUpdate) onRsvpUpdate(event.eventId, 'confirmed');
      }
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShareLink = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to generate invite links');
      navigate('/login');
      return;
    }

    if (!hasRsvp) {
      toast.error('You must RSVP (Save or Confirm) to this event before generating an invite link!');
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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col group shadow-lg">
      <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
        <Link to={`/events/${event.eventId}`}>
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-semibold text-indigo-300">
          {event.category}
        </div>

        {/* Real-time Friends Attending Badge */}
        <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 flex items-center space-x-1.5 shadow-md">
          <span>👥</span>
          <span>Friends Attending: <strong className="text-white text-xs">{friendsCount}</strong></span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs text-indigo-400 font-semibold">
            <span>📅 {event.date}</span>
            <span>•</span>
            <span>⏰ {event.time}</span>
          </div>

          <Link to={`/events/${event.eventId}`}>
            <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
              {event.title}
            </h3>
          </Link>

          <p className="text-xs text-slate-400 line-clamp-1">
            📍 {event.venue}, {event.city}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleInterestedToggle}
              disabled={loading}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                isInterested
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-900/50'
                  : isConfirmed
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              <span>{isInterested ? '⭐ Interested' : '☆ Interested'}</span>
            </button>

            <button
              onClick={handleConfirmToggle}
              disabled={loading}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                isConfirmed
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              <span>{isConfirmed ? '✓ Confirmed' : '+ Confirm'}</span>
            </button>
          </div>

          <button
            onClick={handleShareLink}
            className={`w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              hasRsvp
                ? 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-400'
            }`}
          >
            <span>🔗</span>
            <span>{hasRsvp ? 'Copy Friend Invite Link' : 'RSVP First to Get Invite Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
