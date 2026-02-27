# Specification

## Summary
**Goal:** Introduce four participation levels (Apprentice, Journeyman, Master, Guest Artist) with associated voting power, enforce role assignment constraints based on level, and provide admin controls to manage participant levels.

**Planned changes:**
- Add a `ParticipationLevel` type to the backend with values: Apprentice, Journeyman, Master, GuestArtist, each carrying a derived voting power (0, 1, 3, 4 respectively).
- Store `participationLevel` on each `UserProfile`; derive voting power from it.
- Allow participants to self-select their participation level once during profile setup; lock it afterward for non-admin users.
- Add a backend `setParticipationLevel` function restricted to the Administrator principal (jv@grupoiasa.cl).
- Enforce role assignment constraints: PM → Journeyman or Master only; Mentor/PO → Master or Guest Artist only; Team Player → Apprentice, Journeyman, or Master; Administrator → admin principal only.
- Update `ProfileSetupModal` to include a participation level selector with descriptions for each level; require selection before submission; make the field read-only post-registration for non-admin users.
- Display the user's participation level and derived voting power in the Header user dropdown and Dashboard scorecard.
- Add an Administrator-only UI panel listing all users with their participation levels, allowing the admin to change any user's level via a dropdown and save it to the backend.

**User-visible outcome:** During profile setup, users select their participation level (Apprentice, Journeyman, Master, or Guest Artist), which determines their voting power and eligible roles. Admins can override any participant's level via a dedicated admin panel. Participation level and voting power are visible in the header dropdown and dashboard scorecard.
