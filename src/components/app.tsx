import React, { Fragment, useContext } from "react"
import { Events } from "./event"
import "./app.scss"
import { Controls } from "./controls"
import { Map } from "./map"

export function App() {
    return <div className="app">
        <div className="main">
            <Map />
            <Controls />
        </div>
        <Events />
    </div>
}