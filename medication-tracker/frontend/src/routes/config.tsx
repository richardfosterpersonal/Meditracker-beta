import React, { lazy } from 'react';
import { withPerformanceTracking } from '../utils/withPerformanceTracking';
import { RouteObject } from 'react-router-dom';

// Lazy load components
const Layout = lazy(() => import('../components/Layout/Layout'));
const MedicationsPage = lazy(() => import('../pages/MedicationsPage'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const AddMedication = lazy(() => import('../components/AddMedication'));
const EditMedication = lazy(() => import('../components/EditMedication'));
const Dashboard = lazy(() => import('../components/Dashboard'));
const Profile = lazy(() => import('../components/Profile'));
const FamilyMembers = lazy(() => import('../components/FamilyMembers'));
const NotificationSettings = lazy(() => import('../components/NotificationSettings'));

// Wrap components with performance tracking
const TrackedMedicationsPage = withPerformanceTracking(MedicationsPage, 'MedicationsPage');
const TrackedLayout = withPerformanceTracking(Layout, 'Layout');
const TrackedLogin = withPerformanceTracking(Login, 'Login');
const TrackedRegister = withPerformanceTracking(Register, 'Register');
const TrackedDashboard = withPerformanceTracking(Dashboard, 'Dashboard');
const TrackedProfile = withPerformanceTracking(Profile, 'Profile');
const TrackedFamilyMembers = withPerformanceTracking(FamilyMembers, 'FamilyMembers');
const TrackedNotificationSettings = withPerformanceTracking(NotificationSettings, 'NotificationSettings');

// Define route metadata for analytics and performance tracking
interface RouteMetadata {
    title: string;
    loadingMessage: string;
    analyticsPageView?: string;
}

export interface EnhancedRouteObject extends RouteObject {
    metadata: RouteMetadata;
    children?: EnhancedRouteObject[];
}

export const routes: EnhancedRouteObject[] = [
    {
        path: '/login',
        element: <TrackedLogin />,
        metadata: {
            title: 'Login',
            loadingMessage: 'Loading login...',
            analyticsPageView: 'login_page'
        }
    },
    {
        path: '/register',
        element: <TrackedRegister />,
        metadata: {
            title: 'Register',
            loadingMessage: 'Loading registration...',
            analyticsPageView: 'registration_page'
        }
    },
    {
        path: '/',
        element: <TrackedLayout />,
        metadata: {
            title: 'Home',
            loadingMessage: 'Loading...'
        },
        children: [
            {
                path: 'medications',
                element: <TrackedMedicationsPage />,
                metadata: {
                    title: 'Medications',
                    loadingMessage: 'Loading medications...',
                    analyticsPageView: 'medications_page'
                }
            },
            {
                path: 'dashboard',
                element: <TrackedDashboard />,
                metadata: {
                    title: 'Dashboard',
                    loadingMessage: 'Loading dashboard...',
                    analyticsPageView: 'dashboard_page'
                }
            },
            {
                path: 'profile',
                element: <TrackedProfile />,
                metadata: {
                    title: 'Profile',
                    loadingMessage: 'Loading profile...',
                    analyticsPageView: 'profile_page'
                }
            },
            {
                path: 'family',
                element: <TrackedFamilyMembers />,
                metadata: {
                    title: 'Family Members',
                    loadingMessage: 'Loading family members...',
                    analyticsPageView: 'family_members_page'
                }
            },
            {
                path: 'notifications',
                element: <TrackedNotificationSettings />,
                metadata: {
                    title: 'Notification Settings',
                    loadingMessage: 'Loading notification settings...',
                    analyticsPageView: 'notification_settings_page'
                }
            }
        ]
    }
];
