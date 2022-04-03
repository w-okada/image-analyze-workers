import React from "react";
import { useMemo } from "react";

export type CommonSwitchProps = {
    id: string;
    title: string;
    currentValue: boolean;
    onChange: (value: boolean) => void;
};
export const CommonSwitch = (props: CommonSwitchProps) => {
    const onChange = () => {
        props.onChange(!props.currentValue);
    };
    const select = useMemo(() => {
        return (
            <div>
                <p className="text-slate-600" style={{ fontSize: "0.75rem" }}>
                    {props.title}
                </p>
                <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={props.currentValue}
                    onChange={() => {
                        onChange();
                    }}
                ></input>
            </div>
        );
    }, [props]);
    return select;
};
