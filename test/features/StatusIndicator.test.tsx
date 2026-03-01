import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FeatureReadingContext, type FeatureReadingState, type WriteState } from "../../src/components/features/FeatureReadingContext.js";
import StatusIndicator from "../../src/components/features/StatusIndicator.js";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

// Helper to render with context
function renderWithContext(contextValue: Partial<FeatureReadingState>) {
    const defaultContext: FeatureReadingState = {
        isReading: false,
        readFailed: false,
        readErrorMessage: undefined,
        isUnknown: false,
        writeState: undefined,
        setWriteState: undefined,
        onRetry: undefined,
        setOnRetry: undefined,
        onSync: undefined,
        ...contextValue,
    };

    void act(() => {
        root?.render(createElement(FeatureReadingContext.Provider, { value: defaultContext }, createElement(StatusIndicator)));
    });

    return container;
}

describe("StatusIndicator", () => {
    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        void act(() => {
            root?.unmount();
        });
        container?.remove();
        container = null;
        root = null;
    });

    describe("Unknown state", () => {
        it("should show ? icon when value is unknown", () => {
            renderWithContext({ isUnknown: true });
            const questionMark = container?.textContent;
            expect(questionMark).toContain("?");
        });

        it("should show tooltip for unknown value", () => {
            renderWithContext({ isUnknown: true });
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toContain("unknown");
        });

        it("should not show ? when pending (even if unknown)", () => {
            const writeState: WriteState = { status: "pending" };
            renderWithContext({ isUnknown: true, writeState });
            // Should show pending indicator, not ?
            const warningDot = container?.querySelector(".bg-warning");
            expect(warningDot).not.toBeNull();
        });
    });

    describe("Idle state", () => {
        it("should render nothing when idle (no writeState, not reading)", () => {
            renderWithContext({});
            // StatusIndicator returns null, so no visible children
            expect(container?.querySelector(".bg-error")).toBeNull();
            expect(container?.querySelector(".bg-warning")).toBeNull();
            expect(container?.querySelector(".bg-success")).toBeNull();
            expect(container?.querySelector("svg")).toBeNull();
        });

        it("should render nothing when writeState is idle", () => {
            const writeState: WriteState = { status: "idle" };
            renderWithContext({ writeState });
            expect(container?.querySelector(".bg-error")).toBeNull();
            expect(container?.querySelector(".bg-warning")).toBeNull();
            expect(container?.querySelector(".bg-success")).toBeNull();
            expect(container?.querySelector("svg")).toBeNull();
        });
    });

    describe("Error states (highest priority)", () => {
        it("should show red dot for error", () => {
            const writeState: WriteState = { status: "error" };
            renderWithContext({ writeState });
            const dot = container?.querySelector(".bg-error");
            expect(dot).not.toBeNull();
        });

        it("should show red dot for timeout", () => {
            const writeState: WriteState = { status: "timedOut" };
            renderWithContext({ writeState });
            const dot = container?.querySelector(".bg-error");
            expect(dot).not.toBeNull();
        });

        it("should NOT show red dot for read timeout (? or nothing is sufficient)", () => {
            renderWithContext({ readFailed: true });
            const dot = container?.querySelector(".bg-error");
            expect(dot).toBeNull();
        });

        it("should display error message in tooltip when available", () => {
            const writeState: WriteState = { status: "error", errorMessage: "Device did not respond" };
            renderWithContext({ writeState });
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toContain("Device did not respond");
        });

        it("should show generic Error tooltip when no errorMessage", () => {
            const writeState: WriteState = { status: "error" };
            renderWithContext({ writeState });
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toBe("Error");
        });

        it("should show Timed out tooltip for timeout without errorMessage", () => {
            const writeState: WriteState = { status: "timedOut" };
            renderWithContext({ writeState });
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toBe("Timed out");
        });
    });

    describe("Pending state", () => {
        it("should show warning dot when pending", () => {
            const writeState: WriteState = { status: "pending" };
            renderWithContext({ writeState });
            const dot = container?.querySelector(".bg-warning");
            expect(dot).not.toBeNull();
        });

        it("should show warning dot when reading", () => {
            renderWithContext({ isReading: true });
            const dot = container?.querySelector(".bg-warning");
            expect(dot).not.toBeNull();
        });
    });

    describe("Queued state (sleepy device)", () => {
        it("should show warning dot with queued tooltip", () => {
            const writeState: WriteState = { status: "queued" };
            renderWithContext({ writeState });
            const dot = container?.querySelector(".bg-warning");
            expect(dot).not.toBeNull();
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toBe("Queued for sleepy device");
        });
    });

    describe("Confirmed state", () => {
        it("should show green dot when confirmed", () => {
            const writeState: WriteState = { status: "ok" };
            renderWithContext({ writeState });
            const dot = container?.querySelector(".bg-success");
            expect(dot).not.toBeNull();
        });
    });

    describe("State priority", () => {
        it("should show error over pending when error status", () => {
            // With discriminated status, only one status is active.
            // Error takes priority by being checked first in the if-chain.
            const writeState: WriteState = { status: "error" };
            renderWithContext({ writeState });
            const errorDot = container?.querySelector(".bg-error");
            expect(errorDot).not.toBeNull();
        });

        it("should show error over confirmed when error status", () => {
            const writeState: WriteState = { status: "error" };
            renderWithContext({ writeState });
            const errorDot = container?.querySelector(".bg-error");
            expect(errorDot).not.toBeNull();
        });
    });

    describe("Read states", () => {
        it("should show warning dot when reading", () => {
            renderWithContext({ isReading: true });
            const dot = container?.querySelector(".bg-warning");
            expect(dot).not.toBeNull();
        });

        it("should show red dot with error message when read fails", () => {
            renderWithContext({
                readFailed: true,
                readErrorMessage: "Device did not respond",
            });
            const dot = container?.querySelector(".bg-error");
            expect(dot).not.toBeNull();
            const tooltip = container?.querySelector("[data-tip]");
            expect(tooltip?.getAttribute("data-tip")).toContain("Device did not respond");
        });

        it("should NOT show red dot when readFailed but no error message (frontend timeout)", () => {
            renderWithContext({ readFailed: true });
            const errorDot = container?.querySelector(".bg-error");
            expect(errorDot).toBeNull();
        });
    });
});
