# Global Engineering & Coding Rules — HardHat Compliance

## 1. Type Safety & TypeScript Constraints
* **Strict Mode Compliance:** Every data object parameter, server function contract, and database query record mapping must have explicit, solid types. Use of `any` is strictly prohibited.
* **Component Prop Safety:** Client UI elements must define strict TypeScript interfaces for inputs. If a property is optional, it must handle default empty states gracefully without throwing undefined rendering faults.

## 2. Structural Patterns & Architecture Controls
* **Server-First Design (RSCs):** Maximize the use of React Server Components for heavy database reading execution blocks to ensure clean, lightning-fast dashboard metrics.
* **Client Boundary Isolation:** Keep `'use client'` interactive perimeter views small. Wrap user toggles, file uploads, and sliding sheets inside focused sub-components rather than rendering entire landing views as client components.
* **Explosive Crash Avoidance:** All backend mutations and server execution hooks must be isolated within strict `try/catch` wrappers. If a query block fails, return an actionable, clear error payload to the user interface instead of throwing an unhandled runtime exception.