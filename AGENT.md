# AGENT.MD — OVERSEAS EDUCATION CRM ARCHITECTURE & COLLABORATION GUIDE

> **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS AND DEVELOPERS:**
> Read and strictly adhere to this document before making any changes in this repository.
> Every feature must maintain complete isolation and follow the authoritative backend pattern.

---

## 1. Project Overview & Architecture

This repository is a **single monorepo** containing a complete production-ready CRM for an Overseas Education Consultancy.
The frontend and backend are housed in separate top-level directories (`frontend/` and `backend/`).

### Tech Stack
- **Frontend**: React (v18+), Vite, TypeScript, React Router (v6+), Lucide Icons, Pure CSS Design System (`#0057F8` primary, `#FFFFFF` workspace, clean enterprise SaaS styling).
- **Backend**: Node.js, Express.js, TypeScript, REST API (`/api/v1/*`), Mongoose, JWT authentication, Role-Based Access Control (RBAC), Zod / Centralized validation, Centralized error handling.
- **Database**: MongoDB Atlas / Mongoose ODM with indexed collections and full relational integrity through ObjectIds.

---

## 2. Collaboration-First Feature Architecture

To prevent Git merge conflicts between multiple developers and AI agents, all code is structured into **isolated vertical feature modules**:

```
frontend/src/features/<feature-name>/
├── components/      # Feature-specific UI components
├── pages/           # Routed page views
├── hooks/           # Feature-specific React hooks
├── services/        # API service calls for this feature
├── validators/      # Client-side validation schemas
├── constants/       # Feature constants
├── types/           # Feature TypeScript interfaces
└── index.ts         # Public feature exports

backend/src/modules/<feature-name>/
├── <feature>.controller.ts  # HTTP request handlers
├── <feature>.service.ts     # Business logic & stage-gating enforcement
├── <feature>.model.ts       # Mongoose model schema & indexes
├── <feature>.routes.ts      # Express route definitions with middleware
├── <feature>.validator.ts   # Input validation schemas
├── <feature>.constants.ts   # Enums, statuses, error codes
└── index.ts                 # Module route export
```

### Critical Rules for Isolation:
1. **Never modify an unrelated feature's folder** when implementing or fixing a feature.
2. **Shared folders** (`frontend/src/components/`, `backend/src/middleware/`, `backend/src/utils/`) are strictly for genuine cross-cutting utilities.
3. Keep changes to shared files (`app.ts`, `server.ts`, global CSS) minimal and surgical.

---

## 3. Authoritative Backend Principle & Data Flow

**The frontend is never the source of truth for business rules or permissions.**
Frontend UI controls (disabled buttons, locked stage badges) are purely for user experience.

### Complete Data Flow Chain:
```
React UI → Frontend Service → REST API (/api/v1/...) 
  → Authentication Middleware (JWT) 
  → Authorization Middleware (RBAC) 
  → Input Validation Middleware 
  → Controller 
  → Business Service (Stage-Gating & Rules) 
  → Mongoose Model 
  → MongoDB Atlas
```

If a database field or schema changes:
1. Update Mongoose model & backend types.
2. Update validator and controller.
3. Update API response format.
4. Update frontend TypeScript types and service.
5. Update React forms, state, and UI presentation.

---

## 4. Roles, Permissions & Owner Admin Protection

### Roles:
- **`STUDENT`**: Restricted strictly to their own data (view journey, upload requested docs, choose 1 approved university, download/upload signed offer, submit fee payment proof, track visa/travel, chat with counsellor).
- **`COUNSELLOR`**: Full access to ALL leads and ALL students (no ownership restriction). Manages counselling, profile evaluation, shortlists, applications, offer letters, payment requests & verification, visa/travel updates, orientation, tasks, private internal notes, and master data.
  *Cannot*: Manage users/admins, change roles, archive/permanently delete records, view audit logs, or impersonate students.
- **`ADMIN`**: Full CRM administrative authority, master data management, reporting, user/counsellor management, audit log access, archiving, and permanent deletion.
- **`OWNER_ADMIN`**: Unique root account. Enjoys full Admin functionality.
  *Strict Backend Protection*:
  - **CANNOT be deleted** (Hard or Soft).
  - **CANNOT be deactivated**.
  - **CANNOT be demoted or have role modified**.
  - **CANNOT be modified by another Admin**.
  - The backend returns `403 FORBIDDEN` on any attempt to alter the Owner Admin.

---

## 5. Business Lifecycle & Stage-Gating Rules

The CRM enforces the sequential 14-stage journey:
1. **Lead Captured**: Sources: Website, Instagram, Facebook, Referral, Walk-in, Events, Other, Manual.
2. **Contact Attempts**: Counsellor logs calls/meetings (date, method, outcome, notes, callback). Contact attempt records are **immutable** once recorded. If "Call Back Requested", a follow-up Task is automatically created by the backend.
3. **Preliminary Counselling**: Scheduled session with external Google Meet link. Attendance is recorded. Counselling record is prerequisite for stage progression.
4. **Interested / Closed Lost**:
   - If *Not Interested*: Status becomes `Closed Lost` with mandatory configured reason. Can be reopened at any time to restore previous stage.
   - If *Interested*: Automatically converts Lead into active Student record AND provisions Student Portal account with invitation link.
5. **Profile Evaluation**: Configurable mandatory fields (Academics, Test Scores, Work Exp, Budget, Country Preference). Progression is **locked** until all mandatory fields are verified complete.
6. **University Shortlisting**: Counsellor adds universities/courses with visibility flag. Student selects **1 approved university**.
7. **Document Management**: Counsellor creates requests (e.g. Passport, Transcripts, SOP, LOR, IELTS). Student uploads. Counsellor marks `Approved` or `Rejected` with mandatory reason. Uploading does NOT equal Approval.
8. **Application Management**: **Only ONE active application at a time**. Status: `Submitted` → `Under Review` → `Offer Received` | `Rejected` (with reason). Rejected apps remain in historical archive; new application can then be launched.
9. **Offer Management**: Counsellor uploads original Offer Letter. Student downloads, signs externally, and uploads Signed Offer. Counsellor accepts signed offer. **Accepted signed offer unlocks Fee Payment**.
10. **Fee Payment**: Counsellor generates payment request with breakdown. Student submits transaction reference and payment proof screenshot. Counsellor explicitly verifies payment (`Verified` != `Uploaded`).
11. **Visa Processing**: External status tracking (`Pending`, `Approved`, `Rejected` with decision details).
12. **Pre-Departure & Travel**: Tracks Accommodation, Flight, and Insurance. All 3 must be marked Completed before departure stage unlocks.
13. **Orientation**: Pre-departure session created with attendee list and notifications.
14. **Departure & Arrival**: Recorded departure date and final arrival confirmation.

---

## 6. UI & Design System Standards

The CRM must look like a polished, high-end enterprise SaaS application:
- **Primary Action Color**: `#0057F8` (hover `#0047D4`, active `#003BB2`).
- **Primary Background**: `#FFFFFF` (workspace `#FAFAFB`, surface `#F9FAFB`).
- **Borders & Dividers**: Thin light neutral gray (`#E5E7EB` / `#E2E8F0`).
- **Typography**: Inter sans-serif with strict hierarchy (Page Title: 20px/600, Section: 16px/600, Table Header: 12px/600 uppercase, Body: 14px/400, Secondary: 13px/400).
- **Layout**: Fixed left sidebar (width: 256px, collapsible to 68px), compact top navigation bar (height: 56px), spacious main content area with generous whitespace.
- **Tables**: Large clean data tables with subtle borders, comfortable row heights (48px), sticky headers, search/filter toolbar above, checkbox row select, and 3-dot action menu (`⋮`).
- **States**: Every page and widget must support **Loading** (clean skeletons), **Empty** (clear icon & CTA), **Error** (clear message with retry), and **Success** (toasts).
- **No Over-decoration**: Avoid excessive cards, colorful gradients, heavy floating shadows, or consumer-style rounded pills.

---

## 7. API & Response Conventions

All REST APIs must follow `/api/v1/<module>`:

### Success Response Format:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Error Response Format:
```json
{
  "success": false,
  "message": "Human readable error description",
  "code": "SPECIFIC_ERROR_CODE",
  "errors": []
}
```

- **HTTP Status Codes**: `200` (OK), `201` (Created), `400` (Validation / Stage-Gate Error), `401` (Unauthenticated), `403` (Forbidden / Unauthorized Role), `404` (Not Found), `409` (Conflict), `500` (Internal Server Error).
- **Security**: Never expose MongoDB internal error codes or stack traces in API responses.

---

## 8. Audit Logging & Activity Feed

- **Audit Logs**: Stored in `audit_logs` collection. Captures `userId`, `userRole`, `action`, `entityType`, `entityId`, `before`, `after`, `metadata`, and `timestamp`. **Immutable, Admin-only**.
- **Activity Feed**: Timeline of user and student events (e.g. status changes, document uploads, reviews).

---

## 9. Definition of Done (DoD) for Any Feature

A feature is complete only when:
- [ ] Backend Mongoose model created with appropriate indexes and relations.
- [ ] Backend validation schema (Zod) and business service with stage-gating.
- [ ] Backend controller, routes, and RBAC permission guards.
- [ ] Audit log / activity event recording hooked up.
- [ ] Frontend API service and TypeScript types matching backend response.
- [ ] Frontend UI component & page adhering to the `#0057F8` design system.
- [ ] Complete handling of Loading, Empty, Error, and Validation states.
- [ ] Tested end-to-end data flow (UI → API → DB → UI).
- [ ] No regressions or modifications to unrelated features.
