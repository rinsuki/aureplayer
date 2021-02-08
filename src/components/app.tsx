import React, { Fragment, useContext } from "react"
import { Events } from "./event"
import "./app.scss"
import { Controls } from "./controls"
import { GameMap } from "./map"

export function App() {
    return <div className="app">
        <div className="main">
            <GameMap />
            <Controls />
        </div>
        <Events />
    </div>
}