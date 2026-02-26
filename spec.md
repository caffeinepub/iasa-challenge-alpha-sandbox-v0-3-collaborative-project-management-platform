# Specification

## Summary
**Goal:** Define and enforce participant identity and access control so that only authorized ICP principals can perform state-mutating operations, and unauthorized users see a clear message after login.

**Planned changes:**
- Add a stable allowlist data structure (`allowedPrincipals`) to the backend actor that survives upgrades.
- Add admin-only `addParticipant(p: Principal)` and `removeParticipant(p: Principal)` functions for runtime management.
- Ensure the deployer/admin principal is set on first deploy so the allowlist is never empty.
- Guard all state-mutating functions (`registerUser`, `createProject`, `pledgeHours`, `createTask`, `completeTask`, `submitPeerRating`) with an allowlist check that returns a `#Unauthorized` error variant instead of trapping.
- Expose a public query `isParticipant(p: Principal): Bool` for frontend eligibility checks.
- Keep all read-only query functions publicly accessible without allowlist restriction.
- Update `MainApp.tsx` to call `isParticipant` after Internet Identity login and show a professional "not authorized" message (mentioning contacting the IASA administrator) if the principal is not in the allowlist.
- Handle loading state gracefully while the `isParticipant` query is in flight.
- Continue the existing post-login flow (ProfileSetupModal or Dashboard) unchanged for authorized principals.

**User-visible outcome:** After logging in, unauthorized users see a clear message that their identity is not yet authorized and should contact the IASA administrator, while authorized users proceed normally to the app.
