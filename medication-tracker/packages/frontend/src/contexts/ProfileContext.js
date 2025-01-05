import React, { createContext, useContext, useState, useCallback } from 'react';
import { profileService } from '../services/profileService';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};

export const ProfileProvider = ({ children }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isAuthenticated } = useAuth();

    const fetchProfile = useCallback(async () => {
        if (!isAuthenticated) return;
        
        setLoading(true);
        setError(null);
        try {
            const data = await profileService.getProfile();
            setProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const updateProfile = async (profileData) => {
        setLoading(true);
        setError(null);
        try {
            const updatedProfile = await profileService.updateProfile(profileData);
            setProfile(updatedProfile);
            return updatedProfile;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateEmergencyContact = async (emergencyContactData) => {
        setLoading(true);
        setError(null);
        try {
            const updatedProfile = await profileService.updateEmergencyContact(emergencyContactData);
            setProfile(prev => ({
                ...prev,
                emergencyContact: updatedProfile.emergencyContact
            }));
            return updatedProfile;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const changePassword = async (passwordData) => {
        setLoading(true);
        setError(null);
        try {
            await profileService.changePassword(passwordData);
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        profile,
        loading,
        error,
        fetchProfile,
        updateProfile,
        updateEmergencyContact,
        changePassword,
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
};
