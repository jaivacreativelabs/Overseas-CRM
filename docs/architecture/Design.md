# System Architecture & Technical Design Document

**Organization:** IIEC / JAIVA Creative Labs  
**Platform:** Overseas Education Consultancy CRM  
**Version:** 1.1  

---

## 1. High-Level Architecture Overview

The CRM is architected as a decoupled, multi-tier Single Page Application (SPA) backed by a modular Node.js REST API and MongoDB database.

```
┌─────────────────────────────────────────────────────────────┐
│                   React + Vite SPA                          │
│   (Clean Enterprise SaaS Design, Pure CSS, Inter Font)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON over HTTPS (REST API)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Node.js + Express + TypeScript              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Global Middleware (CORS, Helmet, RateLimit, ErrorHandler)│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Security & Access (JWT Auth, RBAC, Owner-Admin Guard)   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Feature Modules (Leads, Docs, Apps, Offers, Payments...)│ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Centralized Services (Stage-Gating, Audit, Activities)  │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     MongoDB Database                        │
│   (Indexed Collections, Relational ObjectIds, Audit Logs)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure & Modular Design

```
Jaiva CRM/
├── frontend/
│   ├── public/                    # Static assets & logos (logo.png, favicon.png)
│   ├── src/
│   │   ├── components/            # Global reusable UI (Logo, Table, Modal, Button, Form, Badge, Stepper)
│   │   ├── context/               # AuthContext, ToastContext
│   │   ├── features/              # Isolated vertical feature modules
│   │   │   ├── leads/             # Lead management, listing, detail view, stage workflows
│   │   │   ├── student-portal/    # Student self-service hub, journey view, document uploads
│   │   │   ├── counselling/       # Call logs, Google Meet scheduling, attendance
│   │   │   ├── documents/         # Request, upload, approval/rejection review
│   │   │   ├── universities/      # Shortlist curation & student selection
│   │   │   ├── applications/      # Single-active application tracking & history
│   │   │   ├── offers/            # Offer letter upload, student signed copy upload & review
│   │   │   ├── payments/          # Payment requests, receipt screenshot verification
│   │   │   ├── visa/              # Visa filing & decision updates
│   │   │   ├── travel/            # Accommodation, Flight, Insurance checklist
│   │   │   ├── orientation/       # Pre-departure sessions & attendee invites
│   │   │   ├── tasks/             # Operational & automated follow-up tasks
│   │   │   ├── messages/          # Counselor-Student in-app chat
│   │   │   ├── masters/           # Master data management (Countries, Universities, Intakes)
│   │   │   ├── users/             # Admin, Counselor, and Staff account management
│   │   │   ├── audit-logs/        # Immutable system audit trail
│   │   │   └── reports/           # KPI dashboards & operational reports
│   │   ├── layouts/               # AppLayout (Sidebar, Topbar) & AuthLayout
│   │   ├── services/              # Axios API client with auth interceptors
│   │   └── styles/                # Pure CSS design system tokens & styles
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/                # Environment variables, MongoDB connection
│   │   ├── database/              # Seeders (seed.ts) & migration helpers
│   │   ├── middleware/            # JWT authentication, RBAC authorization, Owner-Admin protection
│   │   ├── modules/               # Vertical backend feature modules
│   │   │   ├── auth/              # Login, token refresh, password reset
│   │   │   ├── leads/             # Lead lifecycle & stage advancement engine
│   │   │   ├── documents/         # Document requests, file uploads, approval engine
│   │   │   ├── universities/      # Shortlisting & selection
│   │   │   ├── applications/      # Application status tracking
│   │   │   ├── offers/            # Offer letter management
│   │   │   ├── payments/          # Payment requests & receipt verification
│   │   │   ├── visa/              # Visa records
│   │   │   ├── travel/            # Travel support
│   │   │   ├── orientation/       # Pre-departure orientation
│   │   │   ├── tasks/             # Task assignment & callback automation
│   │   │   ├── messages/          # Communication messaging
│   │   │   ├── masters/           # Countries, Universities, Courses
│   │   │   ├── users/             # User management
│   │   │   ├── activities/        # Immutable contact attempt logs
│   │   │   ├── audit/             # Audit logging service
│   │   │   └── reports/           # Dashboard KPI queries
│   │   ├── utils/                 # Logger, response helpers, errors
│   │   └── server.ts              # Express application bootstrap
│   └── package.json
│
└── docs/
    └── architecture/
        ├── agent.md               # AI Agent & Developer Guide
        ├── PRD.md                 # Product Requirements Document
        └── Design.md              # System Architecture & Technical Design
```

---

## 3. Database Schema & Data Models

### 3.1 User Model (`users`)
```typescript
interface IUser {
  _id: ObjectId;
  name: string;
  email: string; // Unique index
  passwordHash: string;
  phone: string;
  role: 'STUDENT' | 'COUNSELLOR' | 'ADMIN';
  adminType?: 'OWNER_ADMIN' | 'ADMIN';
  branchId?: ObjectId;
  isActive: boolean;
  assignedCounsellorId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Unified Lead / Student Model (`leads`)
```typescript
interface ILead {
  _id: ObjectId;
  studentId?: string; // Generated on conversion (e.g., STU-2026-001)
  name: string;
  email: string;
  phone: string;
  source: 'WEBSITE' | 'INSTAGRAM' | 'FACEBOOK' | 'REFERRAL' | 'WALK_IN' | 'EVENT' | 'OTHER' | 'MANUAL';
  sourceDetails?: string;
  counsellorId?: ObjectId; // Assigned counselor
  counsellorAssignedAt?: Date;
  stage: StudentStage; // 14 stages
  status: 'ACTIVE' | 'CLOSED_LOST' | 'ARCHIVED';
  closedLostReason?: string;
  previousStageBeforeLoss?: StudentStage;
  targetCountry?: string;
  targetCourse?: string;
  targetIntake?: string;
  academicProfile?: {
    highestQualification: string;
    gpa: string;
    englishTest: 'IELTS' | 'TOEFL' | 'PTE' | 'NONE';
    englishScore: string;
    budgetAnnual: number;
  };
  departureDate?: Date;
  arrivalDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Stage-Gating State Machine
The core business engine enforces sequential validation rules before updating `lead.stage`:

```
Stage Progression Requirements:
1. LEAD_CAPTURE ➔ Complete contact info & Counselor assigned
2. CONTACT_ATTEMPTS ➔ At least 1 contact attempt recorded
3. PRELIMINARY_COUNSELLING ➔ Google Meet scheduled & Attendance recorded
4. PROFILE_EVALUATION ➔ Academic profile, test scores, and budget filled
5. UNIVERSITY_SHORTLISTING ➔ Exactly 1 shortlisted university selected by student
6. DOCUMENT_COLLECTION ➔ All mandatory requested documents APPROVED
7. APPLICATION_SUBMISSION ➔ Application marked SUBMITTED
8. OFFER_MANAGEMENT ➔ Signed offer uploaded and ACCEPTED
9. FEE_PAYMENT ➔ Fee deposit proof uploaded and VERIFIED
10. VISA_PROCESSING ➔ Visa decision marked APPROVED
11. TRAVEL_SUPPORT ➔ Accommodation, Flight, and Insurance all marked COMPLETED
12. PRE_DEPARTURE_ORIENTATION ➔ Orientation session attended
13. DEPARTED ➔ Departure date recorded
14. ARRIVAL_CONFIRMED ➔ Arrival date recorded & confirmed
```

---

## 4. REST API Specifications

| Method | Endpoint | Description | Allowed Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user & return JWT token | Public |
| `GET` | `/api/v1/auth/me` | Fetch current authenticated user | All Authenticated |
| `GET` | `/api/v1/leads` | List leads/students with search & filter | Admin, Counselor, Student (own) |
| `POST` | `/api/v1/leads` | Create new lead record | Admin, Counselor |
| `PATCH` | `/api/v1/leads/:id/stage` | Advance stage (with stage-gating check) | Admin, Counselor |
| `POST` | `/api/v1/counselling/schedule` | Schedule Google Meet counselling session | Admin, Counselor |
| `GET` | `/api/v1/documents/lead/:leadId` | Fetch document checklist for student | Admin, Counselor, Student |
| `POST` | `/api/v1/documents/:id/upload` | Student uploads requested document | Student, Admin, Counselor |
| `PATCH` | `/api/v1/documents/:id/review` | Approve or reject document | Admin, Counselor |
| `POST` | `/api/v1/universities/shortlists/:leadId/select/:id` | Student confirms 1 university choice | Student, Admin |
| `POST` | `/api/v1/offers/:id/signed` | Upload signed offer letter acceptance | Student, Admin, Counselor |
| `POST` | `/api/v1/payments/:id/submit-proof` | Student submits wire payment proof | Student, Admin, Counselor |
| `PATCH` | `/api/v1/payments/:id/verify` | Counselor/Admin verifies payment | Admin, Counselor |
| `PATCH` | `/api/v1/visa/lead/:leadId` | Update visa filing & decision status | Admin, Counselor |
| `PATCH` | `/api/v1/travel/lead/:leadId` | Update accommodation, flight, insurance | Admin, Counselor |
| `GET` | `/api/v1/reports/dashboard` | Fetch operational KPIs and funnel | Admin, Counselor |
| `GET` | `/api/v1/audit-logs` | Fetch immutable audit logs | Admin, Owner Admin |

---

## 5. Security Architecture

1. **Authentication:** Stateless JWT with configurable expiration (`JWT_SECRET`, 7-day expiry).
2. **Authorization Middleware:** `requireRole([UserRole.ADMIN, UserRole.COUNSELLOR])` checks role claims on every protected route.
3. **Owner-Admin Immutability Guard:** Middleware intercepts any `PUT`, `PATCH`, `DELETE` operations targeting `OWNER_ADMIN` users and strictly rejects with `403 FORBIDDEN`.
4. **Audit Logging Service:** Every stage change, user creation, payment verification, and document approval dispatches an event to the `audit_logs` collection with `actorId`, `action`, `entityType`, `entityId`, and `ipAddress`.
