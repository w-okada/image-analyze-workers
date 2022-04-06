import React from "react";
import { useMemo } from "react";

export type CommonSelectorProps<T extends string | number> = {
    id: string;
    title: string;
    currentValue: string;
    options: { [label: string]: T };
    onChange: (value: T) => void;
};
export const CommonSelector = <T extends string | number>(props: CommonSelectorProps<T>) => {
    const onChange = (value: T) => {
        props.onChange(value);
    };
    const select = useMemo(() => {
        const options = Object.keys(props.options).map((x) => {
            const value = props.options[x];
            return (
                <option key={value} value={value}>
                    {x}
                </option>
            );
        });
        return (
            <div>
                <p className="text-slate-600" style={{ fontSize: "0.75rem" }}>
                    {props.title}
                </p>
                <select
                    className="select select-bordered select-sm w-full max-w-xs"
                    onChange={(val: React.ChangeEvent<HTMLSelectElement>) => {
                        onChange(val.currentTarget.value as T);
                    }}
                    value={props.currentValue}
                >
                    {options}
                </select>
            </div>
        );
    }, [props]);
    return select;
};
