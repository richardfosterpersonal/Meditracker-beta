export interface User {
    id: string;
    email: string;
    name: string;
    role?: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token?: string;
    user?: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
}

export interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<AuthResponse>;
    logout: () => void;
    register: (userData: RegisterData) => Promise<AuthResponse>;
    loading: boolean;
    isAuthenticated: boolean;
}
