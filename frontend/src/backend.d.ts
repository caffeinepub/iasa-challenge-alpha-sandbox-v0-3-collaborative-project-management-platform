import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Challenge {
    stakeHH: number;
    taskId: bigint;
    timestamp: Time;
    challenger: Principal;
}
export type Time = bigint;
export interface Pledge {
    user: Principal;
    pledgedHH: number;
    projectId: bigint;
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
export interface PeerRating {
    projectId: bigint;
    timestamp: Time;
    rating: number;
    ratee: Principal;
    rater: Principal;
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
    squadRole: SquadRole;
    totalEarnedHH: number;
    profilePicture: string;
    overallReputationScore: number;
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
export enum ProjectStatus {
    active = "active",
    completed = "completed",
    pledging = "pledging",
    archived = "archived"
}
export enum SquadRole {
    Journeyman = "Journeyman",
    Mentor = "Mentor",
    Apprentice = "Apprentice"
}
export enum TaskStatus {
    active = "active",
    completed = "completed",
    rejected = "rejected",
    proposed = "proposed",
    inAudit = "inAudit",
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
    completeProject(projectId: bigint): Promise<void>;
    completeTask(taskId: bigint): Promise<void>;
    createProject(title: string, description: string, estimatedTotalHH: number, finalMonetaryValue: number, sharedResourceLink: string | null): Promise<bigint>;
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
    pledgeHH(projectId: bigint, pledgedHH: number): Promise<void>;
    ratePeer(ratee: Principal, projectId: bigint, rating: number): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    vote(targetId: bigint, voteType: Variant_finalPrize_challenge_taskProposal): Promise<void>;
}
