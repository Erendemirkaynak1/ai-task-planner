# Daymark — Product & UI Roadmap

> Living plan for the next development iterations. Priorities may be adjusted as implementation and CI findings evolve.

## 1. Design system and visual consistency
- [ ] Consolidate colors, typography, spacing, radii, shadows, and focus states into reusable design tokens.
- [ ] Standardize buttons, inputs, badges, dropdowns, dialogs, cards, and empty states.
- [ ] Review light and dark themes for contrast, hierarchy, and consistent component behavior.
- [ ] Improve hover, pressed, disabled, loading, and focus-visible states without excessive motion.
- [ ] Audit icon sizes, alignment, labels, and accessible names across the application.

## 2. Dashboard and task experience
- [ ] Refine dashboard hierarchy so the most actionable information is immediately visible.
- [ ] Improve task rows/cards with clearer title, project, priority, due-date, and estimate grouping.
- [ ] Add clear visual states for overdue, due today, upcoming, completed, and high-priority tasks.
- [ ] Improve task creation/editing dialog layout, validation feedback, and keyboard interactions.
- [ ] Add polished loading, error, success, and empty states to key workflows.
- [ ] Review statistics for clarity and ensure labels accurately describe the displayed data.

## 3. Calendar and Kanban
- [ ] Improve calendar readability, event density, navigation, and mobile behavior.
- [ ] Add a clearer selected-day experience and a useful agenda/list view for small screens.
- [ ] Improve Kanban columns and card hierarchy; prepare accessible task movement interactions.
- [ ] Ensure calendar and board actions remain consistent with the task editor and task list.

## 4. Responsive and accessibility audit
- [ ] Test layouts at narrow mobile, tablet, laptop, and wide desktop breakpoints.
- [ ] Verify mobile bottom navigation, safe-area spacing, and touch target sizes.
- [ ] Check keyboard navigation, focus order, dialog focus handling, and Escape behavior.
- [ ] Check color contrast, semantic structure, screen-reader labels, and reduced-motion support.

## 5. Functional product improvements
- [ ] Replace relative due-date labels with durable date values while migrating existing local data safely.
- [ ] Add optional due time and clearer overdue/upcoming behavior.
- [ ] Introduce task status beyond the current completed/not-completed model where appropriate.
- [ ] Add recurring task support with predictable scheduling rules.
- [ ] Add reminders and notification preferences with clear permission handling.
- [ ] Connect the frontend to the existing authenticated task API and Supabase persistence.
- [ ] Add a safe sign-in/session experience and preserve local demo mode when cloud configuration is absent.
- [ ] Build AI plan proposal review and explicit approval before applying proposed changes.

## 6. Quality, security, and release readiness
- [ ] Investigate and fix the failing CI run associated with the intermediate Kanban callback commit.
- [ ] Monitor pending CI runs after the recent UI updates; fix typecheck, lint, test, or build regressions.
- [ ] Add focused unit tests for date handling, task filtering, and data migration.
- [ ] Verify backup import/export compatibility as the task model evolves.
- [ ] Review API validation, authorization, rate limits, and error messaging as frontend integration is added.
- [ ] Update README and environment setup instructions for each completed feature.

## Suggested implementation order
1. Stabilize CI and resolve any regressions.
2. Finish the design-system and component consistency pass.
3. Polish dashboard, task editor, task cards, and empty/error states.
4. Improve calendar and Kanban, including mobile-specific experiences.
5. Implement durable dates and richer task status.
6. Integrate Supabase authentication and frontend task synchronization.
7. Add reminders, recurring tasks, and AI proposal approval.
8. Complete accessibility, security, and release-readiness verification.

## Working principles
- Prefer clarity and usability over decorative complexity.
- Keep desktop and mobile experiences equally intentional.
- Preserve existing user data and backup compatibility during migrations.
- AI-generated plans must be reviewed and explicitly approved before changing tasks.
- Run the available automated checks after meaningful changes and report their actual results.
