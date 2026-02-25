# Specification

## Summary
**Goal:** Extend the IASA Challenge backend with user profile types, persistent storage, and registration/retrieval functions, and wire up the frontend profile modal to use them.

**Planned changes:**
- Add a `SquadRole` variant type with `#Apprentice`, `#Journeyman`, and `#Mentor` constructors to `backend/main.mo`
- Define a `UserProfile` record type with all nine specified fields (FriendlyUsername, SquadRole, TotalPledgedHH, TotalEarnedHH, TotalEnablerPoints, OverallReputationScore, VotingPower, EfficiencyBadgesCount, ConstructivenessRating), merging with any existing UserProfile fields
- Add a stable variable mapping `Principal` to `UserProfile` for orthogonal persistence across canister upgrades
- Implement a `registerUser(username: Text, role: SquadRole)` update function that creates a new profile with zero defaults, calculates VotingPower as OverallReputationScore², and returns an error if the caller is already registered
- Implement a `getUserProfile()` query function that returns the caller's profile or a not-found indicator
- Update `ProfileSetupModal.tsx` to pass the selected `SquadRole` variant when calling `registerUser`

**User-visible outcome:** Users can open the profile setup modal, select a squad role (Apprentice, Journeyman, or Mentor), register their profile on-chain, and retrieve their stored profile data.
