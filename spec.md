# IASA Challenge (Alpha Sandbox) v0.3 Collaborative Project Management Platform

## Overview
A collaborative project management platform where users can propose projects, pledge Human Hours (HH), complete tasks, and earn monetary rewards based on their contributions. Features advanced reputation system with efficiency tracking, contribution recognition, diplomacy scoring, and squad role hierarchy.

## Authentication
- Internet Identity authentication required
- Automatic profile creation upon first login
- Access control with roles (admin, user, guest)

## User Profiles (Three Scorecards)
Users have profiles with the following data stored in the backend:
- FriendlyUsername (unique identifier)
- ProfilePicture
- SquadRole (Apprentice, Journeyman, or Mentor)
- TotalPledgedHH (total hours pledged across all projects)
- TotalEarnedHH (total hours earned from completed tasks)
- TotalEnablerPoints (C-Score tracking how often others' tasks used this user's contributions)
- OverallReputationScore (0-5 stars, calculated with diversity factors and bonuses)
- VotingPower (calculated as OverallReputationScore²)
- EfficiencyBadgesCount (number of efficiency badges earned)
- ConstructivenessRating (average rating from challenge resolutions)

## Project Management
Users can create projects with:
- Title
- Description
- EstimatedTotalHH (estimated total human hours needed)
- FinalMonetaryValue (total prize money)
- TotalPledgedHH (current pledged hours)
- Status (#pledging, #active, #completed)
- SharedResourceLink (optional)
- TotalSavedHH (efficiency metric showing HH_Budget vs HH_Actual difference)

Project statuses automatically transition from #pledging to #active when TotalPledgedHH ≥ EstimatedTotalHH.

## HH Pledge Model
- Users can pledge Human Hours to projects in #pledging status
- Display progress bar showing pledge completion
- Show payout-per-HH calculation (FinalMonetaryValue / EstimatedTotalHH)
- Only project participants can create and accept tasks

## Task Management System
Tasks have the following fields:
- Title
- Description
- HH_Budget (allocated hours)
- HH_Actual (actual hours spent, entered on completion)
- BasedOnContributionID (optional reference to contributing user)
- DependsOnTaskID (optional dependency on another task)
- Status (#proposed, #active, #inProgress, #inAudit, #completed, #rejected)

### Evandro Factor Logic
- When HH_Actual < HH_Budget: difference returned to project pool
- User earns only HH_Actual hours
- Efficiency Badge awarded for under-budget completion (+0.1 reputation bonus per badge)
- Users cannot accept tasks if dependencies are incomplete

## Contribution System (C-Token Prototype)
- When completing tasks, users can optionally select a BasedOnContributionID user
- When task citing another user's contribution passes audit, that contributor gains +1 TotalEnablerPoint
- TotalEnablerPoints displayed as C-Score in user profile

## Audit & Challenge System with Diplomacy
- 24-hour audit window after task completion
- Any project participant can challenge by staking ≥1 HH
- After challenge resolution, Task Owner rates Challenger's "Constructiveness" (1-5 stars)
- Low constructiveness ratings reduce Challenger's reputation weighting in future calculations

## Advanced Reputation Algorithm with Squad Role Weighting
Reputation calculated using weighted averages:
- Same project rating = ×1.0 weight
- Cross-team rating = ×1.5 weight  
- Mentor role rating = ×3.0 weight
- Efficiency badge bonus: +0.1 per badge
- Low diplomacy penalty applied for poor constructiveness ratings
- VotingPower = OverallReputationScore² (updated dynamically)

## Squad Role System
- Three squad roles: Apprentice, Journeyman, Mentor
- Users select their squad role during profile setup
- Squad roles are displayed in user profiles and participant lists
- Mentor ratings carry 3.0x weight in reputation calculations

## Voting System
- Reputation-squared weighted voting for:
  - Task proposals
  - Task challenges
  - Final project prize distribution
- Challenge mechanism with staking logic and constructiveness rating

## Economic Logic
- When tasks are completed and pass audit, user's pending HH move to EarnedHH
- Real-time payout calculation: (UserEarnedHH / ProjectEstimatedTotalHH) × ProjectFinalMonetaryValue
- Share of Pool calculation: (User Earned HH / Total Earned HH) × FinalMonetaryValue
- Efficiency savings tracked and displayed at project level
- Payout amounts displayed in CLP based on project's fixed total budget

## Frontend Features
- IASA logo integration using URL: `https://grupoiasa.cl/wp-content/uploads/2024/05/GRUPO-IASA.png`
- Logo scales cleanly in both light and dark modes with visual balance in header
- Application title displays "IASA Challenge (Alpha Sandbox) v0.3" in header, footer, and browser tab
- Favicon and alt-text reflect updated logo and version naming consistently
- Dashboard showing three scorecards:
  - "My Earned HH" (economic potential)
  - "My Reputation" (Voting Power)
  - "My Enabler Points" (C-Score)
- Project creation interface
- Task management with contribution user dropdown selection
- Project view displaying total HH saved vs budget
- Share of Pool payout display showing each user's projected earnings in CLP
- Squad role selection in Profile Setup modal
- Squad role display in user profiles and participant lists
- Audit screen with constructiveness rating modal for challenges
- Visual badges and icons for efficiency and reputation
- UI note stating that governance via the Shadow Board is managed manually by the admin
- Modern interface using TailwindCSS and React Query hooks
- Application content in English language

## Backend Data Storage
The backend must store:
- User profiles with all scorecard data including squad roles
- Project information, status, and efficiency metrics
- Task details including actual hours and contribution references
- Pledge records and HH allocations
- Voting records and challenge resolutions
- Constructiveness ratings and reputation calculations with squad role weighting
- Efficiency badge tracking and enabler point calculations
- Economic calculations, payout tracking, and share of pool calculations
- Access control and role management

## Deferred Features
- Shadow Board functionality (not implemented in this version - managed manually by admin)
- Complex C-Token valuation system (beta stage)
