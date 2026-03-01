import { createContext, useContext } from "react";

/** Discriminated write status — only one status is active at a time. */
export type WriteStatus = "idle" | "pending" | "ok" | "error" | "timedOut" | "queued";

// Write state reported by editors (RangeEditor, etc.)
// Note: Value and status are decoupled - value shows device truth (from state channel),
// status dot shows command outcome (from response channel). No "conflict" detection needed.
export type WriteState = {
    status: WriteStatus;
    /** Error message from backend */
    errorMessage?: string;
};

export type FeatureReadingState = {
    // Read state (set by FeatureWrapper)
    isReading: boolean;
    readFailed: boolean;
    /** Error message from failed read */
    readErrorMessage?: string;

    // Value state (set by FeatureWrapper)
    isUnknown: boolean;

    /** Device is battery-powered (sleepy) — affects timeout interpretation */
    isSleepy?: boolean;

    // Write state (set by editors like RangeEditor)
    writeState: WriteState | undefined;
    setWriteState: ((state: WriteState | undefined) => void) | undefined;

    // Retry callback (set by editor, called by FeatureWrapper button)
    onRetry: (() => void) | undefined;
    setOnRetry: ((fn: (() => void) | undefined) => void) | undefined;

    // Sync callback (provided by FeatureWrapper, called by editors for read)
    onSync: (() => void) | undefined;
};

export const FeatureReadingContext = createContext<FeatureReadingState>({
    isReading: false,
    readFailed: false,
    readErrorMessage: undefined,
    isUnknown: false,
    isSleepy: false,
    writeState: undefined,
    setWriteState: undefined,
    onRetry: undefined,
    setOnRetry: undefined,
    onSync: undefined,
});

export function useFeatureReading() {
    return useContext(FeatureReadingContext);
}
