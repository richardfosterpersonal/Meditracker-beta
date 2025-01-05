import { MedicationSafety } from '../medicationSafety';
import { openDB } from 'idb';

// Mock IDB
const mockDB = {
  add: jest.fn(),
  get: jest.fn(),
  getAllFromIndex: jest.fn(),
  transaction: jest.fn(),
};

jest.mock('idb', () => ({
  openDB: jest.fn().mockResolvedValue(mockDB),
}));

describe('MedicationSafety', () => {
  const userId = 'test-user';
  const medicationId = 'test-med';

  beforeEach(() => {
    jest.clearAllMocks();
    mockDB.getAllFromIndex.mockReset();
    mockDB.get.mockReset();
    mockDB.add.mockReset();
  });

  describe('checkSafety', () => {
    it('should pass safety check when no recent doses exist', async () => {
      mockDB.getAllFromIndex.mockResolvedValue([]);
      mockDB.get.mockResolvedValue(null);

      const result = await MedicationSafety.checkSafety(medicationId, userId);

      expect(result.safe).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect double dosing', async () => {
      const now = new Date();
      const recentDose = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      mockDB.getAllFromIndex.mockResolvedValueOnce([
        { medicationId, timestamp: recentDose.toISOString() },
      ]);

      const result = await MedicationSafety.checkSafety(medicationId, userId, now);

      expect(result.safe).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Too soon for next dose'));
    });

    it('should detect daily limit exceeded', async () => {
      const now = new Date();
      const doses = Array(4).fill(null).map((_, i) => ({
        medicationId,
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
      }));

      mockDB.getAllFromIndex
        .mockResolvedValueOnce([]) // for double dose check
        .mockResolvedValueOnce(doses); // for daily limit check

      const result = await MedicationSafety.checkSafety(medicationId, userId, now);

      expect(result.safe).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Maximum daily doses'));
    });

    it('should detect medication interactions', async () => {
      const interaction = {
        medicationA: medicationId,
        medicationB: 'other-med',
        severity: 'high',
        description: 'Dangerous interaction',
        recommendation: 'Avoid combination',
      };

      mockDB.getAllFromIndex.mockResolvedValue([]);
      mockDB.get.mockResolvedValue(interaction);

      const result = await MedicationSafety.checkSafety(medicationId, userId);

      expect(result.safe).toBe(false);
      expect(result.interactions).toContainEqual(interaction);
      expect(result.errors).toContain('Severe medication interaction detected');
    });
  });

  describe('recordDose', () => {
    it('should record a new dose', async () => {
      const now = new Date();
      await MedicationSafety.recordDose(medicationId, userId, now);

      expect(mockDB.add).toHaveBeenCalledWith('recent-doses', {
        medicationId,
        userId,
        timestamp: now.toISOString(),
      });
    });
  });
});
