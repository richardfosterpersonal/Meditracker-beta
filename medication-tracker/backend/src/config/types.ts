export const TYPES = {
  // Core Services
  Logger: Symbol.for('Logger'),
  MedicationReferenceService: Symbol.for('MedicationReferenceService'),
  MedicationValidationService: Symbol.for('MedicationValidationService'),
  DrugInteractionService: Symbol.for('DrugInteractionService'),
  HerbDrugInteractionService: Symbol.for('HerbDrugInteractionService'),
  InteractionChecker: Symbol.for('InteractionChecker'),
  NotificationService: Symbol.for('NotificationService'),
  EmailService: Symbol.for('EmailService'),
  
  // New Services
  SchedulerService: Symbol.for('SchedulerService'),
  HealthCheck: Symbol.for('HealthCheck'),
  ErrorHandler: Symbol.for('ErrorHandler'),
  
  // Repositories
  MedicationRepository: Symbol.for('MedicationRepository'),
  NotificationRepository: Symbol.for('NotificationRepository'),
  ScheduleRepository: Symbol.for('ScheduleRepository'),
  
  // Utils
  ErrorTracking: Symbol.for('ErrorTracking'),
  Monitoring: Symbol.for('Monitoring'),
} as const;
