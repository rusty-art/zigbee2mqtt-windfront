import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import startCase from "lodash/startCase.js";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { FeatureReadingContext } from "../features/FeatureReadingContext.js";
import type { FeatureWrapperProps } from "../features/FeatureWrapper.js";
import { getFeatureIcon } from "../features/index.js";
import StatusIndicator from "../features/StatusIndicator.js";
import { useReadState } from "../features/useReadState.js";

export default function DashboardFeatureWrapper({
    children,
    feature,
    deviceValue,
    deviceStateVersion,
    onRead,
    endpointSpecific,
    sourceIdx,
    isSleepy,
}: PropsWithChildren<FeatureWrapperProps>) {
    const { t } = useTranslation("zigbee");
    const contextValue = useReadState({ feature, deviceValue, deviceStateVersion, onRead, sourceIdx, isSleepy });

    // @ts-expect-error `undefined` is fine
    const unit = feature.unit as string | undefined;
    const [fi, fiClassName] = getFeatureIcon(feature.name, deviceValue, unit);
    const featureName = feature.name === "state" ? feature.property : feature.name;

    return (
        <FeatureReadingContext.Provider value={contextValue}>
            <div className="flex flex-row items-center gap-1 mb-2">
                <StatusIndicator />
                <FontAwesomeIcon icon={fi} className={fiClassName} />
                <div className="grow-1" title={featureName}>
                    {startCase(featureName)}
                    {!endpointSpecific && <span title={t(($) => $.endpoint)}>{feature.endpoint ? ` (${feature.endpoint})` : null}</span>}
                </div>
                <div className="shrink-1 *:bg-base-200">{children}</div>
            </div>
        </FeatureReadingContext.Provider>
    );
}
