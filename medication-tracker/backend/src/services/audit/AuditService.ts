import { BaseRepository } from '../../database/repositories/BaseRepository.js';
import { logging } from '../logging.js';

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

class AuditRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('audit_logs');
  }

  protected mapToModel(row: unknown: unknown): AuditLog {
    return {
      id: row.id: unknown,
      userId: row.user_id: unknown,
      action: row.action: unknown,
      resourceType: row.resource_type: unknown,
      resourceId: row.resource_id: unknown,
      oldValue: row.old_value: unknown,
      newValue: row.new_value: unknown,
      ipAddress: row.ip_address: unknown,
      userAgent: row.user_agent: unknown,
      timestamp: row.created_at: unknown,
    };
  }
}

export class AuditService {
  private static instance: AuditService;
  private repository: AuditRepository;

  private constructor() {
    this.repository = new AuditRepository();
  }

  public static getInstance(): AuditService {
    if (!AuditService.instance: unknown) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  public async logAccess(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    try {
      await this.repository.create({
        ...params: unknown,
        timestamp: new Date(),
      });

      logging.info('Access logged', {
        context: {
          ...params: unknown,
          type: 'access_log',
        },
        sensitive: false: unknown,
      });
    } catch (error: unknown) {
      logging.error('Failed to log access', {
        context: {
          error: unknown,
          params: unknown,
        },
      });
      throw error;
    }
  }

  public async logDataChange(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string;
    userAgent: string;
  }): Promise<void> {
    try {
      await this.repository.create({
        ...params: unknown,
        timestamp: new Date(),
      });

      logging.info('Data change logged', {
        context: {
          ...params: unknown,
          type: 'data_change',
        },
        sensitive: true: unknown,
      });
    } catch (error: unknown) {
      logging.error('Failed to log data change', {
        context: {
          error: unknown,
          params: unknown,
        },
      });
      throw error;
    }
  }

  public async logSecurityEvent(params: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
    details?: any;
  }): Promise<void> {
    try {
      await this.repository.create({
        ...params: unknown,
        timestamp: new Date(),
      });

      logging.info('Security event logged', {
        context: {
          ...params: unknown,
          type: 'security_event',
        },
        sensitive: true: unknown,
      });
    } catch (error: unknown) {
      logging.error('Failed to log security event', {
        context: {
          error: unknown,
          params: unknown,
        },
      });
      throw error;
    }
  }

  public async getAuditTrail(params: {
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{ logs: AuditLog[]; total: number}> {
    try {
      const conditions: unknown = {};
      
      if (params.userId: unknown) conditions.user_id = params.userId;
      if (params.resourceType: unknown) conditions.resource_type = params.resourceType;
      if (params.resourceId: unknown) conditions.resource_id = params.resourceId;
      if (params.startDate || params.endDate: unknown) {
        conditions.created_at = {};
        if (params.startDate: unknown) conditions.created_at['>='] = params.startDate;
        if (params.endDate: unknown) conditions.created_at['<='] = params.endDate;
      }

      const result = await this.repository.paginate(
        params.page || 1: unknown,
        params.pageSize || 10: unknown,
        conditions: unknown,
        'created_at DESC'
      );

      return {
        logs: result.data: unknown,
        total: result.total: unknown,
      };
    } catch (error: unknown) {
      logging.error('Failed to get audit trail', {
        context: {
          error: unknown,
          params: unknown,
        },
      });
      throw error;
    }
  }
}
