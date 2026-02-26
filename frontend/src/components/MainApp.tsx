import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetCallerUserRole } from '../hooks/useQueries';
import { UserRole } from '../backend';
import LoginScreen from './LoginScreen';
import ProfileSetupModal from './ProfileSetupModal';
import Dashboard from './Dashboard';
import Header from './Header';
import Footer from './Footer';
import UnauthorizedScreen from './UnauthorizedScreen';

export default function MainApp() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched } = useGetCallerUserProfile();
  const { data: userRole, isLoading: roleLoading, isFetched: roleFetched } = useGetCallerUserRole();

  const isAuthenticated = !!identity;

  // Show spinner while Internet Identity is initializing
  if (isInitializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Inicializando...</p>
        </div>
      </div>
    );
  }

  // Not logged in → show login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Checking authorization role — show spinner while in flight
  if (roleLoading || !roleFetched) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground">Verificando autorización...</p>
        </div>
      </div>
    );
  }

  // User is authenticated but not in the allowlist (guest role)
  const isParticipant = userRole === UserRole.user || userRole === UserRole.admin;
  if (!isParticipant) {
    return <UnauthorizedScreen />;
  }

  // Authorized user — show profile setup if needed, otherwise dashboard
  const showProfileSetup = isAuthenticated && !profileLoading && profileFetched && userProfile === null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
      <Footer />
      {showProfileSetup && <ProfileSetupModal />}
    </div>
  );
}
