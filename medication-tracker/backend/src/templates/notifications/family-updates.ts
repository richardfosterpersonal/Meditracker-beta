import { NotificationTemplate } from '../../types/notification.js';

export const familyNotificationTemplates: Record<string, NotificationTemplate> = {
  family_member_accepted: {
    title: 'Family Member Joined',
    body: '{{memberName}} has accepted your invitation and joined your family group.',
    data: {
      action: 'VIEW_FAMILY_MEMBER',
      memberId: '{{memberId}}',
    },
    priority: 'default',
  },

  family_member_added_medication: {
    title: 'New Medication Added',
    body: '{{memberName}} added {{medicationName}} to the family medications.',
    data: {
      action: 'VIEW_MEDICATION',
      medicationId: '{{medicationId}}',
    },
    priority: 'high',
  },

  family_member_updated_schedule: {
    title: 'Schedule Updated',
    body: '{{memberName}} updated the schedule for {{medicationName}}.',
    data: {
      action: 'VIEW_SCHEDULE',
      medicationId: '{{medicationId}}',
    },
    priority: 'high',
  },

  family_member_low_inventory: {
    title: 'Low Medication Inventory',
    body: '{{medicationName}} is running low. Only {{remainingDays}} days of supply left.',
    data: {
      action: 'VIEW_INVENTORY',
      medicationId: '{{medicationId}}',
    },
    priority: 'high',
  },

  family_member_missed_dose: {
    title: 'Missed Medication',
    body: '{{memberName}} missed their scheduled dose of {{medicationName}}.',
    data: {
      action: 'VIEW_COMPLIANCE',
      memberId: '{{memberId}}',
      medicationId: '{{medicationId}}',
    },
    priority: 'high',
  },

  family_permissions_updated: {
    title: 'Permissions Updated',
    body: 'Your permissions in the family group have been updated.',
    data: {
      action: 'VIEW_PERMISSIONS',
    },
    priority: 'default',
  },

  family_access_removed: {
    title: 'Family Access Removed',
    body: 'Your access to the family medication management has been removed.',
    data: {
      action: 'VIEW_MESSAGE',
      message: 'Contact the family group administrator if you think this is a mistake.',
    },
    priority: 'high',
  },

  family_subscription_expiring: {
    title: 'Family Subscription Expiring',
    body: 'Your family subscription will expire in {{daysRemaining}} days. Renew to maintain family access.',
    data: {
      action: 'RENEW_SUBSCRIPTION',
    },
    priority: 'high',
  },

  family_member_refill_reminder: {
    title: 'Medication Refill Reminder',
    body: 'Time to refill {{medicationName}} for {{memberName}}.',
    data: {
      action: 'VIEW_REFILL',
      medicationId: '{{medicationId}}',
      memberId: '{{memberId}}',
    },
    priority: 'high',
  },

  family_emergency_alert: {
    title: '🚨 Emergency Alert',
    body: '{{memberName}} has triggered an emergency alert.',
    data: {
      action: 'VIEW_EMERGENCY',
      memberId: '{{memberId}}',
    },
    priority: 'urgent',
  },
};

// Helper function to format notification with data;
export function formatFamilyNotification(
  type: keyof typeof familyNotificationTemplates: unknown,
  data: Record<string, string>
): NotificationTemplate {
  const template = familyNotificationTemplates[type];
  let title = template.title;
  let body = template.body;

  // Replace placeholders with actual data;
  Object.entries(data: unknown).forEach(([key: unknown, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    title = title.replace(placeholder: unknown, value: unknown);
    body = body.replace(placeholder: unknown, value: unknown);
  });

  return {
    ...template: unknown,
    title: unknown,
    body: unknown,
    data: {
      ...template.data: unknown,
      ...Object.fromEntries(
        Object.entries(template.data: unknown).map(([key: unknown, value]) => [
          key: unknown,
          typeof value === 'string' ? value.replace(/{{(\w+)}}/g: unknown, (_: unknown, p1: unknown) => data[p1] || '') : value: unknown,
        ])
      ),
    },
  };
}
