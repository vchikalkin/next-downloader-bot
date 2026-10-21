---
name: secure-feature
description: Secure forms, data handlers, and API routes with zod validation and safe error handling. Use when creating or editing forms, server actions, API routes, or any user input handling.
---

# Secure Feature

When building forms, handlers, or API routes:

1. Run a quick security pass: input validation, auth checks, no secret leakage.
2. Validate all input with **zod** on client and server. Install with `pnpm add zod` if missing.
3. Use early returns for validation failures and wrong status codes.
4. Wrap async work in `try/catch`; return user-facing errors via i18n keys — never expose stack traces or internal logs.
