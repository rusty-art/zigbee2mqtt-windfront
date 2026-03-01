import { useFeatureReading } from "./FeatureReadingContext.js";

/**
 * StatusIndicator - Small colored dot showing editor state
 *
 * Displays a visual indicator based on the current write/read state:
 * - unknown (? icon): device value not yet known
 * - error (red dot): conflict or write timeout
 * - read failed (red dot): backend returned error for read operation
 * - warning (amber dot): pending write, reading, or queued for sleepy device
 * - success (green dot): device confirmed the value
 * - hidden: idle state (empty placeholder to prevent layout shift)
 *
 * Uses fixed-width wrapper to prevent layout shift when dot appears/disappears.
 * Error states show details in tooltip when available.
 */
export default function StatusIndicator() {
    const { isReading, readFailed, readErrorMessage, writeState, isUnknown } = useFeatureReading();

    const dotClass = "inline-block w-2 h-2 rounded-full";

    let content: React.ReactNode = null;

    if (isUnknown && writeState?.status !== "pending" && !isReading) {
        // Unknown value state (highest priority - show ? icon)
        content = (
            <span
                className="tooltip tooltip-right z-50 inline-flex items-center justify-center w-3 h-3 rounded-full bg-base-300 text-base-content text-[8px] font-bold"
                data-tip="Value unknown"
            >
                ?
            </span>
        );
    } else if (writeState?.status === "error" || writeState?.status === "timedOut") {
        // Write error states
        const tooltip = writeState.errorMessage ?? (writeState.status === "timedOut" ? "Timed out" : "Error");
        content = <span className={`${dotClass} bg-error tooltip tooltip-right z-50`} data-tip={tooltip} />;
    } else if (readFailed && readErrorMessage) {
        // Read error state (only show if we have error message from backend)
        content = <span className={`${dotClass} bg-error tooltip tooltip-right z-50`} data-tip={readErrorMessage} />;
    } else if (writeState?.status === "queued") {
        // Queued for sleepy device
        content = <span className={`${dotClass} bg-warning tooltip tooltip-right z-50`} data-tip="Queued for sleepy device" />;
    } else if (writeState?.status === "pending" || isReading) {
        // Pending or reading
        content = <span className={`${dotClass} bg-warning tooltip tooltip-right z-50`} data-tip="Sending..." />;
    } else if (writeState?.status === "ok") {
        // Confirmed
        content = <span className={`${dotClass} bg-success tooltip tooltip-right z-50`} data-tip="Confirmed" />;
    }

    // Fixed-size wrapper: width prevents layout shift, height matches typical control row (h-7 = 28px)
    return <span className="inline-flex w-3 h-7 items-center justify-center shrink-0">{content}</span>;
}
