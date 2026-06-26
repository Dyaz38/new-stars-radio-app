import { useCallback, useEffect, useState } from 'react';
import type { ScheduleShow } from '../types';
import { REMINDER_LEAD_MS } from '../utils/eventReminders';
import { getFollowingShowStartAt, getNextShowStartAt } from '../utils/scheduleTime';
import {
  readShowReminders,
  showShowReminderNotification,
  writeShowReminders,
  type StoredShowReminder,
} from '../utils/showReminders';

const MAX_TIMEOUT_MS = 2_147_483_647;

export type ShowReminderToggleResult = 'added' | 'removed' | 'denied';

export function useShowReminders() {
  const [remindedIds, setRemindedIds] = useState<Set<number>>(
    () => new Set(readShowReminders().map((r) => r.showId)),
  );

  const fireDueReminders = useCallback(() => {
    const now = Date.now();
    const items = readShowReminders();
    let changed = false;

    const updated = items.flatMap((reminder) => {
      let current = reminder;
      const start = new Date(current.startsAt).getTime();
      if (Number.isNaN(start)) return [current];

      if (!current.notifiedAt && now >= start) {
        current = {
          ...current,
          startsAt: getFollowingShowStartAt(current.timeLabel, new Date(start)).toISOString(),
          notifiedAt: null,
        };
        changed = true;
      }

      if (current.notifiedAt) return [current];

      const notifyAt = new Date(current.startsAt).getTime() - REMINDER_LEAD_MS;
      if (now >= notifyAt && now < start + 30 * 60 * 1000) {
        showShowReminderNotification(current);
        changed = true;
        return [
          {
            ...current,
            notifiedAt: new Date().toISOString(),
            startsAt: getFollowingShowStartAt(current.timeLabel, new Date(start)).toISOString(),
          },
        ];
      }

      return [current];
    });

    if (changed) {
      writeShowReminders(updated);
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

    for (const reminder of readShowReminders()) {
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

  const isShowReminded = useCallback(
    (showId: number) => remindedIds.has(showId),
    [remindedIds],
  );

  const toggleShowReminder = useCallback(
    async (slot: ScheduleShow): Promise<ShowReminderToggleResult> => {
      const items = readShowReminders();
      const existing = items.find((r) => r.showId === slot.id);

      if (existing) {
        writeShowReminders(items.filter((r) => r.showId !== slot.id));
        setRemindedIds((prev) => {
          const next = new Set(prev);
          next.delete(slot.id);
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

      const record: StoredShowReminder = {
        showId: slot.id,
        title: slot.show,
        dj: slot.dj,
        timeLabel: slot.time,
        startsAt: getNextShowStartAt(slot.time).toISOString(),
        remindedAt: new Date().toISOString(),
        notifiedAt: null,
      };

      writeShowReminders([...items, record]);
      setRemindedIds((prev) => new Set(prev).add(slot.id));
      fireDueReminders();
      return 'added';
    },
    [fireDueReminders],
  );

  return { isShowReminded, toggleShowReminder };
}
