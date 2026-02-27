# Specification

## Summary
**Goal:** Fix the "actor not available" error when creating a project and restore previously persisted project/task data on the Dashboard after login.

**Planned changes:**
- Guard all actor-dependent `useQuery` hooks with `enabled: !!actor` so they do not fire before the actor is initialized.
- Guard all `useMutation` hooks to check actor availability before invoking backend calls, and show a clear UI message if the actor is unavailable.
- Disable the "Create Project" button (or show a spinner) while the actor is still initializing to prevent premature mutation calls.
- Ensure React Query hooks correctly fetch and display all previously stored projects and tasks from the canister after actor initialization.

**User-visible outcome:** Users can create projects without encountering an "actor not available" error, and all previously created projects and tasks are visible on the Dashboard immediately after logging in.
