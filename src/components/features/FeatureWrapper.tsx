import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import startCase from "lodash/startCase.js";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import type { FeatureWithAnySubFeatures } from "../../types.js";
import { FeatureReadingContext } from "./FeatureReadingContext.js";
import { getFeatureIcon } from "./index.js";
import StatusIndicator from "./StatusIndicator.js";
import SyncRetryButton from "./SyncRetryButton.js";
import { useReadState } from "./useReadState.js";

export type FeatureWrapperProps = {
    feature: FeatureWithAnySubFeatures;
    parentFeatures: FeatureWithAnySubFeatures[];
    deviceValue?: unknown;
    deviceStateVersion?: number;
    onRead?(property: Record<string, unknown>, transactionId?: string): void;
    endpointSpecific?: boolean;
    /** When true, render children inline with label (used for Binary in batched composites) */
    inline?: boolean;
    /** Source index for Command Response API (needed for read transaction callbacks) */
    sourceIdx?: number;
    /** Device is battery-powered (sleepy) — affects timeout interpretation */
    isSleepy?: boolean;
};

export default function FeatureWrapper({
    children,
    feature,
    deviceValue,
    deviceStateVersion,
    onRead,
    endpointSpecific,
    parentFeatures,
    inline,
    sourceIdx,
    isSleepy,
}: PropsWithChildren<FeatureWrapperProps>) {
    const { t } = useTranslation("zigbee");
    const contextValue = useReadState({ feature, deviceValue, deviceStateVersion, onRead, sourceIdx, isSleepy });

    // @ts-expect-error `undefined` is fine
    const unit = feature.unit as string | undefined;
    const [fi, fiClassName] = getFeatureIcon(feature.name, deviceValue, unit);
    const parentFeature = parentFeatures[parentFeatures.length - 1];
    const featureName = feature.name === "state" ? feature.property : feature.name;
    let label = feature.label || startCase(featureName);

    if (parentFeature?.label && feature.name === "state" && parentFeature.type !== "light" && parentFeature.type !== "switch") {
        label = `${parentFeature.label} ${feature.label.charAt(0).toLowerCase()}${feature.label.slice(1)}`;
    }

    return (
        <FeatureReadingContext.Provider value={contextValue}>
            <div className="list-row p-3">
                <div>
                    {/* prevent nested composite (most often used for grouping) from extra-indenting with invisible icon, better for small screen */}
                    {parentFeatures.length > 0 && feature.type === "composite" && fiClassName === "opacity-0" ? null : (
                        <FontAwesomeIcon icon={fi} className={fiClassName} size="2xl" />
                    )}
                </div>
                {inline ? (
                    <div className="flex items-center gap-3 flex-1">
                        <div>
                            <div title={featureName}>
                                {label}
                                {!endpointSpecific && feature.endpoint ? ` (${t(($) => $.endpoint)}: ${feature.endpoint})` : ""}
                            </div>
                            <div className="text-xs font-semibold opacity-60">{feature.description}</div>
                        </div>
                        <StatusIndicator />
                        <div className="flex-1">{children}</div>
                    </div>
                ) : (
                    <>
                        <div>
                            <div title={featureName}>
                                {label}
                                {!endpointSpecific && feature.endpoint ? ` (${t(($) => $.endpoint)}: ${feature.endpoint})` : ""}
                            </div>
                            <div className="text-xs font-semibold opacity-60">{feature.description}</div>
                        </div>
                        <div className="list-col-wrap flex flex-row items-start gap-2">
                            <StatusIndicator />
                            <div className="flex flex-col gap-2">{children}</div>
                        </div>
                    </>
                )}
                <SyncRetryButton />
            </div>
        </FeatureReadingContext.Provider>
    );
}
