import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureReadingContext, type FeatureReadingState, type WriteState } from "../../src/components/features/FeatureReadingContext.js";
import SyncRetryButton from "../../src/components/features/SyncRetryButton.js";

let container: HTMLDivElement | null = null;
let root: Root | null = null;

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
        root?.render(createElement(FeatureReadingContext.Provider, { value: defaultContext }, createElement(SyncRetryButton)));
    });

    return container;
}

const ws = (status: WriteState["status"], errorMessage?: string): WriteState => ({
    status,
    errorMessage,
});

describe("SyncRetryButton", () => {
    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        void act(() => root?.unmount());
        container?.remove();
        container = null;
        root = null;
    });

    describe("Visibility", () => {
        it("shows when onSync is provided", () => {
            renderWithContext({ onSync: vi.fn() });
            expect(container?.querySelector("button")).not.toBeNull();
        });

        it("shows when writeState.status is error", () => {
            renderWithContext({ writeState: ws("error") });
            expect(container?.querySelector("button")).not.toBeNull();
        });

        it("shows when writeState.status is timedOut", () => {
            renderWithContext({ writeState: ws("timedOut") });
            expect(container?.querySelector("button")).not.toBeNull();
        });

        it("shows when writeState.status is pending", () => {
            renderWithContext({ writeState: ws("pending") });
            expect(container?.querySelector("button")).not.toBeNull();
        });

        it("renders nothing when no conditions met", () => {
            renderWithContext({});
            expect(container?.querySelector("button")).toBeNull();
        });
    });

    describe("Button styling", () => {
        it("btn-error for error status", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("error") });
            expect(container?.querySelector("button")?.className).toContain("btn-error");
        });

        it("btn-error for timedOut status", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("timedOut") });
            expect(container?.querySelector("button")?.className).toContain("btn-error");
        });

        it("btn-warning for pending status", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("pending") });
            expect(container?.querySelector("button")?.className).toContain("btn-warning");
        });

        it("btn-primary when idle with onSync", () => {
            renderWithContext({ onSync: vi.fn() });
            expect(container?.querySelector("button")?.className).toContain("btn-primary");
        });
    });

    describe("Disabled state", () => {
        it("disabled when pending", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("pending") });
            expect(container?.querySelector("button")?.disabled).toBe(true);
        });

        it("enabled for error", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("error") });
            expect(container?.querySelector("button")?.disabled).toBe(false);
        });
    });

    describe("Icon", () => {
        it("faRedo for error/timedOut", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("error") });
            const svg = container?.querySelector("svg");
            expect(svg?.getAttribute("data-icon")).toBe("arrow-rotate-right");
        });

        it("faSync for normal state", () => {
            renderWithContext({ onSync: vi.fn() });
            const svg = container?.querySelector("svg");
            expect(svg?.getAttribute("data-icon")).toBe("arrows-rotate");
        });
    });

    describe("Spin animation", () => {
        it("spins when pending", () => {
            renderWithContext({ onSync: vi.fn(), writeState: ws("pending") });
            const svg = container?.querySelector("svg");
            expect(svg?.getAttribute("class")).toContain("animate-spin");
        });

        it("does not spin when idle", () => {
            renderWithContext({ onSync: vi.fn() });
            const svg = container?.querySelector("svg");
            expect(svg?.getAttribute("class") ?? "").not.toContain("animate-spin");
        });
    });

    describe("Click behavior", () => {
        beforeEach(() => vi.useFakeTimers());
        afterEach(() => vi.useRealTimers());

        it("sync click only calls onSync", () => {
            const onSync = vi.fn();
            const onRetry = vi.fn();
            renderWithContext({ onSync, onRetry });

            void act(() => container?.querySelector("button")?.click());

            expect(onSync).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(3000);
            expect(onRetry).not.toHaveBeenCalled();
        });

        it("error click calls onSync then onRetry after 2s", () => {
            const onSync = vi.fn();
            const onRetry = vi.fn();
            renderWithContext({ onSync, onRetry, writeState: ws("error") });

            void act(() => container?.querySelector("button")?.click());

            expect(onSync).toHaveBeenCalledTimes(1);
            expect(onRetry).not.toHaveBeenCalled();

            void act(() => vi.advanceTimersByTime(2000));
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it("timeout click calls onSync then onRetry after 2s", () => {
            const onSync = vi.fn();
            const onRetry = vi.fn();
            renderWithContext({ onSync, onRetry, writeState: ws("timedOut") });

            void act(() => container?.querySelector("button")?.click());

            expect(onSync).toHaveBeenCalledTimes(1);
            void act(() => vi.advanceTimersByTime(2000));
            expect(onRetry).toHaveBeenCalledTimes(1);
        });
    });

    describe("State priority", () => {
        it("error styling takes precedence", () => {
            // With discriminated status, the status is unambiguous.
            renderWithContext({ onSync: vi.fn(), writeState: ws("error") });
            const btn = container?.querySelector("button");
            expect(btn?.className).toContain("btn-error");
            expect(btn?.className).not.toContain("btn-warning");
        });

        it("timedOut styling overrides reading", () => {
            renderWithContext({ onSync: vi.fn(), isReading: true, writeState: ws("timedOut") });
            const btn = container?.querySelector("button");
            expect(btn?.className).toContain("btn-error");
            expect(btn?.className).not.toContain("btn-warning");
        });
    });
});
