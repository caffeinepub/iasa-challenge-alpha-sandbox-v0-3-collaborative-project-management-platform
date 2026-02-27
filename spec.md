# Specification

## Summary
**Goal:** Fix the ProjectDetailsDialog so it opens correctly from a ProjectCard, and clarify the task/pledge/approval lifecycle flow with clear status badges and contextual labels throughout the UI.

**Planned changes:**
- Fix the ProjectDetailsDialog (draft view) so it mounts and renders without errors when triggered from any ProjectCard, for all project statuses (drafting, pledging, active, completed).
- Add clearly labelled status badges to each TaskCard reflecting the current task state: open, inProgress, completed, approved.
- Show action buttons on TaskCard only when the task is in the correct state for that action (e.g., "Pledge" only when open, "Approve" only when completed).
- Add an inline label or tooltip on each TaskCard indicating the next required step (e.g., "Awaiting pledge confirmation by PM").
- Add status badges to each pledge entry in PledgeSection: Pending, Confirmed, or Expired.
- Show contextual notes on pledges explaining their meaning (e.g., "Awaiting PM confirmation — not yet counted in budget" for pending; "Confirmed — included in HH budget and payout calculation" for confirmed).
- Visually de-emphasise expired pledges and label them accordingly.
- Show PM-only confirm/reject buttons only for pending pledges and only to the PM.

**User-visible outcome:** Users can open project detail dialogs from any ProjectCard without errors, and can clearly understand the current state and next required action for every task and pledge without needing external documentation.
