# System Architecture & Technical Specifications

## 1. High-Level Architecture Overview

The Overseas Education CRM is engineered with an isolated, feature-driven, multi-tier architecture:

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
│                   MongoDB Atlas Database                    │
│   (Normalized collections, Indexed keys, Audit logs)        │
└─────────────────────────────────────────────────────────────┘
```

## 2. Security Boundaries & Role Matrix

| Capability | OWNER_ADMIN | ADMIN | COUNSELLOR | STUDENT |
| :--- | :---: | :---: | :---: | :---: |
| Full Leads Access | ✅ | ✅ | ✅ | ❌ |
| Create & Edit Leads | ✅ | ✅ | ✅ | ❌ |
| Manage Counselling & Sessions | ✅ | ✅ | ✅ | ❌ |
| Profile Evaluation | ✅ | ✅ | ✅ | ❌ |
| Request & Review Documents | ✅ | ✅ | ✅ | ❌ |
| Upload Requested Documents | ❌ | ❌ | ❌ | ✅ (Own) |
| Manage Applications & Offers | ✅ | ✅ | ✅ | ❌ |
| Sign / Upload Signed Offer | ❌ | ❌ | ❌ | ✅ (Own) |
| Create Payment Request | ✅ | ✅ | ✅ | ❌ |
| Submit Payment Proof | ❌ | ❌ | ❌ | ✅ (Own) |
| Verify Payment Request | ✅ | ✅ | ✅ | ❌ |
| Update Visa & Travel Details | ✅ | ✅ | ✅ | ❌ |
| User & Team Management | ✅ | ✅ | ❌ | ❌ |
| Modify / Delete Owner Admin | ❌ | ❌ | ❌ | ❌ |
| Archive Records | ✅ | ✅ | ❌ | ❌ |
| Permanently Delete Records | ✅ | ✅ | ❌ | ❌ |
| Access Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Internal Notes (Private) | ✅ | ✅ | ✅ | ❌ |
| Student Portal Chat | ❌ | ❌ | ✅ | ✅ (Own) |
