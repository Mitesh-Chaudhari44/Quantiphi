import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import EventCalendar from '../components/EventCalendar';
import EventCard from '../components/EventCard';
import { getEvents } from '../api/events';

const CATEGORIES = ['All', 'Music', 'Sports', 'Arts & Theatre', 'Technology', 'Food & Drink'];

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  // Filters State
  const [filters, setFilters] = useState({
    keyword: '',
    city: '',
    category: 'All',
    date: '',
    page: 1,
  });

  const fetchEventsFeed = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEvents({
        keyword: filters.keyword,
        city: filters.city,
        category: filters.category !== 'All' ? filters.category : undefined,
        date: filters.date || undefined,
        page: filters.page,
      });

      if (data.success) {
        setEvents(data.data.events || []);
        setPagination(data.data.pagination || { page: 1, totalPages: 1 });
        setSource(data.data.source || '');
      }
    } catch (err) {
      console.error('Failed to fetch events feed:', err);
      toast.error('Failed to load events feed');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEventsFeed();
  }, [fetchEventsFeed]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleCategorySelect = (category) => {
    setFilters((prev) => ({ ...prev, category, page: 1 }));
  };

  const handleCalendarDateSelect = (dateStr) => {
    setFilters((prev) => ({ ...prev, date: dateStr || '', page: 1 }));
    if (dateStr) {
      toast.success(`Filtering events for ${dateStr}`);
    } else {
      toast.success('Date filter cleared');
    }
  };

  const handleRsvpUpdateInFeed = (eventId, newStatus) => {
    setEvents((prev) =>
      prev.map((e) => (e.eventId === eventId ? { ...e, rsvpStatus: newStatus } : e))
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900/70 via-purple-900/50 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide">
            <span>⚡ Stage 4 Polish</span>
            <span>•</span>
            <span className="capitalize">{source ? source.replace('_', ' ') : 'Live Feed'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400">Events & Festivals</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Use the interactive calendar grid to view daily event counts, search by location, or filter by category. Save events to your dashboard in one click.
          </p>
        </div>
      </div>

      {/* Main Grid Layout: Left Calendar / Right Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Event Calendar Widget */}
        <div className="lg:col-span-1 space-y-6">
          <EventCalendar
            selectedDate={filters.date}
            onSelectDate={handleCalendarDateSelect}
            city={filters.city}
            category={filters.category}
          />
        </div>

        {/* Right Column: Search Toolbar & Responsive Cards Grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search & Category Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Search Keyword */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Search Keyword
                </label>
                <input
                  type="text"
                  name="keyword"
                  value={filters.keyword}
                  onChange={handleFilterChange}
                  placeholder="e.g. Festival, AI, Concert..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  placeholder="e.g. San Francisco, New York..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none pt-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    filters.category === cat
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {filters.date ? `Events on ${filters.date}` : 'Upcoming Events'}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Showing {events.length} results
            </span>
          </div>

          {/* Events Feed Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-slate-900/60 border border-slate-800/60 rounded-2xl p-4 space-y-4 animate-pulse">
                  <div className="w-full h-48 bg-slate-800/60 rounded-xl"></div>
                  <div className="h-5 bg-slate-800/80 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-800/60 rounded w-1/2"></div>
                  <div className="h-10 bg-slate-800/80 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <div className="text-4xl">🔍</div>
              <h3 className="text-xl font-bold text-white">No events found</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                No events match your current search criteria or selected date.
              </p>
              <button
                onClick={() => setFilters({ keyword: '', city: '', category: 'All', date: '', page: 1 })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.eventId}
                  event={event}
                  onRsvpUpdate={handleRsvpUpdateInFeed}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 pt-4">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="text-xs font-semibold text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={filters.page >= pagination.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
