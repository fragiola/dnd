import "@testing-library/jest-dom/vitest";
import { enableAutoUnmount } from "@vue/test-utils";
import { afterEach } from "vitest";

// every component a test mounts unmounts after it, as Testing Library's cleanup does
enableAutoUnmount(afterEach);
