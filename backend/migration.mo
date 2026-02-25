import OrderedMap "mo:base/OrderedMap";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import PrincipalLib "mo:base/Principal";
import Float "mo:base/Float";

module {
  // Type from old code
  type OldSquadRole = {
    #Apprentice;
    #Journeyman;
    #Mentor;
  };

  // Type from old code
  type OldUserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float.Float;
    totalEarnedHH : Float.Float;
    overallReputationScore : Float.Float;
    votingPower : Float.Float;
    squadRole : OldSquadRole;
  };

  // Type from old code
  type OldProjectStatus = {
    #pledging;
    #active;
    #completed;
    #archived;
  };

  // Type from old code
  type OldProject = {
    id : Nat;
    title : Text;
    description : Text;
    estimatedTotalHH : Float.Float;
    finalMonetaryValue : Float.Float;
    sharedResourceLink : ?Text;
    status : OldProjectStatus;
    totalPledgedHH : Float.Float;
    creator : PrincipalLib.Principal;
    participants : [PrincipalLib.Principal];
    completionTime : ?Int;
  };

  // Type from old code
  type OldTaskStatus = {
    #proposed;
    #active;
    #inProgress;
    #inAudit;
    #completed;
    #rejected;
  };

  // Type from old code
  type OldTask = {
    id : Nat;
    projectId : Nat;
    title : Text;
    description : Text;
    hhBudget : Float.Float;
    dependencies : [Nat];
    status : OldTaskStatus;
    assignee : ?PrincipalLib.Principal;
    completionTime : ?Int;
    auditStartTime : ?Int;
  };

  // Type from old code
  type OldPledge = {
    user : PrincipalLib.Principal;
    projectId : Nat;
    pledgedHH : Float.Float;
  };

  // Type from old code
  type OldVote = {
    voter : PrincipalLib.Principal;
    targetId : Nat;
    weight : Float.Float;
    voteType : { #taskProposal; #challenge; #finalPrize };
    timestamp : Int;
  };

  // Type from old code
  type OldChallenge = {
    challenger : PrincipalLib.Principal;
    taskId : Nat;
    stakeHH : Float.Float;
    timestamp : Int;
  };

  // Type from old code
  type OldPeerRating = {
    rater : PrincipalLib.Principal;
    ratee : PrincipalLib.Principal;
    projectId : Nat;
    rating : Float.Float;
    timestamp : Int;
  };

  // Old actor type referencing the original variables
  type OldActor = {
    var userProfiles : OrderedMap.Map<PrincipalLib.Principal, OldUserProfile>;
    var projects : OrderedMap.Map<Nat, OldProject>;
    var tasks : OrderedMap.Map<Nat, OldTask>;
    var pledges : OrderedMap.Map<Nat, OldPledge>;
    var votes : OrderedMap.Map<Nat, OldVote>;
    var challenges : OrderedMap.Map<Nat, OldChallenge>;
    var peerRatings : OrderedMap.Map<Nat, OldPeerRating>;
    var nextProjectId : Nat;
    var nextTaskId : Nat;
    var nextPledgeId : Nat;
    var nextVoteId : Nat;
    var nextChallengeId : Nat;
    var nextRatingId : Nat;
  };

  // New user profile type - copied from new code
  type NewUserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float.Float;
    totalEarnedHH : Float.Float;
    overallReputationScore : Float.Float;
    votingPower : Float.Float;
    squadRole : OldSquadRole;
    totalEnablerPoints : Nat;
    efficiencyBadgesCount : Nat;
    constructivenessRating : Float.Float;
  };

  // New actor type referencing the new variables and fields
  type NewActor = {
    var userProfiles : OrderedMap.Map<PrincipalLib.Principal, NewUserProfile>;
    var projects : OrderedMap.Map<Nat, OldProject>;
    var tasks : OrderedMap.Map<Nat, OldTask>;
    var pledges : OrderedMap.Map<Nat, OldPledge>;
    var votes : OrderedMap.Map<Nat, OldVote>;
    var challenges : OrderedMap.Map<Nat, OldChallenge>;
    var peerRatings : OrderedMap.Map<Nat, OldPeerRating>;
    var nextProjectId : Nat;
    var nextTaskId : Nat;
    var nextPledgeId : Nat;
    var nextVoteId : Nat;
    var nextChallengeId : Nat;
    var nextRatingId : Nat;
  };

  // Migration function called by the main actor via the with-clause
  public func run(old : OldActor) : NewActor {
    let principalMap = OrderedMap.Make<PrincipalLib.Principal>(PrincipalLib.compare);
    let newUserProfiles = principalMap.map<OldUserProfile, NewUserProfile>(
      old.userProfiles,
      func(_key, value) {
        {
          value with
          totalEnablerPoints = 0;
          efficiencyBadgesCount = 0;
          constructivenessRating = 0.0;
        };
      },
    );

    {
      var userProfiles = newUserProfiles;
      var projects = old.projects;
      var tasks = old.tasks;
      var pledges = old.pledges;
      var votes = old.votes;
      var challenges = old.challenges;
      var peerRatings = old.peerRatings;
      var nextProjectId = old.nextProjectId;
      var nextTaskId = old.nextTaskId;
      var nextPledgeId = old.nextPledgeId;
      var nextVoteId = old.nextVoteId;
      var nextChallengeId = old.nextChallengeId;
      var nextRatingId = old.nextRatingId;
    };
  };
};
