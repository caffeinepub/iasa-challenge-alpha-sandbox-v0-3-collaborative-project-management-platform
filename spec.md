# Specification

## Summary
**Goal:** Fix the profile setup flow so that pre-existing users bypass the ProfileSetupModal and are taken directly to the main app, while ensuring only administrators can create profiles for already-registered users.

**Planned changes:**
- Before showing the ProfileSetupModal, check the backend for an existing profile for the authenticated user.
- If a profile already exists, skip the ProfileSetupModal and navigate directly to the dashboard.
- If no profile exists, continue showing the ProfileSetupModal as before (new user flow unchanged).
- Block non-admin users from triggering profile creation if they already have a profile, and show a user-facing message (e.g., "You already have a profile") instead of a silent failure.
- Preserve admin users' ability to create or update profiles via the AdminPanel without restriction.

**User-visible outcome:** Pre-existing users who log in are taken straight to the dashboard without seeing the ProfileSetupModal or encountering a silent error. New users still go through the profile setup flow normally. Non-admin users with an existing profile see a clear message if a re-registration is attempted.
