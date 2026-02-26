import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut, Mail } from 'lucide-react';

export default function UnauthorizedScreen() {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const principalId = identity?.getPrincipal().toString();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center px-4">
      <div className="mx-auto max-w-lg w-full">
        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src="/assets/generated/iasa-logo-transparent.dim_200x200.png"
              alt="IASA Logo"
              className="h-20 w-20 object-contain"
            />
          </div>

          {/* Icon */}
          <div className="mb-5 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-10 w-10 text-destructive" />
            </div>
          </div>

          {/* Title */}
          <h1 className="mb-3 text-2xl font-bold tracking-tight">
            Acceso No Autorizado
          </h1>

          {/* Message */}
          <p className="mb-2 text-muted-foreground leading-relaxed">
            Tu identidad aún no está autorizada para acceder a esta plataforma.
          </p>
          <p className="mb-6 text-muted-foreground leading-relaxed">
            Por favor, contacta al administrador de IASA para solicitar acceso.
          </p>

          {/* Principal ID display */}
          {principalId && (
            <div className="mb-6 rounded-lg bg-muted/50 border px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Tu ID de identidad
              </p>
              <p className="text-xs font-mono text-foreground break-all select-all">
                {principalId}
              </p>
            </div>
          )}

          {/* Contact hint */}
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>
              Comparte tu ID con el administrador de{' '}
              <a
                href="https://grupo.iasa.cl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                grupo.iasa.cl
              </a>{' '}
              para ser habilitado.
            </span>
          </div>

          {/* Logout button */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión y cambiar identidad
          </Button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          IASA Challenge (Alpha Sandbox) v0.3
        </p>
      </div>
    </div>
  );
}
