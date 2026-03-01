import { faRedo, faSync } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFeatureReading } from "./FeatureReadingContext.js";

// Short timeout for quick read before retry write
const QUICK_READ_TIMEOUT_MS = 2000;

/**
 * Consolidated sync/retry button that reads state from FeatureReadingContext.
 * Renders inline - place this inside your editor's flex-row for proper positioning.
 */
export default function SyncRetryButton() {
    const { t } = useTranslation("zigbee");
    const { isReading, readFailed, writeState, onRetry, onSync } = useFeatureReading();

    const isWriteError = writeState?.status === "error" || writeState?.status === "timedOut";

    // Handle button click - retry (quick read then write) or sync (read)
    const handleClick = useCallback(() => {
        if (isWriteError) {
            // Retry: quick read (2s) then write
            onSync?.();
            setTimeout(() => {
                onRetry?.();
            }, QUICK_READ_TIMEOUT_MS);
        } else {
            // Normal sync: just read
            onSync?.();
        }
    }, [isWriteError, onSync, onRetry]);

    const isPending = writeState?.status === "pending";

    // Determine if button should show
    const showButton = onSync || isWriteError || isPending;

    if (!showButton) {
        return null;
    }

    // Button styling based on state
    const getButtonClass = () => {
        if (isWriteError) {
            return "btn btn-xs btn-square btn-error btn-soft";
        }
        if (isPending || isReading) {
            return "btn btn-xs btn-square btn-warning btn-soft";
        }
        if (readFailed) {
            return "btn btn-xs btn-square btn-error btn-soft";
        }
        return "btn btn-xs btn-square btn-primary btn-soft";
    };

    // Tooltip based on state
    const getTooltip = () => {
        if (writeState?.status === "timedOut") {
            return t(($) => $.no_response_retry);
        }
        if (writeState?.status === "error") {
            return t(($) => $.command_failed_retry);
        }
        if (isPending) {
            return t(($) => $.sending_to_device);
        }
        if (readFailed) {
            return t(($) => $.read_failed);
        }
        if (isReading) {
            return t(($) => $.reading_from_device);
        }
        return t(($) => $.get_value_from_device);
    };

    const isDisabled = isPending || isReading;
    const icon = isWriteError ? faRedo : faSync;
    const shouldSpin = isPending || isReading;

    return (
        <div className="tooltip tooltip-left" data-tip={getTooltip()}>
            <button type="button" className={getButtonClass()} onClick={handleClick} disabled={isDisabled}>
                <FontAwesomeIcon icon={icon} className={shouldSpin ? "animate-spin" : ""} />
            </button>
        </div>
    );
}
