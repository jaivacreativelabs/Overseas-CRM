# Product Requirements Document (PRD) — Overseas Education CRM

**Version:** 1.1  
**Target Platform:** Web-Based Enterprise SaaS CRM  
**Organization:** IIEC / JAIVA Creative Labs  
**Date:** September 2026  

---

## 1. Executive Summary & Business Objectives

### 1.1 Vision
To provide a dependable, role-controlled, and intuitive CRM that makes the entire overseas education consultancy lifecycle visible, measurable, and actionable for **Students, Counselors, and Administrators**.

### 1.2 Core Business Outcomes
- **Single Source of Truth:** Maintain a unified `Lead → Student` master record from initial capture through post-arrival support without record duplication.
- **Stage-Gated Discipline:** Ensure every process stage has strict completion criteria before progressing to the next step.
- **Student Transparency:** Provide a dedicated self-service portal for students to track their journey, upload documents, sign offers, submit payments, and communicate with counselors.
- **Operational Scalability:** Reduce manual registers and spreadsheets, prevent lead leakage, and automate follow-up tasks and notifications.
- **Accountability & Compliance:** Immutable audit logs, contact attempt histories, and role-boundary security (including indestructible Owner Admin protection).

---

## 2. User Roles & Access Boundaries

| Role | Core Responsibilities | Boundary & Restrictions |
| :--- | :--- | :--- |
| **Owner Admin** | Complete operational and strategic ownership. Manages branches, admins, counselors, settings, master data, financial logs, and audit trails. | Root account. **Cannot be deleted, deactivated, demoted, or edited** by any other admin. |
| **Admin** | Manages daily branch operations, counselor assignments, master data, document/visa reviews, user accounts, and system reports. | Full CRM access. Cannot delete or alter Owner Admin. |
| **Counselor** | Handles assigned and unassigned leads/students, logs contact attempts, conducts counselling sessions, evaluates profiles, uploads shortlists, verifies documents, requests payments, and tracks visas. | Can view and work across **all leads/students**. Cannot manage system users, modify role permissions, reassign leads after creation, view audit logs, or archive/delete records. |
| **Student** | Self-service portal user. Views progress stages, selects preferred university, uploads requested files, uploads signed offer letters, submits fee deposit proofs, views orientation details, and messages counselor. | Strictly restricted to **own student record** only. Cannot view internal staff notes or CRM administrative modules. |

---

## 3. End-to-End 14-Stage Student Lifecycle

```
[1. Lead Capture] 
       │
       ▼
[2. Contact Attempts & Callback]
       │
       ▼
[3. Preliminary Counselling (Google Meet)] ──(Not Interested)──► [Closed Lost (Reopenable)]
       │ (Interested)
       ▼ [Auto-Creates Student Portal Account]
[4. Profile Evaluation (Academic, Scores, Budget)]
       │
       ▼
[5. University Shortlisting (Counselor Curates ➔ Student Selects 1)]
       │
       ▼
[6. Document Collection & Verification (Student Uploads ➔ Counselor Approves)]
       │
       ▼
[7. University Application Tracking (Submitted ➔ Under Review ➔ Offer/Rejected)]
       │
       ▼
[8. Offer Letter Acceptance (Student Signs & Uploads ➔ Counselor Accepts)]
       │
       ▼
[9. Fee Payment & Proof Verification (Student Submits Receipt ➔ Counselor Verifies)]
       │
       ▼
[10. Visa Tracking (External Filing ➔ Pending / Approved / Rejected)]
       │
       ▼
[11. Pre-Departure Travel Support (Accommodation + Flight + Insurance)]
       │
       ▼
[12. Pre-Departure Orientation (Counselor Schedules Session ➔ Students Invited)]
       │
       ▼
[13. Student Departure (Departure Date Recorded ➔ Departed)]
       │
       ▼
[14. Arrival Confirmation & Post-Arrival Support (Arrival Date Confirmed)]
```

---

## 4. Functional Specifications by Module

### 4.1 Lead Capture & Assignment
- **Sources Supported:** Website, Instagram, Facebook, Referrals, Walk-ins, Events, Direct Calls, Manual Entry.
- **Counselor Assignment:** 
  - Admin assigns counselors to unassigned leads.
  - Counselors creating a new lead can choose the assigned counselor at creation time.
  - After creation, only an Admin can change the assigned counselor.
  - System automatically creates an initial follow-up task and dispatches email/WhatsApp notification upon assignment.

### 4.2 Contact Attempts & Counselling
- **Contact Attempt Logging:** Immutable records recording date, contact mode (Phone, WhatsApp, Email, In-Person), outcome, and notes.
- **Callback Automation:** If "Call Back Requested" is selected, requiring callback datetime automatically creates a high-priority follow-up Task.
- **Preliminary Counselling Session:** Counselor schedules session with Google Meet URL. System logs attendance and outcome.
- **Conversion to Student:** 
  - If marked "Interested", student moves to Profile Evaluation and a Student Portal user account is generated automatically with an email invitation.
  - If marked "Not Interested", lead becomes "Closed Lost" with a required reason. A Counselor can reopen Closed Lost leads at any time, restoring the previous stage.

### 4.3 Profile Evaluation & University Shortlisting
- **Mandatory Fields:** Highest Qualification, GPA/Percentage, English Proficiency (IELTS, TOEFL, PTE) / Standardized tests (GRE, GMAT), Target Intake, Budget.
- **University Shortlisting:** Counselors add recommended universities/courses. 
- **Student Choice:** Student logs into portal, reviews options, and confirms **exactly one** preferred university choice.

### 4.4 Document Collection & Verification
- **Counselor Requests:** Counselor creates document checklist items (e.g., Passport, Academic Transcripts, Statement of Purpose, Financial Proofs) with due dates.
- **Student Upload:** Student uploads files through the portal (PDF, PNG, JPG).
- **Verification Workflow:** Counselor/Admin reviews files with statuses `REQUESTED`, `UPLOADED`, `APPROVED`, `REJECTED`. Rejections require feedback notes.

### 4.5 Application, Offer & Fee Payment
- **Application Tracking:** Single active application per student. Statuses: `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `OFFER_RECEIVED`, `REJECTED`. If rejected, historic rejection is saved and student may select another university.
- **Offer Letter Acceptance:** Admin/Counselor uploads official offer letter. Student downloads, signs externally, and uploads signed PDF. Counselor approves acceptance.
- **Fee Payment:** Unlocks immediately upon signed offer acceptance. Counselor creates payment request (Tuition Deposit, Application Fee). Student submits transaction reference and bank transfer receipt screenshot. Counselor verifies receipt.

### 4.6 Visa & Travel Support
- **Visa Filing:** CRM records external visa application (`PENDING`, `APPROVED`, `REJECTED`), visa interview date, and decision date. Email/WhatsApp alert is sent upon decision.
- **Travel Checklist:** Dedicated tracking for:
  1. Accommodation (Pending / Confirmed + Address)
  2. Flight Booking (Pending / Confirmed + Flight No & Date)
  3. Travel Insurance (Pending / Confirmed + Policy No)
  All 3 items must be confirmed before proceeding to Departure.

### 4.7 Pre-Departure Orientation, Departure & Arrival
- **Orientation:** Counselor schedules group/individual orientation with agenda, date/time, and Google Meet link.
- **Departure:** Admin records departure date and marks student as departed.
- **Arrival Confirmation:** Admin records arrival date and marks student as arrived at destination university.

### 4.8 Communication & Notes
- **Student-Counselor Chat:** Real-time messaging visible to the student and assigned counselor. Messages cannot be deleted or edited after dispatch.
- **Internal Staff Notes:** Private notes created by Counselors/Admins visible only to staff, never to students.

### 4.9 Task Management & Notifications
- System-generated and manual tasks with priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), due dates, and assignee filters.
- In-app notification center + outbound email and WhatsApp notification triggers for stage transitions.

### 4.10 Master Data Management
- Self-service admin configuration for:
  - Countries & Currencies
  - Universities & Program Courses
  - Intakes (Spring, Fall, Winter, Summer)
  - Lead Sources & Loss Reasons
  - Document Checklist Templates

---

## 5. Non-Functional & Usability Requirements

1. **User Friendliness:** Clean SaaS layout, self-explanatory forms, clear step-by-step guidance, jargon-free helper text, and clear next-action prompts.
2. **Performance:** Sub-second API responses for all list and detail views; indexed queries for leads, tasks, and documents.
3. **Security:** JWT authentication, bcrypt password hashing, input sanitization via Zod schemas, CORS and Helmet HTTP headers, immutable audit logging.
4. **Data Integrity:** Strict Mongoose schemas with relational ObjectIds; soft-delete for audit safety with restricted permanent delete.
