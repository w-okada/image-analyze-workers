import React, { useMemo } from "react";

// @ts-ignore
import homepage from "../../resources/logos/home.svg";
// @ts-ignore
import github from "../../resources/logos/github.svg";
// @ts-ignore
import twitter from "../../resources/logos/twitter.svg";
// @ts-ignore
import linkedin from "../../resources/logos/linkedin.svg";

// @ts-ignore
import blog from "../../resources/logos/file-text.svg";

export type CreditProps = {
    title?: string;
    homepage?: string;
    github?: string;
    twitter?: string;
    linkedin?: string;
    blog?: string;
};

export type LinkIconProps = {
    tooltip: string;
    icon: string;
    url: string;
};

const LinkIcon = (props: LinkIconProps) => {
    return (
        <div className="tooltip tooltip-bottom" data-tip={props.tooltip}>
            <a className="link" href={props.url} target="_blank" rel="noopener noreferrer">
                <img src={props.icon}></img>
            </a>
        </div>
    );
};

const creditProps: CreditProps = {
    title: "Created by w-okada. FLECT, Co., Ltd.",
    homepage: "https://www.flect.co.jp/",
    github: "https://github.com/w-okada/image-analyze-workers",
    twitter: "https://twitter.com/DannadoriYellow",
    linkedin: "https://www.linkedin.com/in/068a68187/",
    blog: "https://medium.com/@dannadori",
};

export const Credit = (props: CreditProps = creditProps) => {
    // const props = creditProps;
    const homepageIcon = props.homepage ? (
        useMemo(() => {
            return <LinkIcon tooltip="homepage" icon={homepage} url={props.homepage!} />;
        }, [])
    ) : (
        <></>
    );

    const githubIcon = props.github ? (
        useMemo(() => {
            return <LinkIcon tooltip="github" icon={github} url={props.github!} />;
        }, [])
    ) : (
        <></>
    );
    const twitterIcon = props.twitter ? (
        useMemo(() => {
            return <LinkIcon tooltip="twitter" icon={twitter} url={props.twitter!} />;
        }, [])
    ) : (
        <></>
    );
    const linkedInIcon = props.linkedin ? (
        useMemo(() => {
            return <LinkIcon tooltip="linkedin" icon={linkedin} url={props.linkedin!} />;
        }, [])
    ) : (
        <></>
    );
    const blogIcon = props.blog ? (
        useMemo(() => {
            return <LinkIcon tooltip="blog" icon={blog} url={props.blog!} />;
        }, [])
    ) : (
        <></>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", margin: "5px" }}>
            <div>
                <p className="text-slate-600" style={{ fontSize: "0.75rem" }}>
                    {props.title}
                </p>
            </div>
            <div style={{ display: "flex", margin: "5px" }}>
                <div style={{ margin: "2px" }}>{homepageIcon}</div>
                <div style={{ margin: "2px" }}>{githubIcon}</div>
                <div style={{ margin: "2px" }}>{twitterIcon}</div>
                <div style={{ margin: "2px" }}>{linkedInIcon}</div>
                <div style={{ margin: "2px" }}>{blogIcon}</div>
            </div>
        </div>
    );
};
