import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Typography, Space, Modal } from 'antd';
import { PhoneOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEmergencyContext } from '../../contexts/EmergencyContext';
import { useNotification } from '../../hooks/useNotification';
import { EmergencyContact } from '../../types/emergency';
import { EmergencyService } from '../../services/EmergencyService';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface EmergencyAlertProps {
  patientId: string;
  medicationId?: string;
}

export const EmergencyAlert: React.FC<EmergencyAlertProps> = ({ patientId, medicationId }) => {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const { emergencyState, dispatch } = useEmergencyContext();
  const { showNotification } = useNotification();

  useEffect(() => {
    loadEmergencyContacts();
  }, [patientId]);

  const loadEmergencyContacts = async () => {
    try {
      const emergencyService = new EmergencyService();
      const contactList = await emergencyService.getEmergencyContacts(patientId);
      setContacts(contactList);
    } catch (error) {
      showNotification('Error loading emergency contacts', 'error');
    }
  };

  const handleEmergencyCall = async (contact: EmergencyContact) => {
    confirm({
      title: 'Initiate Emergency Call',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to call ${contact.name}?`,
      okText: 'Call Now',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setLoading(true);
        try {
          const emergencyService = new EmergencyService();
          await emergencyService.initiateEmergencyCall(patientId, contact.id, medicationId);
          showNotification('Emergency call initiated', 'success');
          dispatch({ type: 'SET_EMERGENCY_ACTIVE', payload: true });
        } catch (error) {
          showNotification('Failed to initiate emergency call', 'error');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <Card className="emergency-alert" data-testid="emergency-alert">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Alert
          message="Emergency Contact Information"
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          description="In case of emergency, contact:"
        />
        
        {contacts.length === 0 ? (
          <Alert
            message="No emergency contacts found"
            type="error"
            showIcon
            description="Please add emergency contacts in settings"
          />
        ) : (
          contacts.map((contact) => (
            <Card key={contact.id} size="small" className="emergency-contact">
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction="vertical">
                  <Title level={5}>{contact.name}</Title>
                  <Text type="secondary">{contact.relationship}</Text>
                  <Text>{contact.phone}</Text>
                </Space>
                <Button
                  type="primary"
                  danger
                  icon={<PhoneOutlined />}
                  loading={loading}
                  onClick={() => handleEmergencyCall(contact)}
                  data-testid="emergency-call-button"
                >
                  Call Now
                </Button>
              </Space>
            </Card>
          ))
        )}
        
        {emergencyState.isActive && (
          <Alert
            message="Emergency Services Notified"
            type="error"
            showIcon
            description="Emergency services have been notified. Please stay calm and follow their instructions."
          />
        )}
      </Space>
    </Card>
  );
};

export default EmergencyAlert;
