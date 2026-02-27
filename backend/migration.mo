import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";

module {
  // UserProfile type used only in old state
  type OldUserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float;
    totalEarnedHH : Float;
    overallReputationScore : Float;
    votingPower : Float;
    squadRole : {
      #Apprentice;
      #Journeyman;
      #Mentor;
      #Masters;
    };
    totalEnablerPoints : Nat;
    efficiencyBadgesCount : Nat;
    constructivenessRating : Float;
  };

  // Old Actor state
  type OldActorState = {
    userProfiles : OrderedMap.Map<Principal, OldUserProfile>;
    projects : OrderedMap.Map<Nat, {
      id : Nat;
      title : Text;
      description : Text;
      estimatedTotalHH : Float;
      finalMonetaryValue : Float;
      sharedResourceLink : ?Text;
      status : {
        #pledging;
        #active;
        #completed;
        #archived;
      };
      totalPledgedHH : Float;
      creator : Principal;
      participants : [Principal];
      completionTime : ?Int;
    }>;
    tasks : OrderedMap.Map<Nat, {
      id : Nat;
      projectId : Nat;
      title : Text;
      description : Text;
      hhBudget : Float;
      dependencies : [Nat];
      status : {
        #proposed;
        #active;
        #inProgress;
        #inAudit;
        #completed;
        #rejected;
        #pendingConfirmation;
        #taskConfirmed;
      };
      assignee : ?Principal;
      completionTime : ?Int;
      auditStartTime : ?Int;
    }>;
    pledges : OrderedMap.Map<Nat, {
      user : Principal;
      projectId : Nat;
      amount : Float;
      target : {
        #task : Nat;
        #otherTasks;
      };
      status : {
        #pending;
        #approved;
        #reassigned;
        #confirmed;
        #expired;
      };
      timestamp : Int;
    }>;
    votes : OrderedMap.Map<Nat, {
      voter : Principal;
      targetId : Nat;
      weight : Float;
      voteType : { #taskProposal; #challenge; #finalPrize };
      timestamp : Int;
    }>;
    challenges : OrderedMap.Map<Nat, {
      challenger : Principal;
      taskId : Nat;
      stakeHH : Float;
      timestamp : Int;
    }>;
    peerRatings : OrderedMap.Map<Nat, {
      rater : Principal;
      ratee : Principal;
      projectId : Nat;
      rating : Float;
      timestamp : Int;
    }>;
    nextProjectId : Nat;
    nextTaskId : Nat;
    nextPledgeId : Nat;
    nextVoteId : Nat;
    nextChallengeId : Nat;
    nextRatingId : Nat;
  };

  // New types
  type ParticipationLevel = {
    #Apprentice;
    #Journeyman;
    #Master;
    #GuestArtist;
  };

  // Updated UserProfile now includes participationLevel and participationLevelLocked fields
  type NewUserProfile = {
    friendlyUsername : Text;
    profilePicture : Text;
    totalPledgedHH : Float;
    totalEarnedHH : Float;
    overallReputationScore : Float;
    votingPower : Float;
    squadRole : {
      #Apprentice;
      #Journeyman;
      #Mentor;
      #Masters;
    };
    totalEnablerPoints : Nat;
    efficiencyBadgesCount : Nat;
    constructivenessRating : Float;
    participationLevel : ParticipationLevel;
    participationLevelLocked : Bool;
  };

  type NewActorState = {
    userProfiles : OrderedMap.Map<Principal, NewUserProfile>;
    projects : OrderedMap.Map<Nat, {
      id : Nat;
      title : Text;
      description : Text;
      estimatedTotalHH : Float;
      finalMonetaryValue : Float;
      sharedResourceLink : ?Text;
      status : {
        #pledging;
        #active;
        #completed;
        #archived;
      };
      totalPledgedHH : Float;
      creator : Principal;
      participants : [Principal];
      completionTime : ?Int;
    }>;
    tasks : OrderedMap.Map<Nat, {
      id : Nat;
      projectId : Nat;
      title : Text;
      description : Text;
      hhBudget : Float;
      dependencies : [Nat];
      status : {
        #proposed;
        #active;
        #inProgress;
        #inAudit;
        #completed;
        #rejected;
        #pendingConfirmation;
        #taskConfirmed;
      };
      assignee : ?Principal;
      completionTime : ?Int;
      auditStartTime : ?Int;
    }>;
    pledges : OrderedMap.Map<Nat, {
      user : Principal;
      projectId : Nat;
      amount : Float;
      target : {
        #task : Nat;
        #otherTasks;
      };
      status : {
        #pending;
        #approved;
        #reassigned;
        #confirmed;
        #expired;
      };
      timestamp : Int;
    }>;
    votes : OrderedMap.Map<Nat, {
      voter : Principal;
      targetId : Nat;
      weight : Float;
      voteType : { #taskProposal; #challenge; #finalPrize };
      timestamp : Int;
    }>;
    challenges : OrderedMap.Map<Nat, {
      challenger : Principal;
      taskId : Nat;
      stakeHH : Float;
      timestamp : Int;
    }>;
    peerRatings : OrderedMap.Map<Nat, {
      rater : Principal;
      ratee : Principal;
      projectId : Nat;
      rating : Float;
      timestamp : Int;
    }>;
    nextProjectId : Nat;
    nextTaskId : Nat;
    nextPledgeId : Nat;
    nextVoteId : Nat;
    nextChallengeId : Nat;
    nextRatingId : Nat;
  };

  // Migration function: adds participationLevel = #GuestArtist and
  // participationLevelLocked = false for all existing profiles
  public func run(old : OldActorState) : NewActorState {
    let principalMap = OrderedMap.Make<Principal>(Principal.compare);

    let userProfiles = principalMap.map<OldUserProfile, NewUserProfile>(
      old.userProfiles,
      func(_unusedPrincipal, oldProfile) {
        {
          oldProfile with
          // Add participationLevel and participationLevelLocked fields
          // Old state represents "before level selection", so default to "not locked"
          participationLevel = #GuestArtist;
          participationLevelLocked = false;
        };
      },
    );

    {
      old with
      userProfiles;
    };
  };
};
