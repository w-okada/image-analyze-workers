import { makeStyles, FormControl, InputLabel, Select, MenuItem, Switch, Slider, Button, Typography } from "@material-ui/core";
import React, { FC, useMemo, useState } from "react";
import { VideoInputType } from "../const";

const useStyles = makeStyles((theme) => ({
    formControl: {
      margin: theme.spacing(1),
      minWidth: 120,
      maxWidth: 240,
      display:"flex",
      justifyContent:"space-between",
    },
    horizontalSpacer: {
        width:30
    },
    verticalSpacer: {
        height:3
    },
    inputButton:{
        width:100,
        alignSelf: "flex-end"
    },
}));

interface DropDownProps  {
    title:string
    current:string, 
    options:{ [name: string]: any }
    onchange:(newKey: string) => void
}

export const DropDown:FC<DropDownProps> = ({title, current, options, onchange}) => {
    const classes = useStyles();
    const form = useMemo(()=>{
        console.log("[DropDown] render!", title)
        return(
            <FormControl className={classes.formControl}>
                <InputLabel>{title}</InputLabel>
                <Select
                    value={current}
                    onChange={(e:any)=>{onchange(e.target.value)}}
                >
                    {Object.keys(options).map(k =>{
                        return <MenuItem key={k} value={k}>{k}</MenuItem>
                    })}
                </Select>
            </FormControl>
        )
    },[current])
    return (
        <> 
            {form}
        </>
    )
}

interface SwitchProps{
    title:string
    current:boolean
    onchange:(newVal:boolean) => void
}

export const Toggle:FC<SwitchProps> = ({title, current, onchange}) =>{
    const classes = useStyles();
    const form = useMemo(()=>{
        console.log("[Toggle] render!", title)
        return(
            <div className={classes.formControl} >
                <Typography gutterBottom> {`${title}`} </Typography>
                <Switch
                checked={current}
                onChange={(e:any)=>onchange(e.target.checked)}
                name={title}
                color="primary"
            />
            </div>
        )
    },[current])
    return(
        <>
            {form}
        </>
    )
}

interface SingleValueSliderProps{
    title:string
    current:number
    min:number
    max:number
    step:number
    onchange:(newVal:number) => void
}

export const SingleValueSlider:FC<SingleValueSliderProps> = ({title, current, min, max, step, onchange}) =>{
    const classes = useStyles();
    const form = useMemo(()=>{
        console.log("[ingleValueSlider] render!", title)
        return(
            <div className={classes.formControl} >
                <Typography gutterBottom> {`${title}[${current.toFixed(1)}]`} </Typography>
                <div className={classes.horizontalSpacer}/>
                <Slider
                    valueLabelDisplay="auto"
                    step={step}
                    min={min}
                    max={max}
                    value={current}
                    onChange={(e:any, newVal:number|number[])=>{onchange(newVal as number)}}
                />
            </div>
        )

    }, [current])

    return(
        <>
            {form}
        </>
    )
}



interface VideoInputSelectProps{
    title:string
    current:string
    options:{ [name: string]: any }
    onchange:(newKey: VideoInputType, input:MediaStream|string) => void
}

export const VideoInputSelect:FC<VideoInputSelectProps> = ({title, current, options, onchange}) => {
    type TargetType = "File" | "Window" | "Camera"

    const classes = useStyles();
    const [targetType, setTargetType] = useState<TargetType>("File")
    const [targetCamera, setTargetCamera] = useState<string>()
    const form = useMemo(()=>{
        console.log("[VideoInputSelect] render!", title)
        // const targetTypeList = ["Camera", "File", "Window"]
        const videoInputList = Object.keys(options)
        videoInputList.push("File")
        videoInputList.push("Window")
        const onchangeInternal = (val:string) =>{
            if(val === "File"){
                setTargetType("File")
            }else if(val === "Window"){
                setTargetType("Window")
            }else{
                setTargetType("Camera")
                navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        deviceId: options[val],
                    }
                }).then(media => {
                    setTargetCamera(val)
                    onchange("STREAM", media)

                })                
            }
        }

        const onFileClicked = () => {
            const inputElem = document.createElement("input")
            inputElem.type="file"
            inputElem.onchange = () =>{
                if(!inputElem.files){
                    return
                }
                if(inputElem.files.length >0){
                    const path = URL.createObjectURL(inputElem.files[0]);
                    const fileType = inputElem.files[0].type
                    if(fileType.startsWith("image")){
                        onchange("IMAGE", path)
                    }else if(fileType.startsWith("video")){
                        onchange("MOVIE", path)
                    }else{
                        console.log("[App] unknwon file type", fileType)
                    }
                }
            } 
            inputElem.click()
        }

        const onWindowClicked = () => {
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/31821
            navigator.mediaDevices.getDisplayMedia().then(media => {
                onchange("STREAM", media)
            })
        }

        return(
            <FormControl className={classes.formControl}>
                <InputLabel>{title}</InputLabel>
                <Select
                    value={targetType === "Camera" ? targetCamera : targetType ? targetType.toString():"Camera"}
                    onChange={(e:any)=>{onchangeInternal(e.target.value)}}
                >
                    {videoInputList.map(k =>{
                        return <MenuItem key={k} value={k}>{k}</MenuItem>
                    })}
                </Select>
                <div className={classes.verticalSpacer}/>
                {
                    targetType==="File" ? <Button variant="outlined" color="primary" className={classes.inputButton} onClick={onFileClicked}>File</Button>:<></>
                }
                {
                    targetType==="Window" ? <Button variant="outlined" color="primary" className={classes.inputButton}  onClick={onWindowClicked}>Window</Button>:<></>
                }
            </FormControl>
        )
    }, [current, targetType, options, targetCamera])
    return (
        <> 
            {form}
        </>
    )
}
