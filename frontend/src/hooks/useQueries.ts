import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type {
  UserProfile,
  Project,
  Task,
  Pledge,
  PledgeTarget,
  SquadRole,
  PeerRating,
  ParticipationLevel,
  UserApprovalInfo,
} from "../backend";
import { PledgeStatus, ApprovalStatus, Variant_unapproved_admin_pending_approved } from "../backend";
import type { Principal } from "@icp-sdk/core/principal";

export function useGetCurrentUserStatus() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Variant_unapproved_admin_pending_approved>({
    queryKey: ["currentUserStatus"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCurrentUserStatus();
    },
    enabled: !!actor && !actorFetching,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGetCallerUserProfile(enabled = true) {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching && enabled,
    retry: false,
  });

  return {
    ...query,
    isLoading: (actorFetching || query.isLoading) && enabled,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
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
      if (!actor) throw new Error("Actor not available");
      return actor.registerUser(username, role, participationLevel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useGetProjects() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProjects();
    },
    enabled: !!actor && !actorFetching,
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
      if (!actor) throw new Error("Actor not available");
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
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useGetTasks(projectId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Task[]>({
    queryKey: ["tasks", projectId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTasks(projectId);
    },
    enabled: !!actor && !actorFetching,
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
      if (!actor) throw new Error("Actor not available");
      return actor.createTask(projectId, title, description, hhBudget, dependencies);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId.toString()],
      });
    },
  });
}

export function useGetPledges(projectId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Pledge[]>({
    queryKey: ["pledges", projectId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPledges(projectId);
    },
    enabled: !!actor && !actorFetching,
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
      if (!actor) throw new Error("Actor not available");
      return actor.pledgeToTask(projectId, target, amount);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pledges", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useConfirmTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, projectId }: { taskId: bigint; projectId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.confirmTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["pledges", variables.projectId.toString()],
      });
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
      if (!actor) throw new Error("Actor not available");
      return actor.confirmPledge(pledgeId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pledges", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useAcceptTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: bigint;
      projectId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.acceptTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId.toString()],
      });
    },
  });
}

export function useCompleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: bigint;
      projectId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.completeTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId.toString()],
      });
    },
  });
}

export function useApproveTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      projectId,
    }: {
      taskId: bigint;
      projectId: bigint;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveTask(taskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useCompleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.completeProject(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useGetPeerRatings(projectId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PeerRating[]>({
    queryKey: ["peerRatings", projectId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPeerRatings(projectId);
    },
    enabled: !!actor && !actorFetching,
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
      if (!actor) throw new Error("Actor not available");
      return actor.ratePeer(ratee, projectId, rating);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["peerRatings", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
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
      if (!actor) throw new Error("Actor not available");
      return actor.reassignFromOtherTasks(pledgeId, newTaskId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["pledges", variables.projectId.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
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
    retryDelay: 1000,
  });
}

export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isCallerApproved"],
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
    retryDelay: 1000,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserStatus"] });
      queryClient.invalidateQueries({ queryKey: ["isCallerApproved"] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
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
      if (!actor) throw new Error("Actor not available");
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

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
      if (!actor) throw new Error("Actor not available");
      return actor.updateParticipationLevel(user, level);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", variables.user.toString()] });
      queryClient.invalidateQueries({ queryKey: ["allUsersForAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Helper: only confirmed pledges count toward HH budget
export function getConfirmedPledgedHH(pledges: Pledge[]): number {
  return pledges
    .filter(
      (p) =>
        p.status === PledgeStatus.confirmed || p.status === PledgeStatus.approved
    )
    .reduce((sum, p) => sum + p.amount, 0);
}
