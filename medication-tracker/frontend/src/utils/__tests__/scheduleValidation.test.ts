import { DateTime } from 'luxon';
import {
  validateScheduleTime,
  validateScheduleDates,
  validateFrequency,
  validateSchedule,
  normalizeToUTC,
  isValidTimezone,
  getNextOccurrence,
  detectConflicts,
  ScheduleValidationError
} from '../scheduleValidation';
import { ScheduleType } from '../../components/ScheduleBuilder';

describe('Schedule Validation', () => {
  describe('validateScheduleTime', () => {
    it('should validate correct time', () => {
      expect(() => validateScheduleTime({ hour: 14, minute: 30 })).not.toThrow();
    });

    it('should throw on invalid hour', () => {
      expect(() => validateScheduleTime({ hour: 24, minute: 30 }))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on invalid minute', () => {
      expect(() => validateScheduleTime({ hour: 14, minute: 60 }))
        .toThrow(ScheduleValidationError);
    });

    it('should validate timezone', () => {
      expect(() => validateScheduleTime({ 
        hour: 14, 
        minute: 30, 
        timezone: 'America/New_York' 
      })).not.toThrow();
    });

    it('should throw on invalid timezone', () => {
      expect(() => validateScheduleTime({ 
        hour: 14, 
        minute: 30, 
        timezone: 'Invalid/Timezone' 
      })).toThrow(ScheduleValidationError);
    });
  });

  describe('validateScheduleDates', () => {
    it('should validate correct date range', () => {
      const startDate = DateTime.now().plus({ days: 1 }).toISO();
      const endDate = DateTime.now().plus({ days: 30 }).toISO();
      expect(() => validateScheduleDates(startDate!, endDate!)).not.toThrow();
    });

    it('should throw on past start date', () => {
      const startDate = DateTime.now().minus({ days: 1 }).toISO();
      expect(() => validateScheduleDates(startDate!))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on end date before start date', () => {
      const startDate = DateTime.now().plus({ days: 2 }).toISO();
      const endDate = DateTime.now().plus({ days: 1 }).toISO();
      expect(() => validateScheduleDates(startDate!, endDate!))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on excessive duration', () => {
      const startDate = DateTime.now().plus({ days: 1 }).toISO();
      const endDate = DateTime.now().plus({ years: 3 }).toISO();
      expect(() => validateScheduleDates(startDate!, endDate!))
        .toThrow(ScheduleValidationError);
    });
  });

  describe('validateFrequency', () => {
    it('should validate daily frequency', () => {
      expect(() => validateFrequency('daily')).not.toThrow();
    });

    it('should validate weekly frequency with valid days', () => {
      expect(() => validateFrequency('weekly', [0, 2, 4])).not.toThrow();
    });

    it('should validate monthly frequency with valid days', () => {
      expect(() => validateFrequency('monthly', undefined, [1, 15, 30]))
        .not.toThrow();
    });

    it('should throw on invalid weekly days', () => {
      expect(() => validateFrequency('weekly', [7]))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on invalid monthly days', () => {
      expect(() => validateFrequency('monthly', undefined, [0, 32]))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on duplicate days', () => {
      expect(() => validateFrequency('weekly', [1, 1, 2]))
        .toThrow(ScheduleValidationError);
    });
  });

  describe('validateSchedule', () => {
    const validSchedule = {
      id: '1',
      medicationId: '1',
      times: [
        { hour: 9, minute: 0 },
        { hour: 21, minute: 0 }
      ],
      startDate: DateTime.now().plus({ days: 1 }).toISO()!,
      frequency: 'daily' as const
    };

    it('should validate correct schedule', () => {
      expect(() => validateSchedule(validSchedule)).not.toThrow();
    });

    it('should throw on duplicate times', () => {
      const schedule = {
        ...validSchedule,
        times: [
          { hour: 9, minute: 0 },
          { hour: 9, minute: 0 }
        ]
      };
      expect(() => validateSchedule(schedule))
        .toThrow(ScheduleValidationError);
    });

    it('should throw on insufficient time between doses', () => {
      const schedule = {
        ...validSchedule,
        times: [
          { hour: 9, minute: 0 },
          { hour: 9, minute: 30 }
        ]
      };
      expect(() => validateSchedule(schedule))
        .toThrow(ScheduleValidationError);
    });
  });

  describe('getNextOccurrence', () => {
    const baseSchedule = {
      id: '1',
      medicationId: '1',
      times: [
        { hour: 9, minute: 0 },
        { hour: 21, minute: 0 }
      ],
      startDate: DateTime.now().toISO()!
    };

    it('should find next daily occurrence', () => {
      const schedule = {
        ...baseSchedule,
        frequency: 'daily' as const
      };
      const next = getNextOccurrence(schedule);
      expect(next).toBeTruthy();
      expect(next!.hour).toBe(9);
    });

    it('should find next weekly occurrence', () => {
      const schedule = {
        ...baseSchedule,
        frequency: 'weekly' as const,
        daysOfWeek: [1, 3, 5]
      };
      const next = getNextOccurrence(schedule);
      expect(next).toBeTruthy();
      expect([1, 3, 5]).toContain(next!.weekday);
    });

    it('should find next monthly occurrence', () => {
      const schedule = {
        ...baseSchedule,
        frequency: 'monthly' as const,
        daysOfMonth: [1, 15, 30]
      };
      const next = getNextOccurrence(schedule);
      expect(next).toBeTruthy();
      expect([1, 15, 30]).toContain(next!.day);
    });

    it('should handle timezone conversions', () => {
      const schedule = {
        ...baseSchedule,
        times: [
          { hour: 9, minute: 0, timezone: 'America/New_York' }
        ],
        frequency: 'daily' as const
      };
      const next = getNextOccurrence(schedule);
      expect(next).toBeTruthy();
    });
  });

  describe('Fixed Time Schedule', () => {
    it('should validate minimum time spacing between doses', () => {
      const schedule = {
        type: ScheduleType.FIXED_TIME,
        fixedTimeSlots: [
          { time: '08:00', dose: 1 },
          { time: '08:15', dose: 1 } // Too close to previous dose
        ]
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('UNSAFE_INTERVAL');
    });

    it('should accept valid time spacing', () => {
      const schedule = {
        type: ScheduleType.FIXED_TIME,
        fixedTimeSlots: [
          { time: '08:00', dose: 1 },
          { time: '20:00', dose: 1 }
        ]
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Interval Schedule', () => {
    it('should reject intervals less than 4 hours', () => {
      const schedule = {
        type: ScheduleType.INTERVAL,
        interval: {
          hours: 2,
          dose: 1
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('UNSAFE_INTERVAL');
    });

    it('should require intervals that divide evenly into 24 hours', () => {
      const schedule = {
        type: ScheduleType.INTERVAL,
        interval: {
          hours: 7,
          dose: 1
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('INVALID_TIME');
    });
  });

  describe('PRN Schedule', () => {
    it('should validate maximum daily dose', () => {
      const schedule = {
        type: ScheduleType.PRN,
        prn: {
          maxDailyDose: 8,
          minHoursBetween: 4,
          dose: 1
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('EXCEED_DAILY_LIMIT');
    });

    it('should require minimum hours between doses', () => {
      const schedule = {
        type: ScheduleType.PRN,
        prn: {
          maxDailyDose: 4,
          minHoursBetween: 2,
          dose: 1
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('UNSAFE_INTERVAL');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect overlapping fixed time schedules', () => {
      const existingSchedules = [{
        type: ScheduleType.FIXED_TIME,
        fixedTimeSlots: [
          { time: '09:00', dose: 1 }
        ]
      }];

      const newSchedule = {
        type: ScheduleType.FIXED_TIME,
        fixedTimeSlots: [
          { time: '09:05', dose: 1 }
        ]
      };

      const conflicts = detectConflicts(existingSchedules, newSchedule);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CONFLICT');
    });

    it('should detect conflicts between fixed and interval schedules', () => {
      const existingSchedules = [{
        type: ScheduleType.INTERVAL,
        interval: {
          hours: 12,
          dose: 1
        }
      }];

      const newSchedule = {
        type: ScheduleType.FIXED_TIME,
        fixedTimeSlots: [
          { time: '00:05', dose: 1 }
        ]
      };

      const conflicts = detectConflicts(existingSchedules, newSchedule);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('CONFLICT');
    });
  });

  describe('Complex Schedule Validation', () => {
    it('should validate tapered schedule steps', () => {
      const schedule = {
        type: ScheduleType.TAPERED,
        tapered: {
          startDose: 10,
          endDose: 0,
          days: 7,
          steps: 3
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('INVALID_TIME');
    });

    it('should validate cyclic schedule parameters', () => {
      const schedule = {
        type: ScheduleType.CYCLIC,
        cyclic: {
          daysOn: 0,
          daysOff: 1,
          dose: 1
        }
      };

      const errors = validateSchedule(schedule);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('INVALID_TIME');
    });
  });
});
