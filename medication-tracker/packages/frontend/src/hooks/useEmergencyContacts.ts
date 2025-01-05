import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';
import { liabilityProtection } from '../utils/liabilityProtection';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  isVerified: boolean;
}

interface UseEmergencyContactsReturn {
  contacts: EmergencyContact[];
  loading: boolean;
  error: Error | null;
  addContact: (contact: Omit<EmergencyContact, 'id' | 'isVerified'>) => Promise<void>;
  updateContact: (id: string, contact: Partial<EmergencyContact>) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  verifyContact: (id: string, verificationCode: string) => Promise<void>;
}

export function useEmergencyContacts(): UseEmergencyContactsReturn {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { getToken } = useAuth();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get('/api/emergency-contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
      
      // Log access for liability protection
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACTS_ACCESS',
        'current-user',
        { action: 'VIEW', count: response.data.length }
      );
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const addContact = async (contact: Omit<EmergencyContact, 'id' | 'isVerified'>) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.post('/api/emergency-contacts', contact, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setContacts([...contacts, response.data]);
      
      // Log for liability protection
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_ADDED',
        'current-user',
        { contact: response.data },
        true
      );
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateContact = async (id: string, contactUpdate: Partial<EmergencyContact>) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.put(`/api/emergency-contacts/${id}`, contactUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setContacts(contacts.map(c => c.id === id ? response.data : c));
      
      // Log for liability protection
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_UPDATED',
        'current-user',
        { 
          contactId: id,
          updates: contactUpdate 
        },
        true
      );
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeContact = async (id: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      await axios.delete(`/api/emergency-contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setContacts(contacts.filter(c => c.id !== id));
      
      // Log for liability protection
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_REMOVED',
        'current-user',
        { contactId: id },
        true
      );
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyContact = async (id: string, verificationCode: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.post(
        `/api/emergency-contacts/${id}/verify`,
        { verificationCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setContacts(contacts.map(c => c.id === id ? { ...c, isVerified: true } : c));
      
      // Log for liability protection
      liabilityProtection.logCriticalAction(
        'EMERGENCY_CONTACT_VERIFIED',
        'current-user',
        { contactId: id },
        true
      );
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    contacts,
    loading,
    error,
    addContact,
    updateContact,
    removeContact,
    verifyContact,
  };
}
