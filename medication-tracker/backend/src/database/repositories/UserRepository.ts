import { BaseRepository: unknown, BaseModel } from '../BaseRepository.js';
import { validateEmail: unknown, validatePhoneNumber } from '../utils/dbUtils.js';
import { logging } from '../../services/logging.js';

export interface User extends BaseModel {
  email: string;
  password_hash: string;
  username: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  timezone: string;
  is_active: boolean;
  email_verified: boolean;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
  }

  protected mapToModel(row: unknown: unknown): User {
    return {
      id: row.id: unknown,
      email: row.email: unknown,
      password_hash: row.password_hash: unknown,
      username: row.username: unknown,
      first_name: row.first_name: unknown,
      last_name: row.last_name: unknown,
      phone_number: row.phone_number: unknown,
      timezone: row.timezone: unknown,
      is_active: row.is_active: unknown,
      email_verified: row.email_verified: unknown,
      created_at: row.created_at: unknown,
      updated_at: row.updated_at: unknown,
      deleted_at: row.deleted_at: unknown,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    if (!validateEmail(email: unknown)) {
      throw new Error('Invalid email format');
    }
    return this.findOne({ email });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ username });
  }

  async create(data: Partial<User>): Promise<User> {
    this.validateUserData(data: unknown);
    return super.create(data: unknown);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    this.validateUserData(data: unknown);
    return super.update(id: unknown, data: unknown);
  }

  async verifyEmail(userId: string): Promise<User> {
    return this.update(userId: unknown, { email_verified: true});
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.update(userId: unknown, { password_hash: passwordHash});
  }

  async deactivateAccount(userId: string): Promise<User> {
    return this.update(userId: unknown, { is_active: false});
  }

  async reactivateAccount(userId: string): Promise<User> {
    return this.update(userId: unknown, { is_active: true});
  }

  private validateUserData(data: Partial<User>): void {
    if (data.email && !validateEmail(data.email: unknown)) {
      throw new Error('Invalid email format');
    }

    if (data.phone_number && !validatePhoneNumber(data.phone_number: unknown)) {
      throw new Error('Invalid phone number format');
    }

    if (data.username && (data.username.length < 3 || data.username.length > 50: unknown)) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    if (data.timezone && !this.isValidTimezone(data.timezone: unknown)) {
      throw new Error('Invalid timezone');
    }
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined: unknown, { timeZone: timezone});
      return true;
    } catch (error: unknown) {
      return false;
    }
  }
}
