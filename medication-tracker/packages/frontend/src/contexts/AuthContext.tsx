import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { login as authLogin, register as authRegister, logout as authLogout, getCurrentUser } from '../services/auth';
import { AuthContextType, User, RegisterData, AuthResponse } from '../types/auth';

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            try {
                if (localStorage.getItem('token')) {
                    const userData = await getCurrentUser();
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                authLogout();
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string): Promise<AuthResponse> => {
        try {
            const response = await authLogin(email, password);
            const userData = await getCurrentUser();
            setUser(userData);
            return response;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const register = async (userData: RegisterData): Promise<AuthResponse> => {
        try {
            const response = await authRegister(userData);
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            return response;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = () => {
        authLogout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            register,
            loading,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
