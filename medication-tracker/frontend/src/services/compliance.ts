interface DoseRecord {
  medicationId: string;
  scheduledTime: string;
  takenTime?: string;
  status: 'taken' | 'missed' | 'late';
}

interface ComplianceStats {
  overall: number;
  lastWeek: number;
  lastMonth: number;
  missedDoses: number;
  lateDoses: number;
  totalDoses: number;
  streak: number;
}

export const calculateComplianceStats = (records: DoseRecord[]): ComplianceStats => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter records by time period
  const weekRecords = records.filter(r => new Date(r.scheduledTime) >= oneWeekAgo);
  const monthRecords = records.filter(r => new Date(r.scheduledTime) >= oneMonthAgo);

  // Calculate compliance rates
  const calculateRate = (recs: DoseRecord[]) => {
    if (recs.length === 0) return 100;
    const taken = recs.filter(r => r.status === 'taken').length;
    return (taken / recs.length) * 100;
  };

  // Count doses by status
  const missedDoses = records.filter(r => r.status === 'missed').length;
  const lateDoses = records.filter(r => r.status === 'late').length;
  const totalDoses = records.length;

  // Calculate streak
  const calculateStreak = (recs: DoseRecord[]) => {
    let currentStreak = 0;
    const sortedRecords = [...recs].sort((a, b) => 
      new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );

    // Group records by date
    const recordsByDate = sortedRecords.reduce((acc, record) => {
      const date = new Date(record.scheduledTime).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    }, {} as { [key: string]: DoseRecord[] });

    // Calculate streak
    for (const date in recordsByDate) {
      const dayRecords = recordsByDate[date];
      const allTaken = dayRecords.every(r => r.status === 'taken' || r.status === 'late');
      
      if (allTaken) {
        currentStreak++;
      } else {
        break;
      }
    }

    return currentStreak;
  };

  return {
    overall: calculateRate(records),
    lastWeek: calculateRate(weekRecords),
    lastMonth: calculateRate(monthRecords),
    missedDoses,
    lateDoses,
    totalDoses,
    streak: calculateStreak(records)
  };
};

export const isLateForDose = (scheduledTime: string, tolerance: number = 60): boolean => {
  const scheduled = new Date(scheduledTime).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - scheduled) / (1000 * 60);
  
  return diffMinutes > tolerance;
};

export const getDoseStatus = (
  scheduledTime: string,
  takenTime?: string,
  tolerance: number = 60
): 'taken' | 'missed' | 'late' => {
  if (!takenTime) {
    return isLateForDose(scheduledTime, tolerance) ? 'missed' : 'late';
  }

  const scheduled = new Date(scheduledTime).getTime();
  const taken = new Date(takenTime).getTime();
  const diffMinutes = (taken - scheduled) / (1000 * 60);

  if (diffMinutes <= tolerance) {
    return 'taken';
  }
  return 'late';
};
