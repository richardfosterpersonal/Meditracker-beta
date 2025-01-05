import { Medication, MedicationLog } from '@medication-tracker/shared';
import { addDays, parseISO, isWithinInterval } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

export class MedicationService {
  calculateNextDose(medication: Medication, lastLog?: MedicationLog): Date {
    const schedule = medication.schedule;
    const now = new Date();
    const timezone = schedule.timezone;

    switch (schedule.type) {
      case 'daily': {
        const nextTime = schedule.times.find(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const today = zonedTimeToUtc(new Date().setHours(hours, minutes, 0, 0), timezone);
          return today > now;
        });

        if (nextTime) {
          const [hours, minutes] = nextTime.split(':').map(Number);
          return zonedTimeToUtc(new Date().setHours(hours, minutes, 0, 0), timezone);
        } else {
          const [hours, minutes] = schedule.times[0].split(':').map(Number);
          return zonedTimeToUtc(addDays(new Date().setHours(hours, minutes, 0, 0), 1), timezone);
        }
      }

      case 'weekly': {
        if (!schedule.days) throw new Error('Weekly schedule must specify days');
        
        const today = new Date().getDay();
        const nextDay = schedule.days.find(day => day > today);
        
        if (nextDay) {
          const daysToAdd = nextDay - today;
          const [hours, minutes] = schedule.times[0].split(':').map(Number);
          return zonedTimeToUtc(addDays(new Date().setHours(hours, minutes, 0, 0), daysToAdd), timezone);
        } else {
          const daysToAdd = 7 - today + schedule.days[0];
          const [hours, minutes] = schedule.times[0].split(':').map(Number);
          return zonedTimeToUtc(addDays(new Date().setHours(hours, minutes, 0, 0), daysToAdd), timezone);
        }
      }

      // Add other schedule types here

      default:
        throw new Error(`Unsupported schedule type: ${schedule.type}`);
    }
  }

  isWithinDoseWindow(medication: Medication, timestamp: Date): boolean {
    const schedule = medication.schedule;
    const windowStart = parseISO(schedule.startDate);
    const windowEnd = schedule.endDate ? parseISO(schedule.endDate) : addDays(new Date(), 365);

    return isWithinInterval(timestamp, { start: windowStart, end: windowEnd });
  }

  calculateAdherence(medication: Medication, logs: MedicationLog[]): number {
    const schedule = medication.schedule;
    const startDate = parseISO(schedule.startDate);
    const endDate = schedule.endDate ? parseISO(schedule.endDate) : new Date();

    // Calculate expected doses
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    let expectedDoses = 0;

    switch (schedule.type) {
      case 'daily':
        expectedDoses = days * schedule.times.length;
        break;
      case 'weekly':
        expectedDoses = Math.floor(days / 7) * (schedule.days?.length || 0) * schedule.times.length;
        break;
      // Add other schedule types here
    }

    // Count actual doses taken
    const takenDoses = logs.filter(log => log.action === 'taken').length;

    return expectedDoses > 0 ? (takenDoses / expectedDoses) * 100 : 0;
  }
}
