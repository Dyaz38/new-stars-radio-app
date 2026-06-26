import { STORAGE_KEYS } from '../constants';
import { remindersEnabledInSettings } from './eventReminders';

export interface StoredShowReminder {
  showId: number;
  title: string;
  dj: string;
  timeLabel: string;
  startsAt: string;
  remindedAt: string;
  notifiedAt?: string | null;
}

export function readShowReminders(): StoredShowReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOW_REMINDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredShowReminder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeShowReminders(items: StoredShowReminder[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHOW_REMINDERS, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

export function showShowReminderNotification(reminder: StoredShowReminder): void {
  if (!remindersEnabledInSettings()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const title = `📻 ${reminder.title}`;
  const body = `Starts in 15 minutes · with ${reminder.dj}`;
  const options: NotificationOptions = {
    body,
    icon: '/station-icon-192.png',
    badge: '/station-icon-192.png',
    tag: `show-reminder-${reminder.showId}`,
    data: { type: 'show-reminder', showId: reminder.showId },
  };

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready.then((registration) => {
      void registration.showNotification(title, options);
    });
    return;
  }

  new Notification(title, options);
}
