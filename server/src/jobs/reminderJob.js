const cron = require('node-cron');
const Rsvp = require('../models/Rsvp');
const Notification = require('../models/Notification');
const { emitToUserRoom } = require('../sockets/socketManager');

/**
 * Scan database for due reminders, create Notification documents & emit socket events
 */
const checkAndTriggerReminders = async () => {
  const now = new Date();
  const nowMs = now.getTime();

  // Find all RSVPs with active, unnotified reminders
  const rsvps = await Rsvp.find({
    'reminder.enabled': true,
    'reminder.notified': false,
  });

  const triggered = [];

  for (const rsvp of rsvps) {
    const { eventSnapshot, reminder } = rsvp;
    if (!eventSnapshot || !eventSnapshot.date) continue;

    const timeStr = eventSnapshot.time || '19:00';
    const eventStart = new Date(`${eventSnapshot.date}T${timeStr}:00`);

    // Ensure valid date parsing
    if (isNaN(eventStart.getTime())) continue;

    const leadTimeMs = (reminder.remindBeforeMinutes || 60) * 60 * 1000;
    const reminderDueMs = eventStart.getTime() - leadTimeMs;

    // Trigger if reminder lead time has arrived AND event is still in the future
    if (reminderDueMs <= nowMs && eventStart.getTime() > nowMs) {
      rsvp.reminder.notified = true;
      await rsvp.save();

      const notification = await Notification.create({
        user: rsvp.user,
        title: `Reminder: ${eventSnapshot.title}`,
        message: `Your event "${eventSnapshot.title}" is starting in ${reminder.remindBeforeMinutes} minutes at ${eventSnapshot.venue}!`,
        eventId: rsvp.eventId,
        read: false,
      });

      // Emit real-time socket notification to owner's room
      emitToUserRoom(rsvp.user, 'reminder:due', notification.toJSON());

      triggered.push(notification.toJSON());
    }
  }

  return {
    checkedCount: rsvps.length,
    triggeredCount: triggered.length,
    notifications: triggered,
  };
};

/**
 * Start recurring cron job (runs every 1 minute)
 */
const startReminderJob = () => {
  console.log('[Cron Job]: Reminder background worker initialized (* * * * *)');

  cron.schedule('* * * * *', async () => {
    try {
      const res = await checkAndTriggerReminders();
      if (res.triggeredCount > 0) {
        console.log(`[Cron Job]: Triggered ${res.triggeredCount} event reminders.`);
      }
    } catch (err) {
      console.error('[Cron Job Error]:', err.message);
    }
  });
};

module.exports = {
  checkAndTriggerReminders,
  startReminderJob,
};
