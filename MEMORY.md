# Project Memory: Edupress - Online Learning Platform

## 1. Project Overview & Business Logic
- **Core Goal:** A B2B2C online learning platform connecting Course Providers (NCC) with Customers, managed by Admins.
- **Role-Based Access Control (RBAC):**
  1. `Customer`: Can register, buy courses, study, review, and request to become a Provider.
  2. `Course_Provider` (NCC): Can create/edit courses, upload lessons, create discount codes, and view revenue.
  3. `Admin`: Approves new Providers, approves new courses, manages content, users, and financials.
- **Key Business Rules:** - User emails are UNIQUE and CANNOT be changed after registration.
  - New courses and new Provider accounts MUST be approved by an Admin before going live.
  - Customers can only view lessons and review courses they have successfully registered/paid for.

## 2. Tech Stack
- **Workspace:** pnpm workspaces + Turborepo
- **Database:** PostgreSQL + Prisma (`packages/db`)
- **Shared:** TypeScript types & interfaces (`packages/shared-types`)
- **Backend:** NestJS (`apps/api`)
- **Frontend:** Next.js App Router, Tailwind CSS (`apps/web`)

## 3. Current State
- **[DONE]:** Project requirements analyzed.
- **[IN_PROGRESS]:** Initializing monorepo structure and configuring AI Agent rules.
- **[NEXT]:** 1. Define Prisma Schema for Users, Courses, Lessons, and Roles.
  2. Scaffold Auth Module in NestJS.

## 4. Known Issues & Workarounds
- *Leave blank for now. Update when bugs are resolved.*