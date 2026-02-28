# Specification

## Summary
**Goal:** Fix the login and connection flow for non-admin (external) users so they can successfully authenticate via Internet Identity without errors or getting stuck.

**Planned changes:**
- Investigate and fix error handling or state transitions that occur after Internet Identity login for non-admin users.
- Ensure non-admin users are routed to the correct screen (pending approval, profile setup, or dashboard) based on their approval status after login.
- Leave all admin login flow, admin panel logic, and all other app functionality completely untouched.

**User-visible outcome:** External users (e.g. jedvogdt@gmail.com) can log in via Internet Identity at the app URL without encountering a connection error or blank/stuck screen, and are directed to the appropriate screen for their account status.
