# Specification

## Summary
**Goal:** Fix the non-admin onboarding flow so that new users must apply for access, wait for admin approval, and only then enter the app — without changing any existing admin, login, or other component logic.

**Planned changes:**
- Fix backend (`main.mo`) access-check logic to correctly resolve non-admin principal status in this order: hardcoded admin → pending → approved → no record.
- Add a three-step onboarding gate in `MainApp.tsx` for non-admin users: (a) no record → "Apply for Access" screen that calls `requestApproval`; (b) pending → "Pending Approval" holding screen; (c) approved → normal app flow (ProfileSetupModal if new, then Dashboard).
- Ensure pending access requests submitted by new users appear in the existing `AdminPanel.tsx` approval list and that approving them sets their status to approved.

**User-visible outcome:** A non-admin user who logs in for the first time can apply for access, sees a pending screen while awaiting approval, and is granted entry to the app once an administrator approves their request in the existing Admin Panel.
