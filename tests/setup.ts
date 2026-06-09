import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Next.js modules that break in Node/Vitest environment
vi.mock("next/config", () => ({ default: () => ({}) }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn(), redirect: vi.fn() }));

// Make vitest globals explicitly available in the global scope
Object.assign(globalThis, { describe, it, expect, vi, beforeEach, afterEach });
