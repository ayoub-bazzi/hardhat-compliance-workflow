# Product Thinking & Experience Rules — HardHat Compliance

## 1. UX & Interface Principles
* **The High-Distraction Rule:** General Contractors (GCs) operate on muddy, loud construction sites, often viewing screens on tablets or phones in direct sunlight. Interfaces must use high contrast, clear state badges, and large hit targets (minimum button target size of 26px/`p-1` minimum padding on interactive icons).
* **Zero-Input Default:** The user's primary action should be uploading a file. The system must never force a user to manually type data that an AI model can extract with $\ge 90\%$ confidence.
* **Fail Gracefully, Never Block:** If an AI scan fails or hits a rate limit, the application must downgrade to a human-in-the-loop review state (`Needs GC Review` / `pending_verification`) rather than throwing a hard system failure that stops site operations.

## 2. Technical Safeguards (What Must NEVER Happen)
* **Cross-Tenant Leaks:** No user should ever see projects, subcontractors, or compliance files belonging to another organization. Data isolation must be verified at the absolute perimeter of every query execution hook.
* **Deceptive Metrics:** The dashboard must never display a subcontractor as "Low Risk" or "Site Ready" if they have an active document that is currently `Expired` or `Rejected`. Visual health bars must strictly reflect real-time backend verification states.
* **Silently Dropped States:** When an active document is deleted, the system must never leave a subcontractor's document row blank if older historical records exist. The next best document must be promoted automatically.

## 3. Feature Acceptance Criteria
Before any new compliance document type or feature is pushed to production, it must:
1. Support asynchronous background execution.
2. Write a structured trace log straight to the `document_events` or system logs table.
3. Call explicit server revalidation endpoints (`revalidatePath`) to prevent stale frontend caching.