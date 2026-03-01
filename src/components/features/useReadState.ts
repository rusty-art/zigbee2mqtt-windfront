import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ColorFeature, FeatureAccessMode, type FeatureWithAnySubFeatures } from "../../types.js";
import { generateTransactionId, registerDeviceSetCallback, unregisterDeviceSetCallback } from "../../websocket/WebSocketManager.js";
import type { FeatureReadingState, WriteState } from "./FeatureReadingContext.js";

const READ_TIMEOUT_MS = 10000;

function isColorFeature(feature: FeatureWithAnySubFeatures): feature is ColorFeature {
    return feature.type === "composite" && (feature.name === "color_xy" || feature.name === "color_hs");
}

type SyncState = "idle" | "reading" | "failed";

/**
 * Encapsulates read-state management shared by FeatureWrapper and DashboardFeatureWrapper.
 * Returns the context value for FeatureReadingContext.Provider.
 */
export function useReadState(options: {
    feature: FeatureWithAnySubFeatures;
    deviceValue?: unknown;
    deviceStateVersion?: number;
    onRead?: (property: Record<string, unknown>, transactionId?: string) => void;
    sourceIdx?: number;
    isSleepy?: boolean;
}): FeatureReadingState {
    const { feature, deviceValue, deviceStateVersion, onRead, sourceIdx, isSleepy } = options;

    const [syncState, setSyncState] = useState<SyncState>("idle");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastDeviceValueRef = useRef(deviceValue);
    const versionAtReadStartRef = useRef<number | undefined>(undefined);
    const activeReadTransactionRef = useRef<string | null>(null);

    const [writeState, setWriteState] = useState<WriteState | undefined>();
    const [onRetry, setOnRetry] = useState<(() => void) | undefined>();
    const [readErrorMessage, setReadErrorMessage] = useState<string | undefined>();

    const isReading = syncState === "reading";
    const readFailed = syncState === "failed";
    const isReadable = onRead !== undefined && (Boolean(feature.property && feature.access & FeatureAccessMode.GET) || isColorFeature(feature));
    const isUnknown = deviceValue === null || deviceValue === undefined;

    // Clear reading/timeout state when device responds
    useEffect(() => {
        if (syncState !== "idle") {
            const valueChanged = deviceValue !== lastDeviceValueRef.current;
            const versionChanged =
                deviceStateVersion !== undefined && versionAtReadStartRef.current !== undefined && deviceStateVersion > versionAtReadStartRef.current;

            if (valueChanged || versionChanged) {
                setSyncState("idle");
                setReadErrorMessage(undefined);
                versionAtReadStartRef.current = undefined;
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            }
        }
        lastDeviceValueRef.current = deviceValue;
    }, [deviceValue, deviceStateVersion, syncState]);

    // Cleanup timeout and transaction callback on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (activeReadTransactionRef.current && sourceIdx !== undefined) {
                unregisterDeviceSetCallback(sourceIdx, activeReadTransactionRef.current);
                activeReadTransactionRef.current = null;
            }
        };
    }, [sourceIdx]);

    const onSync = useCallback(() => {
        if (feature.property && onRead) {
            versionAtReadStartRef.current = deviceStateVersion;
            setSyncState("reading");
            setReadErrorMessage(undefined);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (activeReadTransactionRef.current && sourceIdx !== undefined) {
                unregisterDeviceSetCallback(sourceIdx, activeReadTransactionRef.current);
            }

            let transactionId: string | undefined;
            if (sourceIdx !== undefined) {
                transactionId = generateTransactionId(sourceIdx);
                activeReadTransactionRef.current = transactionId;

                registerDeviceSetCallback(
                    sourceIdx,
                    transactionId,
                    (response) => {
                        if (activeReadTransactionRef.current === transactionId) {
                            activeReadTransactionRef.current = null;
                        }

                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                            timeoutRef.current = null;
                        }

                        if (response.status === "ok") {
                            setSyncState("idle");
                            setReadErrorMessage(undefined);
                            versionAtReadStartRef.current = undefined;
                        } else {
                            setSyncState("failed");
                            setReadErrorMessage(response.error);
                        }
                    },
                    READ_TIMEOUT_MS,
                );
            }

            // Only use local timeout as fallback when no transaction callback is registered
            if (sourceIdx === undefined) {
                timeoutRef.current = setTimeout(() => {
                    setSyncState("failed");
                    timeoutRef.current = null;
                }, READ_TIMEOUT_MS);
            }

            onRead({ [feature.property]: "" }, transactionId);
        }
    }, [feature.property, onRead, deviceStateVersion, sourceIdx]);

    return useMemo(
        () => ({
            isReading,
            readFailed,
            readErrorMessage,
            isUnknown,
            isSleepy,
            writeState,
            setWriteState,
            onRetry,
            setOnRetry,
            onSync: isReadable ? onSync : undefined,
        }),
        [isReading, readFailed, readErrorMessage, isUnknown, isSleepy, writeState, onRetry, isReadable, onSync],
    );
}
