import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  UserProfile,
  Project,
  Task,
  Pledge,
  Vote,
  Challenge,
  PeerRating,
  UserApprovalInfo,
  PledgeTarget,
  ParticipationLevel,
  SquadRole,
  ApprovalStatus,
} from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import { Variant_finalPrize_challenge_taskProposal } from '../backend';

// ─── Auth / Access ────────────────────────────────────────────────────────────

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 2,
    staleTime: 30_000,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerApproved();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 2,
    staleTime: 30_000,
  });
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getCallerUserProfile();
      } catch (err: any) {
        // If the error is an authorization error for non-approved users,
        // return null instead of throwing so the UI can handle it gracefully.
        const msg = err?.message ?? '';
        if (
          msg.includes('Unauthorized') ||
          msg.includes('Only authenticated') ||
          msg.includes('Only approved')
        ) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 60_000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      try {
        return await actor.getUserProfile(user);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!user,
    retry: 1,
    staleTime: 60_000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useRegisterUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      username,
      role,
      participationLevel,
    }: {
      username: string;
      role: SquadRole;
      participationLevel: ParticipationLevel;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.registerUser(username, role, participationLevel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Approval ─────────────────────────────────────────────────────────────────

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['listApprovals'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.listApprovals();
      } catch {
        return [];
      }
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      status,
    }: {
      user: Principal;
      status: ApprovalStatus;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useGetProjects() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProjects();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      estimatedTotalHH,
      finalMonetaryValue,
      sharedResourceLink,
      otherTasksPoolHH,
    }: {
      title: string;
      description: string;
      estimatedTotalHH: number;
      finalMonetaryValue: number;
      sharedResourceLink: string | null;
      otherTasksPoolHH: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createProject(
        title,
        description,
        estimatedTotalHH,
        finalMonetaryValue,
        sharedResourceLink,
        otherTasksPoolHH
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCompleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.completeProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useGetTasks(projectId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Task[]>({
    queryKey: ['tasks', projectId?.toString()],
    queryFn: async () => {
      if (!actor || projectId === null) return [];
      return actor.getTasks(projectId);
    },
    enabled: !!actor && !actorFetching && projectId !== null,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      title,
      description,
      hhBudget,
      dependencies,
    }: {
      projectId: bigint;
      title: string;
      description: string;
      hhBudget: number;
      dependencies: bigint[];
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createTask(projectId, title, description, hhBudget, dependencies);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
    },
  });
}

export function useAcceptTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: bigint; projectId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.acceptTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
    },
  });
}

export function useCompleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: bigint; projectId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.completeTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
    },
  });
}

export function useApproveTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: bigint; projectId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useConfirmTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: bigint; projectId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.confirmTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
    },
  });
}

export function useChallengeTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
      stakeHH,
    }: {
      taskId: bigint;
      projectId: bigint;
      stakeHH: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.challengeTask(taskId, stakeHH);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ['challenges', variables.taskId.toString()],
      });
    },
  });
}

// ─── Pledges ──────────────────────────────────────────────────────────────────

export function useGetPledges(projectId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Pledge[]>({
    queryKey: ['pledges', projectId?.toString()],
    queryFn: async () => {
      if (!actor || projectId === null) return [];
      return actor.getPledges(projectId);
    },
    enabled: !!actor && !actorFetching && projectId !== null,
    retry: 1,
    staleTime: 30_000,
  });
}

export function usePledgeToTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      target,
      amount,
    }: {
      projectId: bigint;
      target: PledgeTarget;
      amount: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.pledgeToTask(projectId, target, amount);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pledges', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useConfirmPledge() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pledgeId,
      projectId,
    }: {
      pledgeId: bigint;
      projectId: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.confirmPledge(pledgeId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pledges', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useReassignFromOtherTasks() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pledgeId,
      newTaskId,
      projectId,
    }: {
      pledgeId: bigint;
      newTaskId: bigint;
      projectId: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.reassignFromOtherTasks(pledgeId, newTaskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['pledges', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export function useGetVotes(targetId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Vote[]>({
    queryKey: ['votes', targetId?.toString()],
    queryFn: async () => {
      if (!actor || targetId === null) return [];
      return actor.getVotes(targetId);
    },
    enabled: !!actor && !actorFetching && targetId !== null,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useVote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetId,
      voteType,
    }: {
      targetId: bigint;
      voteType: Variant_finalPrize_challenge_taskProposal;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.vote(targetId, voteType);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['votes', variables.targetId.toString()],
      });
    },
  });
}

// ─── Challenges ───────────────────────────────────────────────────────────────

export function useGetChallenges(taskId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Challenge[]>({
    queryKey: ['challenges', taskId?.toString()],
    queryFn: async () => {
      if (!actor || taskId === null) return [];
      return actor.getChallenges(taskId);
    },
    enabled: !!actor && !actorFetching && taskId !== null,
    retry: 1,
    staleTime: 30_000,
  });
}

// ─── Peer Ratings ─────────────────────────────────────────────────────────────

export function useGetPeerRatings(projectId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PeerRating[]>({
    queryKey: ['peerRatings', projectId?.toString()],
    queryFn: async () => {
      if (!actor || projectId === null) return [];
      return actor.getPeerRatings(projectId);
    },
    enabled: !!actor && !actorFetching && projectId !== null,
    retry: 1,
    staleTime: 30_000,
  });
}

export function useRatePeer() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ratee,
      projectId,
      rating,
    }: {
      ratee: Principal;
      projectId: bigint;
      rating: number;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.ratePeer(ratee, projectId, rating);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['peerRatings', variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// ─── Participation Level ──────────────────────────────────────────────────────

export function useUpdateParticipationLevel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      user,
      level,
    }: {
      user: Principal;
      level: ParticipationLevel;
    }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateParticipationLevel(user, level);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

// ─── Confirmed Pledged HH helper ──────────────────────────────────────────────

export function getConfirmedPledgedHH(pledges: Pledge[]): number {
  return pledges
    .filter((p) => p.status === 'confirmed' || p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
}
