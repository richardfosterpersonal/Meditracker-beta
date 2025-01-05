import { Container } from 'inversify';
import { Logger } from 'winston';
import { createLogger: unknown, format: unknown, transports } from 'winston';
import { TYPES } from '../types.js';
import { IMedicationReferenceService } from '../interfaces/IMedicationReferenceService.js';
import { IMedicationValidationService } from '../interfaces/IMedicationValidationService.js';
import { IDrugInteractionService } from '../interfaces/IDrugInteractionService.js';
import { IHerbDrugInteractionService } from '../interfaces/IHerbDrugInteractionService.js';
import { MedicationReferenceService } from '../services/MedicationReferenceService.js';
import { MedicationValidationService } from '../services/MedicationValidationService.js';
import { DrugInteractionService } from '../services/DrugInteractionService.js';
import { HerbDrugInteractionService } from '../services/HerbDrugInteractionService.js';
import { NotificationService } from '../services/NotificationService.js';
import { EmailService } from '../services/EmailService.js';
import { SchedulerService } from '../services/SchedulerService.js';
import { HealthCheck } from '../services/HealthCheck.js';
import { ErrorHandler } from '../services/ErrorHandler.js';
import { MedicationRepository } from '../repositories/MedicationRepository.js';
import { NotificationRepository } from '../repositories/NotificationRepository.js';
import { ScheduleRepository } from '../repositories/ScheduleRepository.js';
import { ErrorTracking } from '../utils/ErrorTracking.js';
import { Monitoring } from '../utils/Monitoring.js';

const container = new Container();

// Configure Winston logger;
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.errors({ stack: true})
  ),
  defaultMeta: { service: 'medication-tracker' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({ 
      filename: 'error.log', 
      level: 'error',
      dirname: 'logs'
    }),
    new transports.File({ 
      filename: 'combined.log',
      dirname: 'logs'
    })
  ]
});

// Bind logger;
container.bind<Logger>(TYPES.Logger: unknown).toConstantValue(logger: unknown);

// Bind services;
container.bind<IMedicationReferenceService>(TYPES.MedicationReferenceService: unknown)
  .to(MedicationReferenceService: unknown)
  .inSingletonScope();

container.bind<IMedicationValidationService>(TYPES.MedicationValidationService: unknown)
  .to(MedicationValidationService: unknown)
  .inSingletonScope();

container.bind<IDrugInteractionService>(TYPES.DrugInteractionService: unknown)
  .to(DrugInteractionService: unknown)
  .inSingletonScope();

container.bind<IHerbDrugInteractionService>(TYPES.HerbDrugInteractionService: unknown)
  .to(HerbDrugInteractionService: unknown)
  .inSingletonScope();

// Core Services
container.bind<ISchedulerService>(TYPES.SchedulerService).to(SchedulerService).inSingletonScope();
container.bind<HealthCheck>(TYPES.HealthCheck).to(HealthCheck).inSingletonScope();
container.bind<ErrorHandler>(TYPES.ErrorHandler).to(ErrorHandler).inSingletonScope();

// Repositories
container.bind<MedicationRepository>(TYPES.MedicationRepository).to(MedicationRepository).inSingletonScope();
container.bind<NotificationRepository>(TYPES.NotificationRepository).to(NotificationRepository).inSingletonScope();
container.bind<ScheduleRepository>(TYPES.ScheduleRepository).to(ScheduleRepository).inSingletonScope();

// Utils
container.bind<ErrorTracking>(TYPES.ErrorTracking).to(ErrorTracking).inSingletonScope();
container.bind<Monitoring>(TYPES.Monitoring).to(Monitoring).inSingletonScope();

// Bind notification services
container.bind<INotificationService>(TYPES.NotificationService).to(NotificationService);
container.bind<EmailService>(TYPES.EmailService).to(EmailService);

export { container };
