# AGENT.MD — OVERSEAS EDUCATION CRM ARCHITECTURE & COLLABORATION GUIDE

> **MANDATORY INSTRUCTION FOR ALL AI CODING AGENTS AND DEVELOPERS:**
> Read and strictly adhere to this document before making any changes in this repository.
> Every feature must maintain complete isolation, authoritative backend enforcement, and strict stage-gated business rules.

---

## 1. Project Overview & Architecture

This repository is a **single monorepo** containing a complete, production-ready Enterprise CRM built for an **Overseas Education Consultancy (IIEC / JAIVA CRM)**.
The frontend and backend are maintained in distinct directories (`frontend/` and `backend/`).

### Tech Stack
- **Frontend**: React 18, Vite, TypeScript, React Router v6, Lucide Icons, Pure CSS Design System (`#0057F8` primary, `#D8232A` brand red, `#FFFFFF` workspace, clean SaaS UI).
- **Backend**: Node.js, Express.js, TypeScript, REST API (`/api/v1/*`), Mongoose ODM, JWT authentication, Role-Based Access Control (RBAC), Zod / Centralized validation.
- **Database**: MongoDB / Mongoose ODM with indexed collections, compound keys, and relational integrity.

---

## 2. Collaboration-First Feature Architecture

To prevent merge conflicts between multiple developers and AI agents, all code is structured into **isolated vertical feature modules**:

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
  → MongoDB
```

If a database field or schema changes:
1. Update Mongoose model & backend types.
2. Update validator and controller.
3. Update API response format.
4. Update frontend TypeScript types and service.
5. Update React forms, state, and UI presentation.

---

## 4. Roles, Permissions & Owner Admin Protection

### User Roles:
- **`STUDENT`**: Restricted strictly to their own data (view journey, upload requested docs, choose 1 approved university, download/upload signed offer, submit fee payment proof, track visa/travel, chat with counsellor).
- **`COUNSELLOR`**: Full operational access to ALL leads and ALL students (no ownership restriction). Manages counselling, profile evaluation, shortlists, applications, offer letters, payment requests & verification, visa/travel updates, orientation, tasks, private internal notes, and master data.
  *Restrictions*: Cannot manage users/admins, change roles, archive/permanently delete records, view audit logs, or impersonate students.
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

The CRM enforces a sequential 14-stage journey:
1. **Lead Captured**: Sources: Website, Instagram, Facebook, Referral, Walk-in, Events, Other, Manual.
2. **Contact Attempts**: Counsellor logs calls/meetings. Contact attempt records are **immutable** once recorded. If "Call Back Requested", a follow-up Task is automatically created by the backend.
3. **Preliminary Counselling**: Google Meet link recorded. Attendance logged. If "Interested", student moves to Profile Evaluation and a student portal account is auto-created. If "Not Interested", lead becomes "Closed Lost" with a reason (can be reopened later).
4. **Profile Evaluation**: Counsellor records GPA, test scores (IELTS/TOEFL/PTE/GRE), and budget. Mandatory fields must be complete before advancing.
5. **University Shortlisting**: Counsellor adds universities and controls visibility. Student reviews and selects **exactly 1** university.
6. **Document Collection**: Counsellor requests specific documents. Student uploads files. Counsellor approves or rejects with feedback.
7. **Application Submission**: Single active application at a time. Status: `Submitted` → `Under Review` → `Offer Received` or `Rejected`. (If rejected, reason is recorded; student can choose another shortlisted university).
8. **Offer Letter Acceptance**: Counsellor uploads original offer letter. Student downloads, signs externally, and uploads signed copy. Counsellor approves acceptance.
9. **Fee Payment**: Unlocked only after signed offer acceptance. Counsellor creates payment request. Student submits receipt proof / screenshot. Counsellor verifies payment.
10. **Visa Processing**: Counsellor tracks external visa application (`Pending` → `Approved` / `Rejected`). Triggers student notifications.
11. **Travel Support**: Tracks Accommodation, Flight, and Insurance (each `Pending`/`Completed` + details). All 3 must be completed.
12. **Pre-Departure Orientation**: Counsellor schedules orientation session (date, time, meet link) and invites students.
13. **Departure**: Admin/Counsellor records departure date and marks student as departed.
14. **Arrival Confirmation**: Admin/Counsellor records arrival date and marks student as arrived. Post-arrival support begins.

---

## 6. Coding & UI Guidelines

1. **User-Friendly Design**: UI must be clean, approachable, and self-explanatory for general users and non-technical staff. Use tooltips, badges, progress bars, and friendly empty states.
2. **Error Handling**: Standardize API error responses (`{ success: false, message: string, errors?: string[] }`). Catch and toast all client-side errors gracefully.
3. **Type Safety**: Strictly avoid `any` in core business logic. Maintain synchronized interfaces between backend models and frontend types.
4. **Immutability**: Historical records (contact attempts, audit logs, student messages) must never be mutated or hard-deleted by unauthorized operations.
