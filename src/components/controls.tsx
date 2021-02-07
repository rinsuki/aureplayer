import React, { useMemo } from "react"
import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { DataContext } from "../types";
import "./controls.scss"
import { state } from "../state";

function secondsToString(seconds: number) {
    const minute = Math.floor(seconds/60).toString().padStart(2, "0")
    const second = Math.floor(seconds%60).toString().padStart(2, "0")
    return `${minute}:${second}`
}

export const Controls = observer(() => {
    const data = useContext(DataContext)
    state.duration = data.duration

    const meetings = useMemo(() => {
        let meetings: {start: number, end: number}[] = []
        let lastMeetingStartedAt = 0
        for (const event of data.events) {
            if (event.type === "start_meeting") {
                lastMeetingStartedAt = event.timestamp
            } else if (event.type === "vote_finish") {
                meetings.push({
                    start: lastMeetingStartedAt,
                    end: event.timestamp,
                })
            }
        }
        console.log(meetings)
        return meetings
    }, [data.events])

    return <div className="controls">
        <div className="seekbar">
            <div className="now" style={{width: `${(state.currentSeconds * 100)/ data.duration}%`}} />
            {...meetings.map(meeting => {
                return <div className="meeting" key={`${meeting.start}-${meeting.end}`} style={{
                    left: `${(meeting.start * 100)/data.duration}%`,
                    width: `${((meeting.end-meeting.start)*100)/data.duration}%`
                }} />
            })}
        </div>
        <div className="buttons">
            <div className="left">
                <button onClick={() => { state.playing = !state.playing }}>
                    {state.playing ? "Pause" : "Play"}
                </button>
            </div>
            <div className="center">
                {secondsToString(state.currentSeconds)} / {secondsToString(data.duration)}
            </div>
            <div className="right">

            </div>
        </div>
    </div>
})