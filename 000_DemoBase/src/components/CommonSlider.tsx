import React from "react";
import { useMemo } from "react";

export type CommonSliderProps = {
    id: string;
    title: string;
    currentValue: number;
    max: number;
    min: number;
    step: number;
    integer: boolean;
    width?: string;
    onChange: (value: number) => void;
};
export const CommonSlider = (props: CommonSliderProps) => {
    const onChange = (val: number) => {
        props.onChange(val);
    };
    const select = useMemo(() => {
        return (
            <div>
                <p className="text-slate-600" style={{ fontSize: "0.75rem" }}>
                    {props.title} [{props.currentValue}]
                </p>
                <input
                    type="range"
                    className="range range-sm"
                    min={props.min}
                    max={props.max}
                    value={props.currentValue}
                    step={props.step}
                    onChange={(val: React.ChangeEvent<HTMLInputElement>) => {
                        if (props.integer) {
                            onChange(parseInt(val.target.value));
                        } else {
                            onChange(parseFloat(val.target.value));
                        }
                    }}
                    style={{ width: props.width ? props.width : "100%" }}
                ></input>
            </div>
        );
    }, [props]);
    return select;
};
