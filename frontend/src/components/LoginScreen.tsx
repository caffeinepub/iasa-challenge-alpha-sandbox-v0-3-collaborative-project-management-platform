import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Award, Users, TrendingUp, Shield } from 'lucide-react';

export default function LoginScreen() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-16 text-center">
            <img 
              src="https://grupoiasa.cl/wp-content/uploads/2024/05/GRUPO-IASA.png" 
              alt="IASA Challenge (Alpha Sandbox) v0.3 Logo" 
              className="mx-auto mb-6 h-32 w-32 object-contain"
            />
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              IASA Challenge (Alpha Sandbox) v0.3
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Collaborative Project Management
            </p>
            <p className="text-lg text-muted-foreground">
              Pledge Human Hours, Complete Tasks, Earn Rewards
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Award className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Earn Rewards</h3>
              <p className="text-sm text-muted-foreground">
                Complete tasks and earn monetary rewards based on your contributions
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Collaborate</h3>
              <p className="text-sm text-muted-foreground">
                Work with teams, pledge hours, and build reputation through peer ratings
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-chart-1/10 p-3">
                  <TrendingUp className="h-8 w-8 text-chart-1" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your earned HH, reputation score, and enabler points
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-chart-2/10 p-3">
                  <Shield className="h-8 w-8 text-chart-2" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Quality Assurance</h3>
              <p className="text-sm text-muted-foreground">
                Audit system with challenges and constructiveness ratings
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              size="lg"
              className="px-8 py-6 text-lg"
            >
              {isLoggingIn ? 'Connecting...' : 'Login with Internet Identity'}
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Secure authentication powered by Internet Computer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
