import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";

module {
  // Old UserProfile type without the squadRole field
  type OldUserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float;
    totalEarnedHH : Float;
    overallReputationScore : Float;
    votingPower : Float;
  };

  // New SquadRole and UserProfile types with the squadRole field
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
  };

  // Extended OldState and NewState types to include all state variables
  type OldState = {
    var userProfiles : OrderedMap.Map<Principal, OldUserProfile>;
    // Add all other state variables with their original types here
    var projects : OrderedMap.Map<Nat, Project>;
    var tasks : OrderedMap.Map<Nat, Task>;
    var pledges : OrderedMap.Map<Nat, Pledge>;
    var votes : OrderedMap.Map<Nat, Vote>;
    var challenges : OrderedMap.Map<Nat, Challenge>;
    var peerRatings : OrderedMap.Map<Nat, PeerRating>;
    var nextProjectId : Nat;
    var nextTaskId : Nat;
    var nextPledgeId : Nat;
    var nextVoteId : Nat;
    var nextChallengeId : Nat;
    var nextRatingId : Nat;
  };

  type NewState = {
    var userProfiles : OrderedMap.Map<Principal, UserProfile>;
    // Add all other state variables with their new types here
    var projects : OrderedMap.Map<Nat, Project>;
    var tasks : OrderedMap.Map<Nat, Task>;
    var pledges : OrderedMap.Map<Nat, Pledge>;
    var votes : OrderedMap.Map<Nat, Vote>;
    var challenges : OrderedMap.Map<Nat, Challenge>;
    var peerRatings : OrderedMap.Map<Nat, PeerRating>;
    var nextProjectId : Nat;
    var nextTaskId : Nat;
    var nextPledgeId : Nat;
    var nextVoteId : Nat;
    var nextChallengeId : Nat;
    var nextRatingId : Nat;
  };

  // Migration function updated for full state transformation
  public func run(oldState : OldState) : NewState {
    let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    let userProfiles = principalMap.map<OldUserProfile, UserProfile>(
      oldState.userProfiles,
      func(_principal, oldProfile) {
        { oldProfile with squadRole = #Apprentice };
      },
    );

    // Directly map all other state variables without changes
    {
      var userProfiles;
      var projects = oldState.projects;
      var tasks = oldState.tasks;
      var pledges = oldState.pledges;
      var votes = oldState.votes;
      var challenges = oldState.challenges;
      var peerRatings = oldState.peerRatings;
      var nextProjectId = oldState.nextProjectId;
      var nextTaskId = oldState.nextTaskId;
      var nextPledgeId = oldState.nextPledgeId;
      var nextVoteId = oldState.nextVoteId;
      var nextChallengeId = oldState.nextChallengeId;
      var nextRatingId = oldState.nextRatingId;
    };
  };

  // Types for other state variables (should match your existing definitions)
  type Project = {
    id : Nat;
    title : Text;
    description : Text;
    estimatedTotalHH : Float;
    finalMonetaryValue : Float;
    sharedResourceLink : ?Text;
    status : { #pledging; #active; #completed; #archived };
    totalPledgedHH : Float;
    creator : Principal;
    participants : [Principal];
    completionTime : ?Int;
  };

  type Task = {
    id : Nat;
    projectId : Nat;
    title : Text;
    description : Text;
    hhBudget : Float;
    dependencies : [Nat];
    status : { #proposed; #active; #inProgress; #inAudit; #completed; #rejected };
    assignee : ?Principal;
    completionTime : ?Int;
    auditStartTime : ?Int;
  };

  type Pledge = {
    user : Principal;
    projectId : Nat;
    pledgedHH : Float;
  };

  type Vote = {
    voter : Principal;
    targetId : Nat;
    weight : Float;
    voteType : { #taskProposal; #challenge; #finalPrize };
    timestamp : Int;
  };

  type Challenge = {
    challenger : Principal;
    taskId : Nat;
    stakeHH : Float;
    timestamp : Int;
  };

  type PeerRating = {
    rater : Principal;
    ratee : Principal;
    projectId : Nat;
    rating : Float;
    timestamp : Int;
  };
};

