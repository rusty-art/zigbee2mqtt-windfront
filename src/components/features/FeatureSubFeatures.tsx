import { useCallback, useEffect, useMemo, useState } from "react";
import type { Zigbee2MQTTDeviceOptions } from "zigbee2mqtt";
import type { DeviceState, FeatureWithAnySubFeatures } from "../../types.js";
import type { ValueWithLabelOrPrimitive } from "../editors/EnumEditor.js";
import { useCommandFeedback } from "../editors/useCommandFeedback.js";
import ApplyButton from "./ApplyButton.js";
import Feature from "./Feature.js";
import { type BaseFeatureProps, getFeatureKey } from "./index.js";

interface FeatureSubFeaturesProps extends Omit<BaseFeatureProps<FeatureWithAnySubFeatures>, "deviceValue"> {
    minimal?: boolean;
    steps?: Record<string, ValueWithLabelOrPrimitive[]>;
    parentFeatures?: FeatureWithAnySubFeatures[];
    deviceState: DeviceState | Zigbee2MQTTDeviceOptions;
    deviceStateVersion?: number;
    endpointSpecific?: boolean;
}

interface CompositeState {
    [key: string]: unknown;
}

function isFeatureRoot(type: FeatureWithAnySubFeatures["type"], parentFeatures: FeatureWithAnySubFeatures[] | undefined) {
    if (type === "composite" && parentFeatures !== undefined) {
        if (parentFeatures.length === 0) {
            return true;
        }

        // none of the parents must be `composite` or `list` to be considered root
        return !parentFeatures.some(({ type }) => type === "composite" || type === "list");
    }

    return false;
}

export default function FeatureSubFeatures({
    feature,
    onChange,
    parentFeatures,
    onRead,
    device,
    deviceState,
    deviceStateVersion,
    featureWrapperClass,
    minimal,
    endpointSpecific,
    steps,
    sourceIdx,
}: FeatureSubFeaturesProps) {
    const { type, property } = feature;
    const [state, setState] = useState<CompositeState>({});
    const combinedState = useMemo(() => ({ ...deviceState, ...state }), [deviceState, state]);
    const features = ("features" in feature && feature.features) || [];
    const isRoot = isFeatureRoot(type, parentFeatures);

    // Use command feedback hook for Apply button state
    const { status, send } = useCommandFeedback({ sourceIdx, deviceFriendlyName: device.friendly_name });
    const isPending = status === "pending" || status === "queued";

    // Check if there are actual local changes (value differs from device)
    const hasLocalChanges = Object.keys(state).some((key) => state[key] !== deviceState?.[key]);

    // Helper to check if a specific property has a local change
    const propertyHasLocalChange = (prop: string): boolean => {
        // If Apply is pending/timed out, show amber for properties that were sent
        if (isPending && prop in state) {
            return true;
        }
        // If not pending, show amber only if local value differs from device
        return prop in state && state[prop] !== deviceState?.[prop];
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: specific trigger
    useEffect(() => {
        setState({});
    }, [device.ieee_address]);

    const onFeatureChange = useCallback(
        (value: Record<string, unknown>, transactionId?: string): void => {
            setState((prev) => ({ ...prev, ...value }));

            if (!isRoot) {
                if (type === "composite") {
                    const newValue = { ...deviceState, ...state, ...value };

                    onChange(property ? { [property]: newValue } : newValue, transactionId);
                } else {
                    onChange(value, transactionId);
                }
            }
        },
        [deviceState, state, type, property, isRoot, onChange],
    );

    const onRootApply = useCallback((): void => {
        const newState = { ...deviceState, ...state };
        // The payload we send - used for optimistic update if queued
        const sentPayload = property ? { [property]: newState } : newState;
        send((txId) => onChange(sentPayload, txId), sentPayload);
    }, [property, onChange, state, deviceState, send]);

    const onFeatureRead = useCallback(
        (prop: Record<string, unknown>, transactionId?: string): void => {
            if (type === "composite") {
                onRead?.(property ? { [property]: prop } : prop, transactionId);
            } else {
                onRead?.(prop, transactionId);
            }
        },
        [onRead, type, property],
    );

    return (
        <>
            {features.map((subFeature) => (
                <Feature
                    // @ts-expect-error typing failure
                    key={getFeatureKey(subFeature)}
                    // @ts-expect-error typing failure
                    feature={subFeature}
                    parentFeatures={[...(parentFeatures ?? []), feature]}
                    device={device}
                    deviceState={combinedState}
                    deviceStateVersion={deviceStateVersion}
                    onChange={onFeatureChange}
                    onRead={onFeatureRead}
                    featureWrapperClass={featureWrapperClass}
                    minimal={minimal}
                    endpointSpecific={endpointSpecific}
                    steps={steps?.[subFeature.name]}
                    batched={isRoot}
                    hasLocalChange={isRoot && subFeature.property !== undefined && propertyHasLocalChange(subFeature.property)}
                    sourceIdx={sourceIdx}
                />
            ))}
            {isRoot && (
                <div className="flex flex-row gap-3 items-center w-full">
                    <div className="flex-1" />
                    <ApplyButton
                        status={status}
                        hasLocalChanges={hasLocalChanges}
                        onClick={onRootApply}
                        minimal={minimal}
                        title={feature.property ?? feature.name}
                    />
                </div>
            )}
        </>
    );
}
