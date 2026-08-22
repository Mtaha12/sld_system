# Frontend Coding Standards — Modern Legal Case Information & Research System

## 1. Project Structure

Use a feature-based React project structure.

```text
src/
├── assets/
├── components/
│   ├── ui/
│   ├── forms/
│   └── layout/
├── features/
│   ├── auth/
│   ├── cases/
│   ├── notifications/
│   └── statutes/
├── layouts/
├── pages/
├── services/
├── hooks/
├── utils/
├── constants/
├── routes/
├── styles/
├── App.jsx
└── main.jsx
```

**Standard:** Keep each major feature's components, logic, validation, and related files together.

---

## 2. Component Architecture

Follow reusable, single-responsibility components.

- Components should have one clear responsibility.
- Avoid giant components.
- Reusable UI belongs in `components/ui/`.
- Feature-specific components belong inside their respective feature.
- Break large forms into logical sections.
- Avoid duplicated UI/code; extract reusable components.
- Keep business logic separate from presentation where practical.
- Prefer composition over deeply nested components.

Example:

```text
features/cases/
├── components/
│   ├── CaseForm.jsx
│   ├── CaseIdentity.jsx
│   ├── CourtDetails.jsx
│   ├── LawyersSection.jsx
│   └── Attachments.jsx
├── hooks/
├── services/
└── validation/
```

**Standard:** If a component becomes difficult to understand or reuse, split it.

---

## 3. Naming Conventions

Use clear and consistent naming.

- Components: `PascalCase`
  - `CaseForm.jsx`
  - `LoginPage.jsx`
- Functions: `camelCase`
  - `handleSubmit()`
  - `fetchCases()`
- Variables: `camelCase`
  - `caseData`
  - `searchQuery`
- Constants: `UPPER_SNAKE_CASE`
  - `MAX_FILE_SIZE`
  - `API_BASE_URL`
- Hooks: `use` + `camelCase`
  - `useCases()`
  - `useAuth()`
- Folders: `kebab-case`
  - `case-management/`
  - `auth/`
- Files should match their primary purpose.

**Standard:** Names should describe what something does, not how it works internally.

---

## 4. State Management

Keep state management simple and purposeful.

- Local component state: `useState`.
- Form state: React Hook Form.
- Server/API state: TanStack Query.
- Global state: Zustand only when genuinely needed.
- Do not put everything into global state.
- Authentication/session state may be handled globally.
- Do not unnecessarily duplicate server data into local/global state.

**Standard:** Use the simplest state solution appropriate for the problem.

---

## 5. API Handling

Keep API communication separate from UI components.

- Use a dedicated `services/` layer.
- Use Axios for HTTP requests.
- Use TanStack Query for fetching, caching, loading, and server-state management.
- Components must not contain raw API calls.
- Centralize API configuration and authentication headers.
- Handle API errors consistently.
- Keep request/response logic separate from UI logic.

Example:

```text
services/
├── authService.js
├── caseService.js
├── notificationService.js
└── statuteService.js
```

**Standard:** UI → Hook/Query → Service → API

---

## 6. Form Validation & Handling

Use **React Hook Form + Zod**.

- Every form must have a defined validation schema.
- Validate on both frontend and backend.
- Required fields must be clearly indicated.
- Show validation errors close to the relevant field.
- Prevent unnecessary form re-renders.
- File uploads must validate type and size.
- Never rely on frontend validation alone.

Initial attachment requirement:

- Maximum file size: 5 MB per attachment.
- Supported formats: PDF and DOCX.

**Standard:** Form UI → React Hook Form → Zod Schema → API

---

## 7. Styling & UI Standards

Use **Tailwind CSS** with a reusable design system.

- Maintain consistent spacing, typography, colors, borders, and radius.
- Create reusable UI components instead of repeatedly duplicating styling.
- Fully responsive.
- Desktop-first for the legal/admin environment while supporting tablet/mobile.
- Avoid excessive animations.
- Consider accessibility from the beginning.
- Avoid inline styles unless genuinely necessary.
- Use design tokens for core colors, spacing, and typography.

**Standard:** Every screen must feel like part of the same product.

---

## 8. Loading, Error & Empty States

Every data-driven screen must intentionally handle:

- Loading state.
- Success state.
- Error state.
- Empty state.

Rules:

- Use skeletons/spinners where appropriate.
- Provide clear, user-friendly error messages.
- Provide retry options where appropriate.
- Explain empty states and what the user can do next.
- Never leave users staring at a blank screen.
- Never expose raw API/server errors directly to users.

**Standard:** Every API-dependent component must have intentional Loading / Success / Error / Empty states.

---

## 9. Reusable Components & Design System

Build a small internal design system for consistency.

Reusable components may include:

- Buttons
- Inputs
- Selects
- Modals
- Tables
- Cards
- Badges
- Tabs
- Dropdowns
- Tooltips
- File uploaders
- Form sections
- Alerts/notifications

Rules:

- Extract a reusable component when the same pattern appears more than once.
- Components should support variants through props where appropriate.
- Avoid overly generic components that become difficult to maintain.
- Feature-specific UI stays inside its feature.

**Standard:** Build once → reuse everywhere → keep behavior consistent.

---

## 10. Security & Permissions

The application has two roles:

### User
- Read-only access.
- Can search and view cases.
- Can view/download permitted attachments.
- Cannot create, edit, or delete records.

### Admin
- Full management access.
- Can create, edit, update, and manage legal records.

Rules:

- Protect frontend routes based on user role.
- Hide unauthorized actions from the UI.
- Never rely on frontend permissions for actual security.
- Backend must independently verify every permission.
- Handle authentication/session data securely.
- Do not unnecessarily store sensitive data in `localStorage`.

**Standard:** Frontend controls the experience; backend controls the authority.

---

## 11. Code Quality & Formatting

Use:

- **ESLint** for code quality.
- **Prettier** for formatting.

Rules:

- No unused imports or variables.
- No unnecessary `console.log`.
- Avoid duplicated code.
- Use clear comments only where logic is not obvious.
- Keep functions and components focused.
- Never hardcode API URLs, credentials, or configuration.
- Avoid premature optimization.
- Keep code readable and predictable.

**Standard:** Code should be clean, readable, predictable, and easy for the other team member to understand.

---

# General Rule

These standards apply to all frontend work in this project unless a specific requirement explicitly overrides them.

Before implementing a feature, follow the existing architecture and reuse existing components/patterns whenever possible. Do not introduce a new library, architectural pattern, or duplicated implementation without a clear reason.
