import { useCallback, useEffect, useState } from 'react';
import type { StationEvent } from '../types';
import { getEventTimeRange } from '../utils/eventCalendar';
import {
  REMINDER_LEAD_MS,
  readEventReminders,
  showEventReminderNotification,
  writeEventReminders,
  type StoredEventReminder,
} from '../utils/eventReminders';

const MAX_TIMEOUT_MS = 2_147_483_647;

export type EventReminderToggleResult = 'added' | 'removed' | 'denied' | 'unavailable';

export function useEventReminders() {
  const [remindedIds, setRemindedIds] = useState<Set<number>>(
    () => new Set(readEventReminders().map((r) => r.eventId)),
  );

  const fireDueReminders = useCallback(() => {
    const now = Date.now();
    const items = readEventReminders();
    let changed = false;

    const updated = items.map((reminder) => {
      if (reminder.notifiedAt) return reminder;

      const start = new Date(reminder.startsAt).getTime();
      if (Number.isNaN(start)) return reminder;

      const notifyAt = start - REMINDER_LEAD_MS;
      if (now >= notifyAt && now < start + 30 * 60 * 1000) {
        showEventReminderNotification(reminder);
        changed = true;
        return { ...reminder, notifiedAt: new Date().toISOString() };
      }
      return reminder;
    });

    if (changed) {
      writeEventReminders(updated);
    }
  }, []);

  useEffect(() => {
    fireDueReminders();
    const interval = window.setInterval(fireDueReminders, 60_000);
    return () => window.clearInterval(interval);
  }, [fireDueReminders]);

  useEffect(() => {
    const timeouts: number[] = [];
    const now = Date.now();

    for (const reminder of readEventReminders()) {
      if (reminder.notifiedAt) continue;
      const start = new Date(reminder.startsAt).getTime();
      if (Number.isNaN(start)) continue;

      const notifyAt = start - REMINDER_LEAD_MS;
      const delay = notifyAt - now;
      if (delay <= 0 || delay > MAX_TIMEOUT_MS) continue;

      timeouts.push(
        window.setTimeout(() => {
          fireDueReminders();
        }, delay),
      );
    }

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [remindedIds, fireDueReminders]);

  const isEventReminded = useCallback(
    (eventId: number) => remindedIds.has(eventId),
    [remindedIds],
  );

  const toggleEventReminder = useCallback(
    async (event: StationEvent): Promise<EventReminderToggleResult> => {
      const range = getEventTimeRange(event);
      if (!range || event.status === 'past' || !event.startsAt) {
        return 'unavailable';
      }

      const items = readEventReminders();
      const existing = items.find((r) => r.eventId === event.id);

      if (existing) {
        writeEventReminders(items.filter((r) => r.eventId !== event.id));
        setRemindedIds((prev) => {
          const next = new Set(prev);
          next.delete(event.id);
          return next;
        });
        return 'removed';
      }

      if ('Notification' in window && Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          return 'denied';
        }
      }

      const record: StoredEventReminder = {
        eventId: event.id,
        title: event.title,
        startsAt: event.startsAt,
        location: event.location,
        dateLabel: event.dateLabel,
        remindedAt: new Date().toISOString(),
        notifiedAt: null,
      };

      writeEventReminders([...items, record]);
      setRemindedIds((prev) => new Set(prev).add(event.id));
      fireDueReminders();
      return 'added';
    },
    [fireDueReminders],
  );

  return { isEventReminded, toggleEventReminder };
}
