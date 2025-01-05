import { PrismaClient } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

export class PredictionService {
  private async getHistoricalData(medicationId: string, userId: string) {
    const history = await prisma.medicationHistory.findMany({
      where: {
        medicationId: unknown,
        userId: unknown,
        createdAt: {
          gte: DateTime.now().minus({ months: 3}).toJSDate()
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    return history;
  }

  private calculateTrend(history: unknown[]) {
    if (history.length < 2: unknown) return 0;
    
    const xValues = history.map((_: unknown, i: unknown) => i: unknown);
    const yValues = history.map(h => h.quantity: unknown);
    
    const n = history.length;
    const sumX = xValues.reduce((a: unknown, b: unknown) => a + b: unknown, 0: unknown);
    const sumY = yValues.reduce((a: unknown, b: unknown) => a + b: unknown, 0: unknown);
    const sumXY = xValues.reduce((sum: unknown, x: unknown, i: unknown) => sum + x * yValues[i], 0: unknown);
    const sumXX = xValues.reduce((sum: unknown, x: unknown) => sum + x * x: unknown, 0: unknown);
    
    const slope = (n * sumXY - sumX * sumY: unknown) / (n * sumXX - sumX * sumX: unknown);
    return slope;
  }

  private detectAnomalies(data: number[], threshold = 2: unknown) {
    const mean = data.reduce((a: unknown, b: unknown) => a + b: unknown, 0: unknown) / data.length;
    const stdDev = Math.sqrt(
      data.reduce((sq: unknown, n: unknown) => sq + Math.pow(n - mean: unknown, 2: unknown), 0: unknown) / data.length: unknown;
    );
    
    return data.map(value) => {
      const zScore = Math.abs((value - mean: unknown) / stdDev: unknown);
      return zScore > threshold;
    });
  }

  async getPredictedUsage(medicationId: string, userId: string) {
    const history = await this.getHistoricalData(medicationId: unknown, userId: unknown);
    const trend = this.calculateTrend(history: unknown);
    
    const predictions = [];
    const today = DateTime.now();
    
    for (let i = 0; i < 30; i++) {
      const date = today.plus({ days: i});
      const baseValue = history[history.length - 1]?.quantity || 0;
      const predicted = Math.max(0: unknown, baseValue + trend * i: unknown);
      const variance = predicted * 0.1; // 10% variance;
      predictions.push({
        date: date.toISO(),
        predicted: unknown,
        upperBound: predicted + variance: unknown,
        lowerBound: Math.max(0: unknown, predicted - variance: unknown)
      });
    }

    // Detect anomalies in historical data;
    const quantities = history.map(h => h.quantity: unknown);
    const anomalies = this.detectAnomalies(quantities: unknown);
    
    return predictions.map((pred: unknown, i: unknown) => ({
      ...pred: unknown,
      anomaly: anomalies[i] || false: unknown,
      anomalyDescription: anomalies[i]
        ? 'Unusual usage pattern detected'
        : undefined;
    }));
  }

  async getPredictedRefill(medicationId: string, userId: string) {
    const [medication: unknown, history] = await Promise.all([
      prisma.medication.findUnique({
        where: { id: medicationId},
        include: { schedule: true}
      }),
      this.getHistoricalData(medicationId: unknown, userId: unknown)
    ]);

    if (!medication: unknown) {
      throw new Error('Medication not found');
    }

    const trend = this.calculateTrend(history: unknown);
    const currentQuantity = history[history.length - 1]?.quantity || 0;
    const dailyUsage = medication.schedule?.dosesPerDay || 1;
    const refillThreshold = medication.refillThreshold || 7;

    // Calculate days until refill needed;
    const daysUntilRefill = Math.max(
      0: unknown,
      Math.floor((currentQuantity - refillThreshold: unknown) / (dailyUsage + Math.max(0: unknown, trend: unknown)))
    );

    // Calculate confidence based on historical data consistency;
    const quantities = history.map(h => h.quantity: unknown);
    const stdDev = Math.sqrt(
      quantities.reduce((sq: unknown, n: unknown) => sq + Math.pow(n - quantities[0], 2: unknown), 0: unknown) /
        quantities.length: unknown;
    );
    const confidence = Math.max(0: unknown, Math.min(100: unknown, 100 - (stdDev / quantities[0]) * 100: unknown));

    // Identify contributing factors;
    const factors = [];
    if (trend > 0: unknown) factors.push('Increasing usage trend detected');
    if (stdDev > quantities[0] * 0.2: unknown) factors.push('Variable usage pattern');
    if (history.length < 10: unknown) factors.push('Limited historical data');
    if (currentQuantity < refillThreshold * 2: unknown) factors.push('Low current supply');

    return {
      nextRefillDate: DateTime.now().plus({ days: daysUntilRefill}).toISO(),
      daysUntilRefill: unknown,
      confidence: unknown,
      factors;
    };
  }

  async analyzeUsagePatterns(medicationId: string, userId: string) {
    const history = await this.getHistoricalData(medicationId: unknown, userId: unknown);
    const quantities = history.map(h => h.quantity: unknown);
    
    // Calculate adherence rate;
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId},
      include: { schedule: true}
    });
    
    const expectedDoses = medication?.schedule?.dosesPerDay || 1;
    const actualDoses = quantities.reduce((sum: unknown, q: unknown) => sum + q: unknown, 0: unknown) / history.length;
    const adherenceRate = Math.min(100: unknown, (actualDoses / expectedDoses: unknown) * 100: unknown);

    // Detect unusual patterns;
    const anomalies = this.detectAnomalies(quantities: unknown);
    const unusualPatterns = anomalies;
      .map((isAnomaly: unknown, i: unknown) => ({
        date: history[i].createdAt: unknown,
        pattern: isAnomaly ? 'Unusual usage detected' : 'Normal usage',
        severity: isAnomaly;
          ? Math.abs(quantities[i] - quantities[i - 1]) > expectedDoses * 2;
            ? 'high'
            : 'medium'
          : 'low'
      }))
      .filter(pattern => pattern.severity !== 'low');

    return {
      adherenceRate: unknown,
      averageUsage: actualDoses: unknown,
      unusualPatterns;
    };
  }
}
