import React, { useState, useEffect, useCallback } from 'react';
import { getCalendarEvents } from '../api/events';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EventCalendar = ({ selectedDate, onSelectDate, city, category }) => {
  // Current visible month (YYYY-MM)
  const todayObj = new Date();
  const todayStr = todayObj.toISOString().split('T')[0];

  const currentYear = todayObj.getFullYear();
  const currentMonthNum = todayObj.getMonth() + 1;
  const initialMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const [visibleMonth, setVisibleMonth] = useState(initialMonthStr);
  const [calendarCounts, setCalendarCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch month event counts from server API
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents({
        month: visibleMonth,
        city: city || undefined,
        category: category !== 'All' ? category : undefined,
      });

      if (data.success && data.data?.calendar) {
        const countsMap = {};
        data.data.calendar.forEach((item) => {
          countsMap[item.date] = item.count;
        });
        setCalendarCounts(countsMap);
      }
    } catch (err) {
      console.error('Failed to load calendar counts:', err);
    } finally {
      setLoading(false);
    }
  }, [visibleMonth, city, category]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Month Navigation
  const handlePrevMonth = () => {
    const [y, m] = visibleMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setVisibleMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = visibleMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setVisibleMonth(`${newY}-${newM}`);
  };

  // Build Grid Slots for the visible month
  const [yearNum, monthNum] = visibleMonth.split('-').map(Number);
  const firstDayOfWeek = new Date(yearNum, monthNum - 1, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  // Create array of day objects for rendering
  const gridDays = [];

  // Empty leading slots before 1st of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridDays.push({ key: `pad-prev-${i}`, isPadding: true });
  }

  // Days 1..daysInMonth
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${visibleMonth}-${String(d).padStart(2, '0')}`;
    const count = calendarCounts[dateStr] || 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;

    gridDays.push({
      key: dateStr,
      dateStr,
      dayNumber: d,
      count,
      isToday,
      isSelected,
      isPadding: false,
    });
  }

  // Month Display Title Format (e.g. October 2026)
  const monthTitle = new Date(yearNum, monthNum - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handleDateClick = (dateStr) => {
    if (selectedDate === dateStr) {
      onSelectDate(null); // Clear filter if clicked again
    } else {
      onSelectDate(dateStr);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <span>📅</span>
          <span>{monthTitle}</span>
        </h2>
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition-all"
            title="Previous Month"
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition-all"
            title="Next Month"
          >
            →
          </button>
        </div>
      </div>

      {/* Selected Date Indicator / Clear Button */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-indigo-300 font-medium">Filtering: <strong>{selectedDate}</strong></span>
          <button
            onClick={() => onSelectDate(null)}
            className="text-rose-400 hover:text-rose-300 font-bold ml-2"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Weekday Labels Header */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((wd) => (
          <div key={wd} className="text-[11px] font-semibold text-slate-500 uppercase">
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1 animate-pulse">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-9 bg-slate-800/40 rounded-lg"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {gridDays.map((slot) => {
            if (slot.isPadding) {
              return <div key={slot.key} className="h-9"></div>;
            }

            return (
              <button
                key={slot.key}
                onClick={() => handleDateClick(slot.dateStr)}
                className={`relative h-9 rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-all ${
                  slot.isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 font-bold scale-105 z-10'
                    : slot.isToday
                    ? 'border-2 border-indigo-500 text-indigo-300 bg-slate-950/80 font-bold'
                    : slot.count > 0
                    ? 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <span>{slot.dayNumber}</span>
                {slot.count > 0 && !slot.isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                )}
                {slot.count > 0 && slot.isSelected && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white"></span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
