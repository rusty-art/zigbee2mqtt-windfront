import { useCallback } from "react";
import type { Device } from "../types.js";
import { sendMessage } from "../websocket/WebSocketManager.js";

export function useDeviceCommands(sourceIdx: number, device: Device) {
    const onChange = useCallback(
        async (value: unknown, transactionId?: string) => {
            await sendMessage<"{friendlyNameOrId}/set">(
                sourceIdx,
                // @ts-expect-error templated API endpoint
                `${device.ieee_address}/request/set`,
                { ...(value as Record<string, unknown>), z2m_transaction: transactionId },
            );
        },
        [sourceIdx, device.ieee_address],
    );

    const onRead = useCallback(
        async (value: Record<string, unknown>, transactionId?: string) => {
            await sendMessage<"{friendlyNameOrId}/get">(
                sourceIdx,
                // @ts-expect-error templated API endpoint
                `${device.ieee_address}/request/get`,
                { ...value, z2m_transaction: transactionId },
            );
        },
        [sourceIdx, device.ieee_address],
    );

    return { onChange, onRead };
}
