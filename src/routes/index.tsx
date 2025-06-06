import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { LoadingPage } from '../pages/LoadingPage';
import { PrivateRoute } from './PrivateRoute';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { RecoverPasswordPage } from '../pages/auth/RecoverPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ProfilePage } from '../pages/auth/ProfilePage';

// Dashboard Pages
import { HomePage } from '../pages/HomePage';
import { ProfileSettingsPage } from '../pages/ProfileSettingsPage';
import { ClientsPage } from '../pages/ClientsPage';
import { MessagesPage } from '../pages/MessagesPage';
import { ChatPage } from '../pages/ChatPage';
import { ChatZapPage } from '../pages/ChatZapPage';
import { InstancesPage } from '../pages/InstancesPage';
import { MassMessagingPage } from '../pages/MassMessagingPage';
import { ReportsPage } from '../pages/ReportsPage';
import { BillingPage } from '../pages/BillingPage';
import { CheckoutPage } from '../pages/CheckoutPage';


export function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recover-password" element={<RecoverPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings/profile" element={<ProfileSettingsPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/messages/chatzap" element={<ChatZapPage />} />
        <Route path="/messages/multi" element={<ChatPage />} />
        <Route path="/messages/campaigns" element={<MessagesPage />} />
        <Route path="/messages/instances" element={<InstancesPage />} />
        <Route path="/messages/mass" element={<MassMessagingPage />} />
        <Route path="/messages/reports" element={<ReportsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

      </Route>

      {/* Catch all unmatched routes */}
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}