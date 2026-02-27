import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";

import Migration "migration";
(with migration = Migration.run)
actor IASAChallenge {
  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type SquadRole = {
    #Apprentice;
    #Journeyman;
    #Mentor;
    #Masters;
  };

  public type ParticipationLevel = {
    #Apprentice;
    #Journeyman;
    #Master;
    #GuestArtist;
  };

  func participationLevelToVotingPower(level : ParticipationLevel) : Float {
    switch (level) {
      case (#Apprentice) { 0.0 };
      case (#Journeyman) { 1.0 };
      case (#Master) { 3.0 };
      case (#GuestArtist) { 4.0 };
    };
  };

  // Enforce role-participation level constraints:
  // PM (Masters) -> only Journeyman or Master
  // Mentor -> only Master or GuestArtist
  // Team Player (Journeyman/Apprentice) -> Apprentice, Journeyman, or Master
  // Administrator role is handled by AccessControl
  func isRoleCompatibleWithLevel(role : SquadRole, level : ParticipationLevel) : Bool {
    switch (role) {
      case (#Masters) {
        // PM role: only Journeyman or Master participation level
        switch (level) {
          case (#Journeyman) { true };
          case (#Master) { true };
          case (_) { false };
        };
      };
      case (#Mentor) {
        // Mentor/Product Owner role: only Master or GuestArtist participation level
        switch (level) {
          case (#Master) { true };
          case (#GuestArtist) { true };
          case (_) { false };
        };
      };
      case (#Journeyman) {
        // Team Player (Journeyman): Apprentice, Journeyman, or Master
        switch (level) {
          case (#Apprentice) { true };
          case (#Journeyman) { true };
          case (#Master) { true };
          case (#GuestArtist) { false };
        };
      };
      case (#Apprentice) {
        // Team Player (Apprentice): Apprentice, Journeyman, or Master
        switch (level) {
          case (#Apprentice) { true };
          case (#Journeyman) { true };
          case (#Master) { true };
          case (#GuestArtist) { false };
        };
      };
    };
  };

  public type UserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float;
    totalEarnedHH : Float;
    overallReputationScore : Float;
    votingPower : Float;
    squadRole : SquadRole;
    totalEnablerPoints : Nat;
    efficiencyBadgesCount : Nat;
    constructivenessRating : Float;
    participationLevel : ParticipationLevel;
    // Track whether participation level has been set (locked after initial selection)
    participationLevelLocked : Bool;
  };

  public type ProjectStatus = {
    #pledging;
    #active;
    #completed;
    #archived;
  };

  public type Project = {
    id : Nat;
    title : Text;
    description : Text;
    estimatedTotalHH : Float;
    finalMonetaryValue : Float;
    sharedResourceLink : ?Text;
    status : ProjectStatus;
    totalPledgedHH : Float;
    creator : Principal;
    participants : [Principal];
    completionTime : ?Time.Time;
  };

  // Updated TaskStatus to include task confirmation state.
  public type TaskStatus = {
    #proposed;
    #active;
    #inProgress;
    #inAudit;
    #completed;
    #rejected;
    #pendingConfirmation;
    #taskConfirmed;
  };

  public type Task = {
    id : Nat;
    projectId : Nat;
    title : Text;
    description : Text;
    hhBudget : Float;
    dependencies : [Nat];
    status : TaskStatus;
    assignee : ?Principal;
    completionTime : ?Time.Time;
    auditStartTime : ?Time.Time;
  };

  // Updated type for PledgeStatus to include new states
  public type PledgeStatus = {
    #pending;
    #approved;
    #reassigned;
    #confirmed;
    #expired;
  };

  public type PledgeTarget = {
    #task : Nat;
    #otherTasks;
  };

  // Updated Pledge type to allow tracking confirmation state.
  public type Pledge = {
    user : Principal;
    projectId : Nat;
    amount : Float;
    target : PledgeTarget;
    status : PledgeStatus;
    timestamp : Time.Time;
  };

  public type Vote = {
    voter : Principal;
    targetId : Nat;
    weight : Float;
    voteType : { #taskProposal; #challenge; #finalPrize };
    timestamp : Time.Time;
  };

  public type Challenge = {
    challenger : Principal;
    taskId : Nat;
    stakeHH : Float;
    timestamp : Time.Time;
  };

  public type PeerRating = {
    rater : Principal;
    ratee : Principal;
    projectId : Nat;
    rating : Float;
    timestamp : Time.Time;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let natMap = OrderedMap.Make<Nat>(func(a : Nat, b : Nat) : { #less; #equal; #greater } { if (a < b) #less else if (a == b) #equal else #greater });

  var userProfiles = principalMap.empty<UserProfile>();
  var projects = natMap.empty<Project>();
  var tasks = natMap.empty<Task>();
  var pledges = natMap.empty<Pledge>();
  var votes = natMap.empty<Vote>();
  var challenges = natMap.empty<Challenge>();
  var peerRatings = natMap.empty<PeerRating>();

  var nextProjectId = 0;
  var nextTaskId = 0;
  var nextPledgeId = 0;
  var nextVoteId = 0;
  var nextChallengeId = 0;
  var nextRatingId = 0;

  private func isProjectParticipant(projectId : Nat, user : Principal) : Bool {
    switch (natMap.get(projects, projectId)) {
      case null { false };
      case (?project) {
        if (project.creator == user) { true } else {
          Array.find<Principal>(project.participants, func(p) { p == user }) != null;
        };
      };
    };
  };

  private func hasAlreadyVoted(voter : Principal, targetId : Nat, voteType : { #taskProposal; #challenge; #finalPrize }) : Bool {
    let allVotes = Iter.toArray(natMap.vals(votes));
    Array.find<Vote>(
      allVotes,
      func(v) { v.voter == voter and v.targetId == targetId and v.voteType == voteType },
    ) != null;
  };

  private func getTotalTaskBudget(projectId : Nat) : Float {
    let projectTasks = Iter.toArray(natMap.vals(tasks));
    Array.foldLeft<Task, Float>(
      projectTasks,
      0.0,
      func(acc, task) {
        if (task.projectId == projectId) { acc + task.hhBudget } else { acc };
      },
    );
  };

  private func getTotalAssignedHH(projectId : Nat) : Float {
    let projectPledges = Iter.toArray(natMap.vals(pledges));
    // Only count pledged HH that are in the `confirmed` or `approved` states - never count `pending`
    let confirmedPledges = Array.filter<Pledge>(projectPledges, func(p) { p.projectId == projectId and (p.status == #confirmed or p.status == #approved) });
    Array.foldLeft<Pledge, Float>(confirmedPledges, 0.0, func(acc, pledge) { acc + pledge.amount });
  };

  private func hasAlreadyRated(rater : Principal, ratee : Principal, projectId : Nat) : Bool {
    let allRatings = Iter.toArray(natMap.vals(peerRatings));
    Array.find<PeerRating>(
      allRatings,
      func(r) {
        r.rater == rater and r.ratee == ratee and r.projectId == projectId
      },
    ) != null;
  };

  private func hasActiveChallenges(taskId : Nat) : Bool {
    let allChallenges = Iter.toArray(natMap.vals(challenges));
    Array.find<Challenge>(
      allChallenges,
      func(c) { c.taskId == taskId },
    ) != null;
  };

  // Check whether a user has pledged to a specific project (any target within that project)
  private func hasPledgedToProject(user : Principal, projectId : Nat) : Bool {
    let allPledges = Iter.toArray(natMap.vals(pledges));
    Array.find<Pledge>(
      allPledges,
      func(p) {
        p.user == user and p.projectId == projectId and (p.status == #confirmed or p.status == #approved or p.status == #pending or p.status == #reassigned)
      },
    ) != null;
  };

  // Check whether a user has pledged to a specific task within a project
  private func hasPledgedToTask(user : Principal, projectId : Nat, taskId : Nat) : Bool {
    let allPledges = Iter.toArray(natMap.vals(pledges));
    Array.find<Pledge>(
      allPledges,
      func(p) {
        p.user == user and p.projectId == projectId and (p.status == #confirmed or p.status == #approved or p.status == #pending or p.status == #reassigned) and (
          switch (p.target) {
            case (#task tid) { tid == taskId };
            case (#otherTasks) { false };
          }
        );
      },
    ) != null;
  };

  // Profile functions

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  // saveCallerUserProfile: users may update their own profile metadata,
  // but participationLevel and participationLevelLocked are protected fields:
  // - participationLevel can only be changed by admin (via updateParticipationLevel)
  // - squadRole constraints are enforced against the current participation level
  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case null {
        // No existing profile: treat as initial registration, enforce constraints
        if (not isRoleCompatibleWithLevel(profile.squadRole, profile.participationLevel)) {
          Debug.trap("Invalid: Squad role is not compatible with the selected participation level");
        };
        // Set votingPower based on participation level
        let newProfile = {
          profile with
          votingPower = participationLevelToVotingPower(profile.participationLevel);
          participationLevelLocked = true;
        };
        userProfiles := principalMap.put(userProfiles, caller, newProfile);
      };
      case (?existing) {
        // Existing profile: participation level and lock status cannot be changed by the user
        if (profile.participationLevel != existing.participationLevel) {
          Debug.trap("Unauthorized: Participation level is locked and can only be changed by the administrator");
        };
        // Enforce role-level compatibility with the locked participation level
        if (not isRoleCompatibleWithLevel(profile.squadRole, existing.participationLevel)) {
          Debug.trap("Invalid: Squad role is not compatible with your participation level");
        };
        // Preserve locked fields: participationLevel, participationLevelLocked, votingPower
        let updatedProfile = {
          profile with
          participationLevel = existing.participationLevel;
          participationLevelLocked = existing.participationLevelLocked;
          votingPower = existing.votingPower;
        };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
      };
    };
  };

  // setParticipationLevel: allows a user to self-select their participation level ONCE.
  // After the initial selection (participationLevelLocked = true), only admin can change it.
  public shared ({ caller }) func setParticipationLevel(level : ParticipationLevel) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can set their participation level");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case null {
        Debug.trap("User profile not found: please register first");
      };
      case (?profile) {
        if (profile.participationLevelLocked) {
          Debug.trap("Unauthorized: Participation level is already set and locked. Only the administrator can change it.");
        };
        // Enforce role-level compatibility
        if (not isRoleCompatibleWithLevel(profile.squadRole, level)) {
          Debug.trap("Invalid: Selected participation level is not compatible with your current squad role");
        };
        let updatedProfile = {
          profile with
          participationLevel = level;
          votingPower = participationLevelToVotingPower(level);
          participationLevelLocked = true;
        };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
      };
    };
  };

  // updateParticipationLevel: admin-only function to change a user's participation level after it is locked.
  public shared ({ caller }) func updateParticipationLevel(user : Principal, level : ParticipationLevel) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Only admin can update participation levels");
    };

    switch (principalMap.get(userProfiles, user)) {
      case null { Debug.trap("User profile not found") };
      case (?profile) {
        // Enforce role-level compatibility after admin changes the level
        if (not isRoleCompatibleWithLevel(profile.squadRole, level)) {
          Debug.trap("Invalid: The new participation level is not compatible with the user's current squad role");
        };
        let updatedProfile = {
          profile with
          participationLevel = level;
          votingPower = participationLevelToVotingPower(level);
          participationLevelLocked = true;
        };
        userProfiles := principalMap.put(userProfiles, user, updatedProfile);
      };
    };
  };

  // registerUser: initial profile creation with participation level self-selection.
  // The participation level is locked after registration.
  // Role-participation level constraints are enforced.
  public shared ({ caller }) func registerUser(username : Text, role : SquadRole, participationLevel : ParticipationLevel) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can register a profile");
    };
    switch (principalMap.get(userProfiles, caller)) {
      case (?_) { Debug.trap("User already registered") };
      case null {
        // Enforce role-participation level constraints
        if (not isRoleCompatibleWithLevel(role, participationLevel)) {
          Debug.trap("Invalid: The selected squad role is not compatible with the selected participation level");
        };
        let newProfile : UserProfile = {
          friendlyUsername = username;
          profilePicture = "";
          totalPledgedHH = 0.0;
          totalEarnedHH = 0.0;
          overallReputationScore = 0.0;
          votingPower = participationLevelToVotingPower(participationLevel);
          squadRole = role;
          totalEnablerPoints = 0;
          efficiencyBadgesCount = 0;
          constructivenessRating = 0.0;
          participationLevel;
          // Lock the participation level after initial selection
          participationLevelLocked = true;
        };
        userProfiles := principalMap.put(userProfiles, caller, newProfile);
      };
    };
  };

  // Project functions

  // Any signed-in participant (registered user) may create a project.
  public shared ({ caller }) func createProject(title : Text, description : Text, estimatedTotalHH : Float, finalMonetaryValue : Float, sharedResourceLink : ?Text, otherTasksPoolHH : Float) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in participants can create projects");
    };

    if (estimatedTotalHH <= 0.0) {
      Debug.trap("Invalid: Estimated total HH must be positive");
    };

    if (finalMonetaryValue < 0.0) {
      Debug.trap("Invalid: Final monetary value cannot be negative");
    };

    if (otherTasksPoolHH < 0.0 or otherTasksPoolHH > estimatedTotalHH) {
      Debug.trap("Invalid: Other Tasks pool HH must be non-negative and not exceed total HH");
    };

    let projectId = nextProjectId;
    nextProjectId += 1;

    let project : Project = {
      id = projectId;
      title;
      description;
      estimatedTotalHH;
      finalMonetaryValue;
      sharedResourceLink;
      status = #pledging;
      totalPledgedHH = 0.0;
      creator = caller;
      participants = [];
      completionTime = null;
    };

    projects := natMap.put(projects, projectId, project);

    let otherTask : Task = {
      id = nextTaskId;
      projectId;
      title = "Other Tasks";
      description = "General pool for unallocated HH";
      hhBudget = otherTasksPoolHH;
      dependencies = [];
      status = #proposed;
      assignee = null;
      completionTime = null;
      auditStartTime = null;
    };

    nextTaskId += 1;
    tasks := natMap.put(tasks, otherTask.id, otherTask);

    projectId;
  };

  // Any signed-in participant may create tasks in a project that is in pledging or active phase.
  public shared ({ caller }) func createTask(projectId : Nat, title : Text, description : Text, hhBudget : Float, dependencies : [Nat]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in participants can create tasks");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        // Tasks may only be defined while the project is in pledging or active phase
        if (project.status != #pledging and project.status != #active) {
          Debug.trap("Tasks can only be created for projects in pledging or active phase");
        };

        if (hhBudget <= 0.0) {
          Debug.trap("Invalid: Task HH budget must be positive");
        };

        let otherTasksHH = switch (getOtherTaskForProject(projectId)) {
          case null { 0.0 };
          case (?otherTask) { otherTask.hhBudget };
        };

        let currentTotalBudget = getTotalTaskBudget(projectId);
        let allowedBudget = project.estimatedTotalHH - otherTasksHH;

        if (currentTotalBudget + hhBudget > allowedBudget) {
          Debug.trap("Invalid: Total task budget would exceed allowed HH (excluding Other Tasks pool)");
        };

        for (depId in dependencies.vals()) {
          switch (natMap.get(tasks, depId)) {
            case null { Debug.trap("Dependency task not found") };
            case (?depTask) {
              if (depTask.projectId != projectId) {
                Debug.trap("Dependency task must belong to same project");
              };
            };
          };
        };

        let taskId = nextTaskId;
        nextTaskId += 1;

        let task : Task = {
          id = taskId;
          projectId;
          title;
          description;
          hhBudget;
          dependencies;
          status = #proposed;
          assignee = null;
          completionTime = null;
          auditStartTime = null;
        };

        tasks := natMap.put(tasks, taskId, task);
        taskId;
      };
    };
  };

  func getOtherTaskForProject(projectId : Nat) : ?Task {
    let projectTasks = Iter.toArray(natMap.vals(tasks));
    Array.find<Task>(projectTasks, func(t) { t.projectId == projectId and t.title == "Other Tasks" });
  };

  // Pledge functions

  // Any signed-in participant may pledge HH to any project or task.
  public shared ({ caller }) func pledgeToTask(projectId : Nat, target : PledgeTarget, amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in participants can pledge");
    };

    if (amount <= 0.0) {
      Debug.trap("Invalid: Pledge amount must be positive");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {

        // Calculate total existing pledges (approved + pending) for the project
        let projectPledges = Iter.toArray(natMap.vals(pledges));
        let relevantPledges = Array.filter<Pledge>(
          projectPledges,
          func(p) { p.projectId == projectId and (p.status == #confirmed or p.status == #pending or p.status == #approved) },
        );

        let totalExistingPledged : Float = Array.foldLeft<Pledge, Float>(
          relevantPledges,
          0.0,
          func(acc, pledge) { acc + pledge.amount },
        );

        // Calculate total after new pledge
        let totalAfterNewPledge = totalExistingPledged + amount;

        // Compare against max HH budget
        if (totalAfterNewPledge > project.estimatedTotalHH) {
          let remainingBudget = project.estimatedTotalHH - totalExistingPledged;
          Debug.trap(
            "Pledge exceeds remaining budget by " #
            Float.toText(totalAfterNewPledge - project.estimatedTotalHH) #
            " HH. Remaining budget: " #
            Float.toText(remainingBudget) #
            " HH."
          );
        };

        switch (target) {
          case (#task taskId) {
            switch (natMap.get(tasks, taskId)) {
              case null { Debug.trap("Target task not found") };
              case (?task) {
                if (task.projectId != projectId) {
                  Debug.trap("Target task does not belong to project");
                };
              };
            };
          };
          case (#otherTasks) {
            switch (getOtherTaskForProject(projectId)) {
              case null { Debug.trap("Other Tasks pool not found for project") };
              case (?_) { };
            };
          };
        };

        let pledge : Pledge = {
          user = caller;
          projectId;
          amount;
          target;
          status = #pending;
          timestamp = Time.now();
        };

        pledges := natMap.put(pledges, nextPledgeId, pledge);
        nextPledgeId += 1;

        let isParticipant = Array.find<Principal>(project.participants, func(p) { p == caller }) != null;
        let updatedParticipants = if (not isParticipant and caller != project.creator) {
          Array.append<Principal>(project.participants, [caller]);
        } else {
          project.participants;
        };

        let updatedProject = {
          project with
          participants = updatedParticipants;
        };

        projects := natMap.put(projects, projectId, updatedProject);

        switch (principalMap.get(userProfiles, caller)) {
          case null { };
          case (?profile) {
            let updatedProfile = {
              profile with
              totalPledgedHH = profile.totalPledgedHH + amount;
            };
            userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
          };
        };
      };
    };
  };

  // Update ProjectStatus based on confirmed HH (not pending).
  func updateProjectStatus(projectId : Nat) : () {
    switch (natMap.get(projects, projectId)) {
      case null { };
      case (?project) {
        if (project.status != #pledging) { return };

        let totalConfirmed = getTotalAssignedHH(projectId);
        let activationThreshold = project.estimatedTotalHH * 0.8;

        let hasPendingPledges = do {
          let allPledges = Iter.toArray(natMap.vals(pledges));
          Array.find<Pledge>(
            allPledges,
            func(p) {
              p.projectId == projectId and p.status == #pending
            },
          ) != null;
        };

        if (totalConfirmed > activationThreshold and not hasPendingPledges) {
          let activatedProject = { project with status = #active };
          projects := natMap.put(projects, projectId, activatedProject);
        };
      };
    };
  };

  // Only the Project Manager (PM / creator) of a project may confirm tasks for HH.
  public shared ({ caller }) func confirmTask(taskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in users can confirm tasks");
    };

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        switch (natMap.get(projects, task.projectId)) {
          case null { Debug.trap("Project not found") };
          case (?project) {
            // Only the PM (project creator) may confirm tasks for HH
            if (caller != project.creator) {
              Debug.trap("Unauthorized: Only the Project Manager (creator) can confirm tasks for HH");
            };

            // Move task into "taskConfirmed state" first
            let confirmedTask = { task with status = #taskConfirmed };

            tasks := natMap.put(tasks, taskId, confirmedTask);
          };
        };
      };
    };
  };

  // The PM may then confirm individual pledges once the task has been confirmed.
  public shared ({ caller }) func confirmPledge(pledgeId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in users can confirm pledges");
    };

    switch (natMap.get(pledges, pledgeId)) {
      case null { Debug.trap("Pledge not found") };
      case (?pledge) {
        switch (natMap.get(projects, pledge.projectId)) {
          case null { Debug.trap("Project not found") };
          case (?project) {
            // Only the PM (project creator) may confirm pledges
            if (caller != project.creator) {
              Debug.trap("Unauthorized: Only the Project Manager (creator) can confirm pledges");
            };

            if (pledge.status != #pending and pledge.status != #approved) {
              Debug.trap("Pledge is not pending approval or already confirmed");
            };

            // Only allow confirming pledges once the corresponding task has been confirmed
            let taskConfirmed = switch (pledge.target) {
              case (#task taskId) {
                switch (natMap.get(tasks, taskId)) {
                  case null { Debug.trap("Target task not found") };
                  case (?task) {
                    task.status == #taskConfirmed or task.status == #completed
                  };
                };
              };
              case (#otherTasks) { true };
            };

            if (not taskConfirmed) {
              Debug.trap("Task must be confirmed first before confirming pledges");
            };

            // Move pledge to "confirmed" state
            let confirmedPledge = {
              pledge with
              status = #confirmed;
            };

            pledges := natMap.put(pledges, pledgeId, confirmedPledge);
            updateProjectStatus(pledge.projectId);
          };
        };
      };
    };
  };

  // Only the Project Manager (PM / creator) may reassign from Other Tasks pool.
  public shared ({ caller }) func reassignFromOtherTasks(pledgeId : Nat, newTaskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in users can reassign from Other Tasks pool");
    };

    switch (natMap.get(pledges, pledgeId)) {
      case null { Debug.trap("Other Tasks pledge not found") };
      case (?pledge) {
        switch (pledge.target) {
          case (#otherTasks) {
            switch (natMap.get(projects, pledge.projectId)) {
              case null { Debug.trap("Project not found") };
              case (?project) {
                // Only the PM (project creator) may reassign.
                if (caller != project.creator) {
                  Debug.trap("Unauthorized: Only the Project Manager (creator) can reassign from Other Tasks pool");
                };

                switch (natMap.get(tasks, newTaskId)) {
                  case null { Debug.trap("New target task not found") };
                  case (?newTask) {
                    if (newTask.projectId != project.id) {
                      Debug.trap("New target task does not belong to same project");
                    };

                    let reassignedPledge = {
                      pledge with
                      target = #task newTaskId;
                      status = #reassigned; // Mark the old pledge as reassigned
                    };

                    pledges := natMap.put(pledges, pledgeId, reassignedPledge);

                    let reassignmentPledge : Pledge = {
                      user = pledge.user;
                      projectId = pledge.projectId;
                      amount = pledge.amount;
                      target = #task newTaskId;
                      status = #confirmed; // New target task is confirmed by default
                      timestamp = Time.now();
                    };

                    pledges := natMap.put(pledges, nextPledgeId, reassignmentPledge);
                    nextPledgeId += 1;

                    updateProjectStatus(pledge.projectId);
                  };
                };
              };
            };
          };
          case (#task _) { Debug.trap("Not an Other Tasks pledge") };
        };
      };
    };
  };

  // Task lifecycle functions

  public shared ({ caller }) func acceptTask(taskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can accept tasks");
    };

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        if (not isProjectParticipant(task.projectId, caller)) {
          Debug.trap("Unauthorized: Only project participants can accept tasks");
        };

        if (task.status != #proposed and task.status != #active) {
          Debug.trap("Task is not available for acceptance");
        };

        switch (task.assignee) {
          case (?assignee) {
            if (assignee != caller) {
              Debug.trap("Task is already assigned to another user");
            };
          };
          case null { };
        };

        for (depId in task.dependencies.vals()) {
          switch (natMap.get(tasks, depId)) {
            case null { Debug.trap("Dependency task not found") };
            case (?depTask) {
              if (depTask.status != #completed) {
                Debug.trap("Dependencies are not completed");
              };
            };
          };
        };

        let updatedTask = {
          task with
          status = #inProgress;
          assignee = ?caller;
        };

        tasks := natMap.put(tasks, taskId, updatedTask);
      };
    };
  };

  public shared ({ caller }) func completeTask(taskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can complete tasks");
    };

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        switch (task.assignee) {
          case null { Debug.trap("Task has no assignee") };
          case (?assignee) {
            if (assignee != caller) {
              Debug.trap("Unauthorized: Only the task assignee can complete this task");
            };
          };
        };

        if (task.status != #inProgress) {
          Debug.trap("Task is not in progress");
        };

        let now = Time.now();
        let updatedTask = {
          task with
          status = #inAudit;
          auditStartTime = ?now;
        };

        tasks := natMap.put(tasks, taskId, updatedTask);
      };
    };
  };

  // Only a Mentor who has already pledged HH to the specific project or task may approve (sign off) a task.
  public shared ({ caller }) func approveTask(taskId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in users can approve tasks");
    };

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        // Caller must be a Mentor
        let callerProfile = switch (principalMap.get(userProfiles, caller)) {
          case null { Debug.trap("User profile not found: only a Mentor who has pledged may sign off tasks") };
          case (?profile) { profile };
        };

        switch (callerProfile.squadRole) {
          case (#Mentor) { /* allowed role */ };
          case (_) {
            Debug.trap("Unauthorized: Only a Mentor may sign off (approve) a task");
          };
        };

        // Caller must have pledged to this project or specifically to this task
        let pledgedToProject = hasPledgedToProject(caller, task.projectId);
        let pledgedToThisTask = hasPledgedToTask(caller, task.projectId, taskId);

        if (not pledgedToProject and not pledgedToThisTask) {
          Debug.trap("Unauthorized: Only a Mentor who has pledged HH to this project or task may sign off the task");
        };

        if (task.status != #inAudit) {
          Debug.trap("Task is not in audit");
        };

        switch (task.auditStartTime) {
          case null { Debug.trap("Audit start time not set") };
          case (?auditStart) {
            let now = Time.now();
            let auditWindowNs : Int = 24 * 60 * 60 * 1_000_000_000;

            if (now - auditStart < auditWindowNs) {
              Debug.trap("Audit window has not passed yet (24 hours required)");
            };

            if (hasActiveChallenges(taskId)) {
              Debug.trap("Cannot approve task with active challenges");
            };
          };
        };

        let now = Time.now();
        let updatedTask = {
          task with
          status = #completed;
          completionTime = ?now;
        };

        tasks := natMap.put(tasks, taskId, updatedTask);

        switch (task.assignee) {
          case null { };
          case (?assignee) {
            switch (principalMap.get(userProfiles, assignee)) {
              case null { };
              case (?profile) {
                let updatedProfile = {
                  profile with
                  totalEarnedHH = profile.totalEarnedHH + task.hhBudget;
                };
                userProfiles := principalMap.put(userProfiles, assignee, updatedProfile);
              };
            };
          };
        };
      };
    };
  };

  public shared ({ caller }) func challengeTask(taskId : Nat, stakeHH : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can challenge tasks");
    };

    if (stakeHH < 1.0) {
      Debug.trap("Invalid: Challenge requires at least 1 HH stake");
    };

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        if (not isProjectParticipant(task.projectId, caller)) {
          Debug.trap("Unauthorized: Only project participants can challenge tasks");
        };

        if (task.status != #inAudit) {
          Debug.trap("Task is not in audit");
        };

        switch (task.auditStartTime) {
          case null { Debug.trap("Audit start time not set") };
          case (?auditStart) {
            let now = Time.now();
            let auditWindowNs : Int = 24 * 60 * 60 * 1_000_000_000;
            if (now - auditStart >= auditWindowNs) {
              Debug.trap("Audit window has closed");
            };
          };
        };

        switch (principalMap.get(userProfiles, caller)) {
          case null { Debug.trap("User profile not found") };
          case (?profile) {
            if (profile.totalEarnedHH < stakeHH) {
              Debug.trap("Insufficient earned HH for stake");
            };
          };
        };

        let now = Time.now();
        let challenge : Challenge = {
          challenger = caller;
          taskId;
          stakeHH;
          timestamp = now;
        };

        challenges := natMap.put(challenges, nextChallengeId, challenge);
        nextChallengeId += 1;
      };
    };
  };

  public shared ({ caller }) func vote(targetId : Nat, voteType : { #taskProposal; #challenge; #finalPrize }) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can vote");
    };

    let voterProfile = switch (principalMap.get(userProfiles, caller)) {
      case null { Debug.trap("Voter profile not found") };
      case (?profile) { profile };
    };

    if (hasAlreadyVoted(caller, targetId, voteType)) {
      Debug.trap("You have already voted on this item");
    };

    switch (voteType) {
      case (#taskProposal) {
        switch (natMap.get(tasks, targetId)) {
          case null { Debug.trap("Task not found") };
          case (?task) {
            if (not isProjectParticipant(task.projectId, caller)) {
              Debug.trap("Unauthorized: Only project participants can vote on task proposals");
            };
            if (task.status != #proposed) {
              Debug.trap("Task is not proposed for voting");
            };
          };
        };
      };
      case (#challenge) {
        switch (natMap.get(challenges, targetId)) {
          case null { Debug.trap("Challenge not found") };
          case (?challenge) {
            switch (natMap.get(tasks, challenge.taskId)) {
              case null { Debug.trap("Challenged task not found") };
              case (?task) {
                if (not isProjectParticipant(task.projectId, caller)) {
                  Debug.trap("Unauthorized: Only project participants can vote on challenges");
                };
              };
            };
          };
        };
      };
      case (#finalPrize) {
        switch (natMap.get(projects, targetId)) {
          case null { Debug.trap("Project not found") };
          case (?project) {
            if (not isProjectParticipant(targetId, caller)) {
              Debug.trap("Unauthorized: Only project participants can vote on final prize distribution");
            };
            if (project.status != #completed) {
              Debug.trap("Project is not completed for final prize voting");
            };
          };
        };
      };
    };

    let now = Time.now();
    let newVote : Vote = {
      voter = caller;
      targetId;
      weight = voterProfile.votingPower;
      voteType;
      timestamp = now;
    };

    votes := natMap.put(votes, nextVoteId, newVote);
    nextVoteId += 1;
  };

  public shared ({ caller }) func ratePeer(ratee : Principal, projectId : Nat, rating : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can rate peers");
    };

    if (caller == ratee) {
      Debug.trap("Cannot rate yourself");
    };

    if (rating < 0.0 or rating > 5.0) {
      Debug.trap("Invalid: Rating must be between 0 and 5");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        if (project.status != #completed) {
          Debug.trap("Project is not completed for rating");
        };

        if (not isProjectParticipant(projectId, caller)) {
          Debug.trap("Unauthorized: You are not a participant in this project");
        };

        if (not isProjectParticipant(projectId, ratee)) {
          Debug.trap("Invalid: Ratee is not a participant in this project");
        };

        switch (project.completionTime) {
          case null { Debug.trap("Project completion time not set") };
          case (?completionTime) {
            let now = Time.now();
            let ratingWindowNs : Int = 7 * 24 * 60 * 60 * 1_000_000_000;
            if (now - completionTime > ratingWindowNs) {
              Debug.trap("Rating window has closed");
            };
          };
        };

        if (hasAlreadyRated(caller, ratee, projectId)) {
          Debug.trap("You have already rated this peer in this project");
        };

        let now = Time.now();
        let peerRating : PeerRating = {
          rater = caller;
          ratee;
          projectId;
          rating;
          timestamp = now;
        };

        peerRatings := natMap.put(peerRatings, nextRatingId, peerRating);
        nextRatingId += 1;

        let allRatings = Iter.toArray(natMap.vals(peerRatings));
        let rateeRatings = Array.filter<PeerRating>(allRatings, func(r) { r.ratee == ratee });

        if (rateeRatings.size() > 0) {
          let totalRating = Array.foldLeft<PeerRating, Float>(
            rateeRatings,
            0.0,
            func(acc, r) {
              let ratingWeight = switch (principalMap.get(userProfiles, r.rater)) {
                case null { 1.0 };
                case (?raterProfile) {
                  switch (raterProfile.squadRole) {
                    case (#Mentor) { 3.0 };
                    case (#Journeyman) { 2.0 };
                    case (#Apprentice) { 1.0 };
                    case (#Masters) { 1.0 };
                  };
                };
              };
              acc + (r.rating * ratingWeight);
            },
          );
          let totalWeight = Array.foldLeft<PeerRating, Float>(
            rateeRatings,
            0.0,
            func(acc, r) {
              let ratingWeight = switch (principalMap.get(userProfiles, r.rater)) {
                case null { 1.0 };
                case (?raterProfile) {
                  switch (raterProfile.squadRole) {
                    case (#Mentor) { 3.0 };
                    case (#Journeyman) { 2.0 };
                    case (#Apprentice) { 1.0 };
                    case (#Masters) { 1.0 };
                  };
                };
              };
              acc + ratingWeight;
            },
          );

          let avgRating = if (totalWeight > 0.0) {
            totalRating / totalWeight;
          } else {
            0.0;
          };

          switch (principalMap.get(userProfiles, ratee)) {
            case null { };
            case (?profile) {
              let updatedProfile = {
                profile with
                overallReputationScore = avgRating;
                votingPower = avgRating * avgRating;
              };
              userProfiles := principalMap.put(userProfiles, ratee, updatedProfile);
            };
          };
        };
      };
    };
  };

  // Only the PM (project creator) may mark a project as completed.
  public shared ({ caller }) func completeProject(projectId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only signed-in users can complete projects");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        // Only the PM (project creator) may complete the project
        if (caller != project.creator) {
          Debug.trap("Unauthorized: Only the Project Manager (creator) can complete the project");
        };

        if (project.status != #active) {
          Debug.trap("Project is not active");
        };

        let now = Time.now();
        let updatedProject = {
          project with
          status = #completed;
          completionTime = ?now;
        };

        projects := natMap.put(projects, projectId, updatedProject);
      };
    };
  };

  // Query functions

  public query ({ caller }) func getProjects() : async [Project] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view projects");
    };
    Iter.toArray(natMap.vals(projects));
  };

  public query ({ caller }) func getTasks(projectId : Nat) : async [Task] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view tasks");
    };

    let allTasks = Iter.toArray(natMap.vals(tasks));
    Array.filter<Task>(allTasks, func(task) { task.projectId == projectId });
  };

  public query ({ caller }) func getPledges(projectId : Nat) : async [Pledge] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view pledges");
    };

    let allPledges = Iter.toArray(natMap.vals(pledges));
    let projectPledges = Array.filter<Pledge>(allPledges, func(pledge) { pledge.projectId == projectId });

    if (isProjectParticipant(projectId, caller) or AccessControl.isAdmin(accessControlState, caller)) {
      projectPledges;
    } else {
      Array.filter<Pledge>(projectPledges, func(pledge) { pledge.user == caller });
    };
  };

  public query ({ caller }) func getVotes(targetId : Nat) : async [Vote] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view votes");
    };

    let allVotes = Iter.toArray(natMap.vals(votes));
    Array.filter<Vote>(allVotes, func(v) { v.targetId == targetId });
  };

  public query ({ caller }) func getPeerRatings(projectId : Nat) : async [PeerRating] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view peer ratings");
    };

    let allRatings = Iter.toArray(natMap.vals(peerRatings));
    let projectRatings = Array.filter<PeerRating>(allRatings, func(rating) { rating.projectId == projectId });

    if (isProjectParticipant(projectId, caller) or AccessControl.isAdmin(accessControlState, caller)) {
      projectRatings;
    } else {
      Array.filter<PeerRating>(projectRatings, func(rating) { rating.rater == caller or rating.ratee == caller });
    };
  };

  public query ({ caller }) func getChallenges(taskId : Nat) : async [Challenge] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view challenges");
    };

    let allChallenges = Iter.toArray(natMap.vals(challenges));
    Array.filter<Challenge>(allChallenges, func(challenge) { challenge.taskId == taskId });
  };

  // Public function to trigger expiration check.
  // Only admins may trigger this maintenance operation to prevent abuse.
  public shared ({ caller }) func checkAndExpireOldPledges() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can trigger pledge expiration");
    };

    let currentTime = Time.now();
    let expirationPeriod : Int = 14 * 24 * 60 * 60 * 1_000_000_000;

    let allPledges = Iter.toArray(natMap.entries(pledges));

    for ((id, pledge) in allPledges.vals()) {
      switch (pledge.status) {
        case (#pending) {
          if (currentTime - pledge.timestamp > expirationPeriod) {
            // Expire the pledge
            let expiredPledge = { pledge with status = #expired };
            pledges := natMap.put(pledges, id, expiredPledge);
          };
        };
        case (_) { };
      };
    };
  };
};

