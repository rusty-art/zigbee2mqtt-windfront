import { type ChangeEvent, memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../Button.js";
import DisplayValue from "../value-decorators/DisplayValue.js";
import { useCommandFeedback } from "./useCommandFeedback.js";

export type ValueWithLabel = {
    value: number;
    name: string;
    description?: string;
};

export type ValueWithLabelOrPrimitive = ValueWithLabel | number | string;

type EnumProps = {
    value?: ValueWithLabelOrPrimitive;
    onChange(value: unknown, transactionId?: string): void;
    values: ValueWithLabelOrPrimitive[];
    minimal?: boolean;
    /** When true, parent manages state machine (e.g., when used as sub-component in RangeEditor) */
    controlled?: boolean;
    /** When true, changes are batched (Apply button) - only show editing state */
    batched?: boolean;
    /** Source index for transaction ID generation */
    sourceIdx?: number;
};

function isPrimitive(step?: ValueWithLabelOrPrimitive | null): step is number | string {
    return typeof step !== "object";
}

function getValueForComparison(v: ValueWithLabelOrPrimitive | undefined): unknown {
    if (v === undefined) return undefined;
    return isPrimitive(v) ? v : v.value;
}

const EnumEditor = memo((props: EnumProps) => {
    const { onChange, values, value, minimal, controlled, batched, sourceIdx } = props;
    const { t } = useTranslation("common");
    const currentValueForComparison = getValueForComparison(value);

    const [selectedValue, setSelectedValue] = useState(currentValueForComparison);
    const { send } = useCommandFeedback({ sourceIdx, batched });

    // Sync selected value from device state when it changes
    useEffect(() => {
        setSelectedValue(currentValueForComparison);
    }, [currentValueForComparison]);

    const handleChange = useCallback(
        (selectedItem: ValueWithLabelOrPrimitive) => {
            const newValue = isPrimitive(selectedItem) ? selectedItem : selectedItem.value;
            setSelectedValue(newValue);

            if (controlled) {
                onChange(selectedItem);
            } else {
                send((txId) => onChange(newValue, txId));
            }
        },
        [controlled, onChange, send],
    );

    const onSelectChange = useCallback(
        (e: ChangeEvent<HTMLSelectElement>) => {
            const selectedItem = values.find((v) => (isPrimitive(v) ? v === e.target.value : v.value === Number.parseInt(e.target.value, 10)));
            if (selectedItem !== undefined) handleChange(selectedItem);
        },
        [values, handleChange],
    );

    const onButtonClick = useCallback((item: ValueWithLabelOrPrimitive) => handleChange(item), [handleChange]);

    const selectValue = (currentValueForComparison ?? "") as string | number;

    const selectDropdown = (
        <select className="select" onChange={onSelectChange} value={selectValue}>
            <option value="" disabled>
                {t(($) => $.select_value)}
            </option>
            {values.map((v) => {
                const primitive = isPrimitive(v);
                return (
                    <option key={primitive ? v : v.name} value={primitive ? v : v.value}>
                        {primitive ? v : v.name}
                    </option>
                );
            })}
        </select>
    );

    const buttonGrid = (compareValue: unknown) => (
        <div className="flex flex-row flex-wrap gap-1">
            {values.map((v) => {
                const primitive = isPrimitive(v);
                const itemValue = primitive ? v : v.value;
                const current = itemValue === compareValue;
                return (
                    <Button<ValueWithLabelOrPrimitive>
                        key={primitive ? v : v.name}
                        className={`btn btn-outline btn-primary btn-sm join-item${current ? " btn-active" : ""}`}
                        onClick={onButtonClick}
                        item={primitive ? v : v.value}
                        title={primitive ? `${v}` : v.description}
                    >
                        {primitive ? <DisplayValue value={v} name="" /> : v.name}
                    </Button>
                );
            })}
        </div>
    );

    // Controlled mode - parent manages feedback
    if (controlled) {
        return minimal ? selectDropdown : buttonGrid(currentValueForComparison);
    }

    // Standalone mode with command feedback
    return <div className="flex flex-row items-center gap-2">{minimal ? selectDropdown : buttonGrid(selectedValue)}</div>;
});

export default EnumEditor;
