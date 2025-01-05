import React, { createContext, useContext, useState, useCallback } from 'react';
import { familyMemberService } from '../services/familyMemberService';
import { useAuth } from './AuthContext';

const FamilyMemberContext = createContext(null);

export const useFamilyMember = () => {
    const context = useContext(FamilyMemberContext);
    if (!context) {
        throw new Error('useFamilyMember must be used within a FamilyMemberProvider');
    }
    return context;
};

export const FamilyMemberProvider = ({ children }) => {
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { isAuthenticated } = useAuth();

    const fetchFamilyMembers = useCallback(async () => {
        if (!isAuthenticated) return;
        
        setLoading(true);
        setError(null);
        try {
            const data = await familyMemberService.getAllFamilyMembers();
            setFamilyMembers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const addFamilyMember = async (familyMemberData) => {
        setLoading(true);
        setError(null);
        try {
            const newFamilyMember = await familyMemberService.createFamilyMember(familyMemberData);
            setFamilyMembers(prev => [...prev, newFamilyMember]);
            return newFamilyMember;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const updateFamilyMember = async (id, familyMemberData) => {
        setLoading(true);
        setError(null);
        try {
            const updatedFamilyMember = await familyMemberService.updateFamilyMember(id, familyMemberData);
            setFamilyMembers(prev =>
                prev.map(member => member.id === id ? updatedFamilyMember : member)
            );
            return updatedFamilyMember;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const deleteFamilyMember = async (id) => {
        setLoading(true);
        setError(null);
        try {
            await familyMemberService.deleteFamilyMember(id);
            setFamilyMembers(prev => prev.filter(member => member.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getFamilyMemberMedications = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const data = await familyMemberService.getFamilyMemberMedications(id);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        familyMembers,
        loading,
        error,
        fetchFamilyMembers,
        addFamilyMember,
        updateFamilyMember,
        deleteFamilyMember,
        getFamilyMemberMedications,
    };

    return (
        <FamilyMemberContext.Provider value={value}>
            {children}
        </FamilyMemberContext.Provider>
    );
};
