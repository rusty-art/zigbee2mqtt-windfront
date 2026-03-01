import { memo } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button.js";
import type { CommandStatus } from "../editors/useCommandFeedback.js";

type ApplyButtonProps = {
    status: CommandStatus;
    hasLocalChanges: boolean;
    onClick: () => void;
    minimal?: boolean;
    title?: string;
};

/** Shared Apply button for batched composites (FeatureSubFeatures, List, Gradient) */
export default memo(function ApplyButton({ status, hasLocalChanges, onClick, minimal, title }: ApplyButtonProps) {
    const { t } = useTranslation("common");
    const isConfirmed = status === "ok";
    const isError = status === "error";
    const isPending = status === "pending" || status === "queued";

    return (
        <Button
            className={`btn ${minimal ? "btn-sm" : ""} ${
                isConfirmed ? "btn-success" : isError ? "btn-error" : isPending || hasLocalChanges ? "btn-warning" : "btn-primary"
            }`}
            onClick={onClick}
            title={title}
        >
            {t(($) => $.apply)}
            {isConfirmed && " \u2713"}
        </Button>
    );
});
