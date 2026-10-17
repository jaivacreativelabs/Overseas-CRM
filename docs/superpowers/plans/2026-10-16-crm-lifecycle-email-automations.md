# Comprehensive CRM Lifecycle Event Email Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust, centralized, enterprise-grade email notification and automation engine across all 14 lifecycle stages of the Overseas Education CRM, ensuring branded HTML emails, deep linking, single-dispatch architecture via `AutomationService`, non-blocking execution, and comprehensive audit logging.

**Architecture:** 
1. **Single Dispatch Path:** All CRM domain services fire triggers exclusively via `void AutomationService.triggerWorkflows('<event>', payload).catch(() => undefined)`. Domain services NEVER import or call `EmailService` directly.
2. **Centralized Email Engine:** `automation.service.ts` processes `SEND_EMAIL` actions by invoking `EmailService.sendLifecycleEmail(...)`, which renders templates and dispatches via Nodemailer.
3. **Environment-Adaptive Transport:** Real SMTP when `SMTP_HOST` is configured in `backend/src/config/env.ts`; streamTransport / log-only mode in dev/test or when `SMTP_HOST` is empty. Never throws errors to callers.
4. **Integration Logging & Feature Toggle:** `IntegrationConfigModel` (`providerId: 'email_smtp'`) acts as a feature toggle. Every dispatch logs actual result (`SUCCESS` or `FAILED`) to `IntegrationLogModel` with real `durationMs` and diagnostic data (sanitized, no credentials).

**Tech Stack:** Node.js, Express, TypeScript, Mongoose, Nodemailer, ts-node-dev.

---

## Global Constraints & Architectural Rules
- **No Direct Dispatch:** No service calls `EmailService` directly. All dispatches pass through `AutomationService.triggerWorkflows`.
- **RBAC & Recipient Resolution:** Correctly route student emails (to `payload.studentEmail` / `payload.email`), counsellor emails (to `payload.counsellorEmail` / `payload.counsellorId`), and staff notifications.
- **Security & Hygiene:**
  - Never include `portalUsername` or `portalPassword` in any email template.
  - HTML-escape all template variables before rendering.
  - SMTP passwords must NEVER be saved in database collections or logged in `IntegrationLogModel.requestData`.
  - Deep links: Student links to `${FRONTEND_URL}/portal`, staff links to `${FRONTEND_URL}/leads/<leadId>`. Fall back gracefully if `FRONTEND_URL` is unset.
- **Rendering Specification (Every Template):**
  - Responsive 600px max-width table layout.
  - Inline CSS only (no flexbox or CSS grid).
  - Primary brand color `#0057F8` (6-digit hex).
  - Web-safe font stack (`system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`).
  - Preheader snippet and plain-text twin for every template.
  - `<meta name="color-scheme" content="light dark">` and `@media (prefers-color-scheme: dark)` compatibility block.
  - Bulletproof table-based CTA button.
  - Status tracker labels must use clear text, never color-only indicators.
- **DO NOT ADD ANY CODE COMMENTS** unless explicitly requested.

---

## Detailed Event & Hook Specifications

### Complete `WorkflowTrigger` Union
```typescript
export type WorkflowTrigger =
  | 'lead.created'
  | 'student.created'
  | 'counselling.scheduled'
  | 'counselling.approaching'
  | 'profile.verified'
  | 'shortlist.updated'
  | 'shortlist.selected'
  | 'document.requested'
  | 'document.uploaded'
  | 'document.reviewed'
  | 'application.submitted'
  | 'application.rejected'
  | 'offer.received'
  | 'offer.signed_uploaded'
  | 'offer.accepted'
  | 'offer.rejected'
  | 'payment.requested'
  | 'payment.proof_uploaded'
  | 'payment.success'
  | 'visa.updated'
  | 'travel.updated'
  | 'departure.recorded'
  | 'arrival.confirmed'
  | 'orientation.invited'
  | 'branch.created';
```

### Exact Hook Sites in Domain Services
1. `backend/src/modules/leads/lead.service.ts`:
   - `scheduleCounselling` (~:355): Fire `counselling.scheduled` with `studentEmail`, `scheduledDate`, `scheduledTime`, `googleMeetLink`, `counsellorName`, `leadId`.
   - Update 3 existing `lead.created` trigger call sites (:92, :676, :759) to consistently include `counsellorId`.
2. `backend/src/modules/profile-evaluation/profile.service.ts`:
   - `updateProfile` (~:95): Fire `profile.verified` ONLY when `profile.isComplete` transitions `false -> true`.
3. `backend/src/modules/universities/university.service.ts`:
   - `addToShortlist` (~:153): Fire `shortlist.updated` to student.
   - `studentSelectUniversity` (~:260): Fire `shortlist.selected` to student and counsellor.
4. `backend/src/modules/documents/document.service.ts`:
   - `requestDocument` (~:77): Fire `document.requested` to student. ONLY for new doc (dedup early-return at :40-52 must NOT fire).
   - `uploadDocument` (~:135): Fire `document.uploaded` to counsellor from `doc.requestedById` (fallback `lead.counsellorId`).
   - `reviewDocument` (~:212): Fire `document.reviewed` to student with approval status and `rejectionReason`.
5. `backend/src/modules/applications/application.service.ts`:
   - `createApplication` (~:118): Fire `application.submitted` to student.
   - `updateApplicationStatus` (~:200): Fire `application.rejected` when status becomes `REJECTED`. (Retain existing `offer.received` trigger at :201).
6. `backend/src/modules/offers/offer.service.ts`:
   - `uploadOriginalOffer` (~:82): Fire `offer.received` to student.
   - `uploadSignedOffer` (~:130): Fire `offer.signed_uploaded` to counsellor.
   - `reviewSignedOffer` (~:206): Fire `offer.accepted` or `offer.rejected` to student with counsellor notes/reasons.
7. `backend/src/modules/payments/payment.service.ts`:
   - `createPaymentRequest` (~:97): Fire `payment.requested` to student.
   - `submitPaymentProof` (~:149): Fire `payment.proof_uploaded` to counsellor.
   - `verifyPayment` (:208): Retain existing `payment.success` trigger.
8. `backend/src/modules/visa/visa.service.ts`:
   - `updateVisaRecord` (~:73): Fire `visa.updated` to student with visa status and notes/rejection reason.
9. `backend/src/modules/travel/travel.service.ts`:
   - `updateTravelDetails` (~:68): Fire `travel.updated` to student.
   - `recordDeparture` (~:101): Fire `departure.recorded` to student.
   - `recordArrival` (~:132): Fire `arrival.confirmed` to student.
10. `backend/src/modules/orientation/orientation.service.ts`:
   - `createOrientation` (~:62): Fetch invited student user emails via `UserModel.find({ _id: { $in: invitedStudentIds } })` and fire `orientation.invited` for each student.

---

## Task Breakdown

### Task 1: Environment Variables & Dependencies
**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/config/env.ts`

- [x] **Step 1: Install nodemailer dependencies in backend**
  - Run: `cd backend && npm install nodemailer && npm install -D @types/nodemailer`
- [x] **Step 2: Add SMTP configuration to `backend/src/config/env.ts`**
  - Read `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
- [x] **Step 3: Commit dependency and env updates**

### Task 2: Trigger Union Expansion & Database Workflow Upsert
**Files:**
- Modify: `backend/src/modules/integrations/automation-workflow.model.ts`
- Modify: `backend/src/modules/integrations/automation.service.ts`

- [x] **Step 1: Expand `WorkflowTrigger` type union in `automation-workflow.model.ts` with all lifecycle events**
- [x] **Step 2: Refactor `initializeDefaultWorkflows()` in `automation.service.ts` to use `findOneAndUpdate` upsert-by-name**
- [x] **Step 3: Commit**

### Task 3: Centralized Email Service & HTML Template Engine
**Files:**
- Create: `backend/src/modules/integrations/email.service.ts`

- [x] **Step 1: Implement template rendering engine following exact 600px table and styling requirements**
- [x] **Step 2: Implement adaptive transport (SMTP if `env.SMTP_HOST` exists, streamTransport / log-only mode otherwise)**
- [x] **Step 3: Implement `sendLifecycleEmail(event, payload, config)` returning `{ success, errorMessage, durationMs }` without throwing**
- [x] **Step 4: Wire `automation.service.ts` `SEND_EMAIL` case to call `EmailService.sendLifecycleEmail` and log real results in `IntegrationLogModel`**
- [x] **Step 5: Commit**

### Task 4: Lead, Counselling, Profile & University Shortlisting Hooks
**Files:**
- Modify: `backend/src/modules/leads/lead.service.ts`
- Modify: `backend/src/modules/profile-evaluation/profile.service.ts`
- Modify: `backend/src/modules/universities/university.service.ts`

- [x] **Step 1: Add `counselling.scheduled` in `lead.service.ts` and ensure `counsellorId` is in all `lead.created` payloads**
- [x] **Step 2: Add `profile.verified` in `profile.service.ts` only on false-to-true completion transition**
- [x] **Step 3: Add `shortlist.updated` and `shortlist.selected` in `university.service.ts`**
- [x] **Step 4: Commit**

### Task 5: Document Management Event Hooks
**Files:**
- Modify: `backend/src/modules/documents/document.service.ts`

- [x] **Step 1: Add `document.requested` trigger in `requestDocument` (only for newly created documents)**
- [x] **Step 2: Add `document.uploaded` trigger in `uploadDocument` targeting counsellor**
- [x] **Step 3: Add `document.reviewed` trigger in `reviewDocument` targeting student with status & rejectionReason**
- [x] **Step 4: Commit**

### Task 6: Application, Offer, Payment, Visa, Travel & Orientation Hooks
**Files:**
- Modify: `backend/src/modules/applications/application.service.ts`
- Modify: `backend/src/modules/offers/offer.service.ts`
- Modify: `backend/src/modules/payments/payment.service.ts`
- Modify: `backend/src/modules/visa/visa.service.ts`
- Modify: `backend/src/modules/travel/travel.service.ts`
- Modify: `backend/src/modules/orientation/orientation.service.ts`

- [x] **Step 1: Add `application.submitted` and `application.rejected` in `application.service.ts`**
- [x] **Step 2: Add `offer.received`, `offer.signed_uploaded`, `offer.accepted`, `offer.rejected` in `offer.service.ts`**
- [x] **Step 3: Add `payment.requested` and `payment.proof_uploaded` in `payment.service.ts`**
- [x] **Step 4: Add `visa.updated` in `visa.service.ts`**
- [x] **Step 5: Add `travel.updated`, `departure.recorded`, `arrival.confirmed` in `travel.service.ts`**
- [x] **Step 6: Add `orientation.invited` in `orientation.service.ts` (resolving student emails individually)**
- [x] **Step 7: Commit**

### Task 7: Verification & Test Execution
**Files:**
- Create: `backend/src/tests/email-automation.test.ts`

- [x] **Step 1: Create standalone test script `backend/src/tests/email-automation.test.ts` using local MongoDB and streamTransport**
- [x] **Step 2: Verify `document.requested`, `document.uploaded`, and `IntegrationLogModel` rows**
- [x] **Step 3: Run test: `cd backend && npx ts-node-dev --transpile-only src/tests/email-automation.test.ts`**
- [x] **Step 4: Verify typecheck: `cd backend && npx tsc --noEmit`**
- [x] **Step 5: Commit**
