import { useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../../store.js";
import type { DeviceState } from "../../types.js";
import { generateTransactionId, registerDeviceSetCallback, unregisterDeviceSetCallback } from "../../websocket/WebSocketManager.js";
import { useFeatureReading } from "../features/FeatureReadingContext.js";

const SUCCESS_MS = 2000;
const TIMEOUT_MS = 10000;

export type CommandStatus = "idle" | "pending" | "ok" | "error" | "queued";

/** Check if error string contains only superseded groups (no real failures) */
function isOnlySuperseded(error: string): boolean {
    return error.split("|").every((g) => g.startsWith("superseded:"));
}

export function useCommandFeedback(
    options: {
        sourceIdx?: number;
        batched?: boolean;
        onSuccess?: () => void;
        /** Device friendly name for optimistic store update when command is queued for sleepy device. */
        deviceFriendlyName?: string;
    } = {},
) {
    const { sourceIdx, batched, onSuccess, deviceFriendlyName } = options;
    const { setWriteState, setOnRetry, isSleepy } = useFeatureReading();
    const statusRef = useRef<CommandStatus>("idle");
    const errorRef = useRef<string | undefined>(undefined);
    const txRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const lastSendFnRef = useRef<((txId?: string) => void) | null>(null);
    const sentPayloadRef = useRef<unknown>(undefined);

    const update = useCallback(
        (status: CommandStatus, errorMessage?: string) => {
            statusRef.current = status;
            errorRef.current = errorMessage;
            if (batched || !setWriteState) return;
            setWriteState({ status, errorMessage });
        },
        [batched, setWriteState],
    );

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (txRef.current && sourceIdx !== undefined) unregisterDeviceSetCallback(sourceIdx, txRef.current);
        },
        [sourceIdx],
    );

    const send = useCallback(
        (sendFn: (txId?: string) => void, sentPayload?: unknown) => {
            if (batched) {
                sendFn();
                return;
            }
            // Store for retry
            lastSendFnRef.current = sendFn;
            sentPayloadRef.current = sentPayload;
            if (timerRef.current) clearTimeout(timerRef.current);
            update("pending");
            if (sourceIdx === undefined) {
                sendFn();
                return;
            }
            if (txRef.current) unregisterDeviceSetCallback(sourceIdx, txRef.current);
            const txId = generateTransactionId(sourceIdx);
            txRef.current = txId;
            registerDeviceSetCallback(
                sourceIdx,
                txId,
                (r) => {
                    if (txRef.current === txId) txRef.current = null;
                    if (r.status === "ok") {
                        update("ok");
                        onSuccess?.();
                        timerRef.current = setTimeout(() => update("idle"), SUCCESS_MS);
                    } else if (r.error && isOnlySuperseded(r.error)) {
                        // Superseded by newer command — not a real error, just clear
                        update("idle");
                    } else if (r.error === "Response timeout (frontend)" && isSleepy) {
                        // Frontend timeout on battery device = queued in parent router
                        update("queued");
                        if (deviceFriendlyName && sourceIdx !== undefined) {
                            useAppStore
                                .getState()
                                .updateDeviceStates(sourceIdx, [{ topic: deviceFriendlyName, payload: sentPayloadRef.current as DeviceState }]);
                        }
                        timerRef.current = setTimeout(() => update("idle"), SUCCESS_MS);
                    } else {
                        update("error", r.error);
                    }
                },
                TIMEOUT_MS,
            );
            sendFn(txId);
        },
        [batched, sourceIdx, update, onSuccess, deviceFriendlyName, isSleepy],
    );

    // Register retry callback - re-sends the last command
    // Note: setOnRetry(() => fn) wraps fn because setState(fn) treats fn as an updater
    useEffect(() => {
        if (batched || !setOnRetry) return;
        setOnRetry(() => () => {
            if (lastSendFnRef.current) {
                send(lastSendFnRef.current);
            }
        });
        return () => setOnRetry(() => undefined);
    }, [batched, setOnRetry, send]);

    return { status: statusRef.current, errorMessage: errorRef.current, send };
}
