import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export type PledgeTarget = {
    __kind__: "task";
    task: bigint;
} | {
    __kind__: "otherTasks";
    otherTasks: null;
};
export interface PeerRating {
    projectId: bigint;
    timestamp: Time;
    rating: number;
    ratee: Principal;
    rater: Principal;
}
export interface Task {
    id: bigint;
    status: TaskStatus;
    assignee?: Principal;
    title: string;
    hhBudget: number;
    completionTime?: Time;
    description: string;
    projectId: bigint;
    dependencies: Array<bigint>;
    auditStartTime?: Time;
}
export interface Challenge {
    stakeHH: number;
    taskId: bigint;
    timestamp: Time;
    challenger: Principal;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface Pledge {
    status: PledgeStatus;
    user: Principal;
    target: PledgeTarget;
    projectId: bigint;
    timestamp: Time;
    amount: number;
}
export interface Vote {
    weight: number;
    voteType: Variant_finalPrize_challenge_taskProposal;
    voter: Principal;
    timestamp: Time;
    targetId: bigint;
}
export interface UserProfile {
    totalPledgedHH: number;
    votingPower: number;
    friendlyUsername: string;
    efficiencyBadgesCount: bigint;
    squadRole: SquadRole;
    constructivenessRating: number;
    totalEnablerPoints: bigint;
    totalEarnedHH: number;
    profilePicture: string;
    overallReputationScore: number;
    participationLevel: ParticipationLevel;
    participationLevelLocked: boolean;
}
export interface Project {
    id: bigint;
    status: ProjectStatus;
    title: string;
    creator: Principal;
    participants: Array<Principal>;
    completionTime?: Time;
    totalPledgedHH: number;
    description: string;
    sharedResourceLink?: string;
    finalMonetaryValue: number;
    estimatedTotalHH: number;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum ParticipationLevel {
    Journeyman = "Journeyman",
    GuestArtist = "GuestArtist",
    Apprentice = "Apprentice",
    Master = "Master"
}
export enum PledgeStatus {
    expired = "expired",
    pending = "pending",
    approved = "approved",
    confirmed = "confirmed",
    reassigned = "reassigned"
}
export enum ProjectStatus {
    active = "active",
    completed = "completed",
    pledging = "pledging",
    archived = "archived"
}
export enum SquadRole {
    Journeyman = "Journeyman",
    Mentor = "Mentor",
    Apprentice = "Apprentice",
    Masters = "Masters"
}
export enum TaskStatus {
    active = "active",
    taskConfirmed = "taskConfirmed",
    completed = "completed",
    rejected = "rejected",
    proposed = "proposed",
    inAudit = "inAudit",
    pendingConfirmation = "pendingConfirmation",
    inProgress = "inProgress"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_finalPrize_challenge_taskProposal {
    finalPrize = "finalPrize",
    challenge = "challenge",
    taskProposal = "taskProposal"
}
export interface backendInterface {
    acceptTask(taskId: bigint): Promise<void>;
    approveTask(taskId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    challengeTask(taskId: bigint, stakeHH: number): Promise<void>;
    checkAndExpireOldPledges(): Promise<void>;
    completeProject(projectId: bigint): Promise<void>;
    completeTask(taskId: bigint): Promise<void>;
    confirmPledge(pledgeId: bigint): Promise<void>;
    confirmTask(taskId: bigint): Promise<void>;
    createProject(title: string, description: string, estimatedTotalHH: number, finalMonetaryValue: number, sharedResourceLink: string | null, otherTasksPoolHH: number): Promise<bigint>;
    createTask(projectId: bigint, title: string, description: string, hhBudget: number, dependencies: Array<bigint>): Promise<bigint>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChallenges(taskId: bigint): Promise<Array<Challenge>>;
    getPeerRatings(projectId: bigint): Promise<Array<PeerRating>>;
    getPledges(projectId: bigint): Promise<Array<Pledge>>;
    getProjects(): Promise<Array<Project>>;
    getTasks(projectId: bigint): Promise<Array<Task>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVotes(targetId: bigint): Promise<Array<Vote>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    pledgeToTask(projectId: bigint, target: PledgeTarget, amount: number): Promise<void>;
    ratePeer(ratee: Principal, projectId: bigint, rating: number): Promise<void>;
    reassignFromOtherTasks(pledgeId: bigint, newTaskId: bigint): Promise<void>;
    registerUser(username: string, role: SquadRole, participationLevel: ParticipationLevel): Promise<void>;
    requestApproval(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    setParticipationLevel(level: ParticipationLevel): Promise<void>;
    updateParticipationLevel(user: Principal, level: ParticipationLevel): Promise<void>;
    vote(targetId: bigint, voteType: Variant_finalPrize_challenge_taskProposal): Promise<void>;
}
