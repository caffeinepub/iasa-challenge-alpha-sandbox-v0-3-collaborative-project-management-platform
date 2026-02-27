# Specification

## Summary
**Goal:** Enforce a maximum HH budget cap on project pledges, both in the backend and frontend.

**Planned changes:**
- Backend: When a pledge is submitted, validate that the sum of all existing approved and pending pledges plus the new pledge amount does not exceed the project's maximum HH budget; reject with a descriptive error if it would.
- Frontend (PledgeSection): Display the remaining available HH budget (max HH budget minus total already pledged), show an inline error when the entered amount exceeds the remaining budget, disable the pledge form when no budget remains, and show a "Budget fully pledged" message in that case.

**User-visible outcome:** Users can only pledge HH up to the project's remaining budget. Attempting to exceed it is blocked in the UI with a clear error, and the backend also rejects any such pledge as a safeguard.
