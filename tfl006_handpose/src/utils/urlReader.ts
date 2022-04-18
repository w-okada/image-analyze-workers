export const loadURLAsDataURL = async (path: string) => {
    const res = await fetch(path);
    const b = await res.blob();

    const reader = new FileReader();
    const p = new Promise<string>((resolve, _reject) => {
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.readAsDataURL(b);
    });
    return await p;
};

export const DataTypesOfDataURL = {
    video: "video",
    image: "image",
    unknown: "unknown",
} as const;
export type DataTypesOfDataURL = typeof DataTypesOfDataURL[keyof typeof DataTypesOfDataURL];

export const getDataTypeOfDataURL = (data: string) => {
    const prefix = data.split(";")[0];
    if (prefix.includes("video")) {
        return DataTypesOfDataURL.video;
    } else if (prefix.includes("image")) {
        return DataTypesOfDataURL.image;
    } else {
        return DataTypesOfDataURL.unknown;
    }
};
