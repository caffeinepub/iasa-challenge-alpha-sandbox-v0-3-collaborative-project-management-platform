import React from 'react';
import { Project, Pledge, PledgeStatus } from '../backend';
import { useGetTasks, useGetUserProfile } from '../hooks/useQueries';
import { Info } from 'lucide-react';
import type { Principal } from '@icp-sdk/core/principal';

interface ShareOfPoolSectionProps {
  project: Project;
  pledges: Pledge[];
}

export default function ShareOfPoolSection({ project, pledges }: ShareOfPoolSectionProps) {
  // Only confirmed/approved pledges count
  const confirmedPledges = pledges.filter(
    p => p.status === PledgeStatus.confirmed || p.status === PledgeStatus.approved
  );

  const pendingCount = pledges.filter(p => p.status === PledgeStatus.pending).length;
  const pendingHH = pledges
    .filter(p => p.status === PledgeStatus.pending)
    .reduce((sum, p) => sum + p.amount, 0);

  // Aggregate confirmed HH per participant — keep Principal objects for useGetUserProfile
  const participantMap = new Map<string, { principal: Principal; hh: number }>();
  for (const pledge of confirmedPledges) {
    const key = pledge.user.toString();
    const existing = participantMap.get(key);
    if (existing) {
      existing.hh += pledge.amount;
    } else {
      participantMap.set(key, { principal: pledge.user, hh: pledge.amount });
    }
  }

  const totalConfirmedHH = confirmedPledges.reduce((sum, p) => sum + p.amount, 0);
  const participants = Array.from(participantMap.values()).sort((a, b) => b.hh - a.hh);

  return (
    <div className="space-y-4">

      {/* Info banner */}
      <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          Share of Pool Calculation
        </p>
        <p className="text-xs text-muted-foreground">
          Only <strong>confirmed pledges</strong> are included in the share-of-pool calculation.
          Pending and expired pledges are excluded until the PM confirms them.
        </p>
        {pendingCount > 0 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            ⚠ {pendingCount} pending pledge{pendingCount > 1 ? 's' : ''} ({pendingHH.toFixed(1)} HH) are currently excluded from this calculation.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          Total confirmed HH: <span className="font-bold text-primary">{totalConfirmedHH.toFixed(1)}</span>
        </span>
        <span>
          Prize pool: <span className="font-bold">{project.finalMonetaryValue} €</span>
        </span>
      </div>

      {/* Participant shares */}
      {participants.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No confirmed pledges yet — shares will appear here once pledges are confirmed by the PM.
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Participant Shares (confirmed pledges only)
          </h4>
          {participants.map(({ principal, hh }) => {
            const share = totalConfirmedHH > 0 ? (hh / totalConfirmedHH) * 100 : 0;
            const payout = totalConfirmedHH > 0 ? (hh / totalConfirmedHH) * project.finalMonetaryValue : 0;
            return (
              <ParticipantRow
                key={principal.toString()}
                principal={principal}
                hh={hh}
                share={share}
                payout={payout}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ParticipantRow uses Principal directly for useGetUserProfile ─────────────

function ParticipantRow({
  principal,
  hh,
  share,
  payout,
}: {
  principal: Principal;
  hh: number;
  share: number;
  payout: number;
}) {
  const { data: profile } = useGetUserProfile(principal);

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-sm font-medium">
            {profile?.friendlyUsername ?? (
              <span className="font-mono text-xs text-muted-foreground">
                {principal.toString().slice(0, 14)}…
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{hh.toFixed(1)} HH confirmed</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-primary">{share.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">≈ {payout.toFixed(0)} €</div>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
