import { useCallback, useEffect, useState } from 'react';
import type { ScheduleDayKey, ScheduleShow } from '../types';
import { REMINDER_LEAD_MS } from '../utils/eventReminders';
import { getNextShowStartForDayGroup } from '../utils/scheduleTime';
import {
  readShowReminders,
  showShowReminderNotification,
  writeShowReminders,
  type StoredShowReminder,
} from '../utils/showReminders';

const MAX_TIMEOUT_MS = 2_147_483_647;

export type ShowReminderToggleResult = 'added' | 'removed' | 'denied';

export function useShowReminders() {
  const reminderKey = (dayKey: ScheduleDayKey, showId: number) => `${dayKey}:${showId}`;

  const [remindedIds, setRemindedIds] = useState<Set<string>>(
    () => new Set(readShowReminders().map((r) => reminderKey(r.dayKey ?? 'mon_thu', r.showId))),
  );

  const fireDueReminders = useCallback(() => {
    const now = Date.now();
    const items = readShowReminders();
    let changed = false;

    const updated = items.flatMap((reminder) => {
      let current = reminder;
      const startAt = new Date(current.startsAt);
      const startMs = startAt.getTime();
      if (Number.isNaN(startMs)) return [current];

      if (!current.notifiedAt && now >= startMs) {
        const dayKey = current.dayKey ?? 'mon_thu';
        current = {
          ...current,
          startsAt: getNextShowStartForDayGroup(
            current.timeLabel,
            dayKey,
            new Date(startMs + 1000),
          ).toISOString(),
          notifiedAt: null,
        };
        changed = true;
      }

      if (current.notifiedAt) return [current];

      const notifyAt = new Date(current.startsAt).getTime() - REMINDER_LEAD_MS;
      if (now >= notifyAt && now < startMs + 30 * 60 * 1000) {
        showShowReminderNotification(current);
        changed = true;
        return [
          {
            ...current,
            notifiedAt: new Date().toISOString(),
            startsAt: getNextShowStartForDayGroup(
              current.timeLabel,
              current.dayKey ?? 'mon_thu',
              new Date(startMs + 1000),
            ).toISOString(),
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
    (dayKey: ScheduleDayKey, showId: number) => remindedIds.has(reminderKey(dayKey, showId)),
    [remindedIds],
  );

  const toggleShowReminder = useCallback(
    async (slot: ScheduleShow, dayKey: ScheduleDayKey): Promise<ShowReminderToggleResult> => {
      const items = readShowReminders();
      const existing = items.find(
        (r) => r.showId === slot.id && (r.dayKey ?? 'mon_thu') === dayKey,
      );

      if (existing) {
        writeShowReminders(
          items.filter((r) => !(r.showId === slot.id && (r.dayKey ?? 'mon_thu') === dayKey)),
        );
        setRemindedIds((prev) => {
          const next = new Set(prev);
          next.delete(reminderKey(dayKey, slot.id));
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
        dayKey,
        title: slot.show,
        dj: slot.dj,
        timeLabel: slot.time,
        startsAt: getNextShowStartForDayGroup(slot.time, dayKey).toISOString(),
        remindedAt: new Date().toISOString(),
        notifiedAt: null,
      };

      writeShowReminders([...items, record]);
      setRemindedIds((prev) => new Set(prev).add(reminderKey(dayKey, slot.id)));
      fireDueReminders();
      return 'added';
    },
    [fireDueReminders],
  );

  return { isShowReminded, toggleShowReminder };
}
