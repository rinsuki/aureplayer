import React, { useEffect, useState } from "react"
import { render } from "react-dom"
import pako, { gzip } from "pako"
import msgpack from "msgpack-lite"
import { App } from "./components/app"
import { Data, DataContext, ResConfig, ResConfigContext } from "./types"
import { COLORS, replaceToHQURL, WINDOWS_REPLAYER_URL } from "./const"

enum LoadState {
    FETCH = 0,
    DOWNLOADING = 1,
    DEFLATE = 2,
    MSGPACK_DECODE = 3,
    SUCCESS = 4,
}

function Loader() {
    const [loadState, setLoadState] = useState(LoadState.FETCH)
    const [data, setData] = useState<Data | undefined>(undefined)
    const [resConfig, setResConfig] = useState<ResConfig | undefined>(undefined)
    useEffect(() => {
        Promise.all([
            fetch("./replay.msgpack.gz").then(async r => {
                if (r.status >= 400) throw `Server returned invalid status code (${r.status})`
                setLoadState(LoadState.DOWNLOADING)
                const gzippedData = await r.arrayBuffer()
                setLoadState(LoadState.DEFLATE)
                const msgpackData = pako.inflate(new Uint8Array(gzippedData))
                console.log(`Inflate ${gzippedData.byteLength} bytes -> ${msgpackData.byteLength} bytes (${msgpackData.byteLength/gzippedData.byteLength}x)`)
                setLoadState(LoadState.MSGPACK_DECODE)
                const res = msgpack.decode(msgpackData)
                setLoadState(LoadState.SUCCESS)
                console.log(res)
                // preload images
                return res as Data
            }),
            fetch(WINDOWS_REPLAYER_URL+replaceToHQURL("res/config.json")).then(r => {
                if (r.status >= 400) throw `ResConfig Server returned invalid status code(${r.status})`
                return r.json() as Promise<ResConfig>
            }),
        ])
        .then(([data, resConfig]) => {
            preloader(data, resConfig)
            setTimeout(() => {
                setData(data)
                setResConfig(resConfig)
            }, 1)
        })
        .catch(e => {
            alert(e)
        })
    }, [])
    if (data == null || resConfig == null) {
        return <div>Loading... (state: {loadState})</div>
    }
    return <DataContext.Provider value={data}>
        <ResConfigContext.Provider value={resConfig}>
            <App />
        </ResConfigContext.Provider>
    </DataContext.Provider>
}

function preloader(res: Data, resConfig: ResConfig) {
    const images = []
    for (const player of res.players) {
        const i = COLORS.indexOf(player.color)
        images.push(`${WINDOWS_REPLAYER_URL}res/player/${i}.png`)
        if (player.dead_at != null) {
            images.push(`${WINDOWS_REPLAYER_URL}res/body/${i}.png`)
            images.push(`${WINDOWS_REPLAYER_URL}res/ghost/${i}.png`)
        }
    }
    images.push(WINDOWS_REPLAYER_URL + replaceToHQURL(resConfig.maps[res.settings.map].path))
    for (const image of images) {
        const l = document.createElement("link")
        l.rel = "preload"
        l.as = "image"
        l.href = image
        document.head.appendChild(l)
    }
}
render(<Loader />, document.getElementById("app"))