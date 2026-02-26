import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Array "mo:base/Array";

actor IASAChallenge {
  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside AccessControl.assignRole
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type SquadRole = {
    #Apprentice;
    #Journeyman;
    #Mentor;
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

  public type TaskStatus = {
    #proposed;
    #active;
    #inProgress;
    #inAudit;
    #completed;
    #rejected;
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

  public type Pledge = {
    user : Principal;
    projectId : Nat;
    pledgedHH : Float;
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
  transient let natMap = OrderedMap.Make<Nat>(func(a : Nat, b : Nat) : { #less; #equal; #greater } {
    if (a < b) #less else if (a == b) #equal else #greater
  });

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

  // ── Authorization helpers ────────────────────────────────────────────────

  /// Require the caller to have at least the #user role (blocks anonymous/guest callers).
  private func requireUser(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Debug.trap("Unauthorized: Only registered users can perform this action");
    };
  };

  /// Require the caller to have the #admin role.
  private func requireAdmin(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
  };

  // ── Internal helpers ─────────────────────────────────────────────────────

  private func isProjectParticipant(projectId : Nat, user : Principal) : Bool {
    switch (natMap.get(projects, projectId)) {
      case null { false };
      case (?project) {
        if (project.creator == user) { return true };
        Array.find<Principal>(project.participants, func(p) { p == user }) != null;
      };
    };
  };

  private func hasAlreadyVoted(voter : Principal, targetId : Nat, voteType : { #taskProposal; #challenge; #finalPrize }) : Bool {
    let allVotes = Iter.toArray(natMap.vals(votes));
    Array.find<Vote>(
      allVotes,
      func(v) {
        v.voter == voter and v.targetId == targetId and v.voteType == voteType;
      },
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

  private func hasAlreadyRated(rater : Principal, ratee : Principal, projectId : Nat) : Bool {
    let allRatings = Iter.toArray(natMap.vals(peerRatings));
    Array.find<PeerRating>(
      allRatings,
      func(r) {
        r.rater == rater and r.ratee == ratee and r.projectId == projectId;
      },
    ) != null;
  };

  private func hasActiveChallenges(taskId : Nat) : Bool {
    let allChallenges = Iter.toArray(natMap.vals(challenges));
    Array.find<Challenge>(allChallenges, func(c) { c.taskId == taskId }) != null;
  };

  // ── User profile functions ───────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // ── Application functions ────────────────────────────────────────────────

  /// Register the calling principal as a participant. Requires #user role.
  public shared ({ caller }) func registerUser(username : Text, role : SquadRole) : async () {
    requireUser(caller);
    switch (principalMap.get(userProfiles, caller)) {
      case (?_) { Debug.trap("User already registered") };
      case null {
        let newProfile : UserProfile = {
          friendlyUsername = username;
          profilePicture = "";
          totalPledgedHH = 0.0;
          totalEarnedHH = 0.0;
          overallReputationScore = 0.0;
          votingPower = 0.0;
          squadRole = role;
          totalEnablerPoints = 0;
          efficiencyBadgesCount = 0;
          constructivenessRating = 0.0;
        };
        userProfiles := principalMap.put(userProfiles, caller, newProfile);
      };
    };
  };

  /// Create a new project. Requires #user role.
  public shared ({ caller }) func createProject(
    title : Text,
    description : Text,
    estimatedTotalHH : Float,
    finalMonetaryValue : Float,
    sharedResourceLink : ?Text,
  ) : async Nat {
    requireUser(caller);

    if (estimatedTotalHH <= 0.0) {
      Debug.trap("Invalid: Estimated total HH must be positive");
    };
    if (finalMonetaryValue < 0.0) {
      Debug.trap("Invalid: Final monetary value cannot be negative");
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
    projectId;
  };

  /// Pledge hours to a project. Requires #user role.
  public shared ({ caller }) func pledgeHH(projectId : Nat, pledgedHH : Float) : async () {
    requireUser(caller);

    if (pledgedHH <= 0.0) {
      Debug.trap("Invalid: Pledged HH must be positive");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        if (project.status != #pledging) {
          Debug.trap("Project is not in pledging status");
        };

        let pledge : Pledge = {
          user = caller;
          projectId;
          pledgedHH;
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
          totalPledgedHH = project.totalPledgedHH + pledgedHH;
          participants = updatedParticipants;
        };

        projects := natMap.put(projects, projectId, updatedProject);

        if (updatedProject.totalPledgedHH >= updatedProject.estimatedTotalHH) {
          let activeProject = { updatedProject with status = #active };
          projects := natMap.put(projects, projectId, activeProject);
        };

        switch (principalMap.get(userProfiles, caller)) {
          case null {};
          case (?profile) {
            let updatedProfile = {
              profile with
              totalPledgedHH = profile.totalPledgedHH + pledgedHH;
            };
            userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
          };
        };
      };
    };
  };

  /// Create a task within a project. Requires #user role and project participation.
  public shared ({ caller }) func createTask(
    projectId : Nat,
    title : Text,
    description : Text,
    hhBudget : Float,
    dependencies : [Nat],
  ) : async Nat {
    requireUser(caller);

    if (hhBudget <= 0.0) {
      Debug.trap("Invalid: Task HH budget must be positive");
    };

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        if (not isProjectParticipant(projectId, caller)) {
          Debug.trap("Unauthorized: Only project participants can create tasks");
        };

        if (project.status != #active) {
          Debug.trap("Project is not active");
        };

        let currentTotalBudget = getTotalTaskBudget(projectId);
        if (currentTotalBudget + hhBudget > project.totalPledgedHH) {
          Debug.trap("Invalid: Total task budget would exceed total pledged HH");
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

  /// Accept (self-assign) a task. Requires #user role and project participation.
  public shared ({ caller }) func acceptTask(taskId : Nat) : async () {
    requireUser(caller);

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
          case null {};
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

  /// Mark a task as complete (moves to audit). Requires #user role; caller must be assignee.
  public shared ({ caller }) func completeTask(taskId : Nat) : async () {
    requireUser(caller);

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

  /// Approve a task after the audit window. Requires #user role; caller must be project creator or admin.
  public shared ({ caller }) func approveTask(taskId : Nat) : async () {
    requireUser(caller);

    switch (natMap.get(tasks, taskId)) {
      case null { Debug.trap("Task not found") };
      case (?task) {
        switch (natMap.get(projects, task.projectId)) {
          case null { Debug.trap("Project not found") };
          case (?project) {
            if (caller != project.creator and not AccessControl.isAdmin(accessControlState, caller)) {
              Debug.trap("Unauthorized: Only project creator or admin can approve tasks");
            };
          };
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
          case null {};
          case (?assignee) {
            switch (principalMap.get(userProfiles, assignee)) {
              case null {};
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

  /// Challenge a task during its audit window. Requires #user role and project participation.
  public shared ({ caller }) func challengeTask(taskId : Nat, stakeHH : Float) : async () {
    requireUser(caller);

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

  /// Cast a vote. Requires #user role and relevant project participation.
  public shared ({ caller }) func vote(
    targetId : Nat,
    voteType : { #taskProposal; #challenge; #finalPrize },
  ) : async () {
    requireUser(caller);

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
              Debug.trap("Task is not in proposed status");
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
              Debug.trap("Project is not completed");
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

  /// Submit a peer rating. Requires #user role and project participation.
  public shared ({ caller }) func ratePeer(ratee : Principal, projectId : Nat, rating : Float) : async () {
    requireUser(caller);

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
          Debug.trap("Project is not completed");
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
            case null {};
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

  /// Complete a project. Requires #user role; caller must be project creator or admin.
  public shared ({ caller }) func completeProject(projectId : Nat) : async () {
    requireUser(caller);

    switch (natMap.get(projects, projectId)) {
      case null { Debug.trap("Project not found") };
      case (?project) {
        if (caller != project.creator and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only project creator or admin can complete project");
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

  // ── Query functions ──────────────────────────────────────────────────────

  public query ({ caller }) func getProjects() : async [Project] {
    requireUser(caller);
    Iter.toArray(natMap.vals(projects));
  };

  public query ({ caller }) func getTasks(projectId : Nat) : async [Task] {
    requireUser(caller);
    let allTasks = Iter.toArray(natMap.vals(tasks));
    Array.filter<Task>(allTasks, func(task) { task.projectId == projectId });
  };

  public query ({ caller }) func getPledges(projectId : Nat) : async [Pledge] {
    requireUser(caller);

    let allPledges = Iter.toArray(natMap.vals(pledges));
    let projectPledges = Array.filter<Pledge>(allPledges, func(pledge) { pledge.projectId == projectId });

    if (isProjectParticipant(projectId, caller) or AccessControl.isAdmin(accessControlState, caller)) {
      projectPledges;
    } else {
      Array.filter<Pledge>(projectPledges, func(pledge) { pledge.user == caller });
    };
  };

  public query ({ caller }) func getVotes(targetId : Nat) : async [Vote] {
    requireUser(caller);
    let allVotes = Iter.toArray(natMap.vals(votes));
    Array.filter<Vote>(allVotes, func(v) { v.targetId == targetId });
  };

  public query ({ caller }) func getPeerRatings(projectId : Nat) : async [PeerRating] {
    requireUser(caller);

    let allRatings = Iter.toArray(natMap.vals(peerRatings));
    let projectRatings = Array.filter<PeerRating>(allRatings, func(rating) { rating.projectId == projectId });

    if (isProjectParticipant(projectId, caller) or AccessControl.isAdmin(accessControlState, caller)) {
      projectRatings;
    } else {
      Array.filter<PeerRating>(projectRatings, func(rating) { rating.rater == caller or rating.ratee == caller });
    };
  };

  public query ({ caller }) func getChallenges(taskId : Nat) : async [Challenge] {
    requireUser(caller);
    let allChallenges = Iter.toArray(natMap.vals(challenges));
    Array.filter<Challenge>(allChallenges, func(challenge) { challenge.taskId == taskId });
  };
};
