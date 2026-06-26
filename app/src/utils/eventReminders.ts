import { STORAGE_KEYS } from '../constants';

export interface StoredEventReminder {
  eventId: number;
  title: string;
  startsAt: string;
  location: string;
  dateLabel: string;
  remindedAt: string;
  notifiedAt?: string | null;
}

/** Fire the browser notification this many ms before event start. */
export const EVENT_REMINDER_LEAD_MS = 15 * 60 * 1000;

export function readEventReminders(): StoredEventReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EVENT_REMINDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEventReminder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeEventReminders(items: StoredEventReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENT_REMINDERS, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

export function eventRemindersEnabledInSettings(): boolean {
  try {
    const raw = localStorage.getItem('newstarsradio-notification-preferences');
    if (!raw) return true;
    const prefs = JSON.parse(raw) as { showReminders?: boolean };
    return prefs.showReminders !== false;
  } catch {
    return true;
  }
}

export function showEventReminderNotification(reminder: StoredEventReminder): void {
  if (!eventRemindersEnabledInSettings()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const title = `📅 ${reminder.title}`;
  const body = `Starts in 15 minutes · ${reminder.location}`;
  const options: NotificationOptions = {
    body,
    icon: '/station-icon-192.png',
    badge: '/station-icon-192.png',
    tag: `event-reminder-${reminder.eventId}`,
    data: { type: 'event-reminder', eventId: reminder.eventId },
  };

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      void registration.showNotification(title, options);
    });
    return;
  }

  new Notification(title, options);
}
