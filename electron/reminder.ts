import { Database, Todo } from './database';

export class ReminderService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private notifiedIds: Set<string> = new Set();

  constructor(
    private db: Database,
    private onReminder: (todo: Todo) => void
  ) {}

  start() {
    // Check every 15 seconds
    this.intervalId = setInterval(() => this.check(), 15000);
    // Initial check
    this.check();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reschedule() {
    this.notifiedIds.clear();
  }

  private check() {
    try {
      const pending = this.db.getPendingReminders();
      for (const todo of pending) {
        if (!this.notifiedIds.has(todo.id)) {
          this.notifiedIds.add(todo.id);
          try {
            this.onReminder(todo);
          } catch (err) {
            console.error(`Reminder callback failed for todo ${todo.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('Reminder check failed:', err);
    }
  }
}
