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

async function getReplayURL() {
    const params = new URL(location.href).searchParams
    switch (params.get("server")) {
    case "cdn.rinsuki.net": {
        const ver = params.get("v")
        if (ver !== "1") throw `invalid v`
        const id = params.get("id")
        if (id == null) throw `id is invalid`
        const result = /^([a-z0-9]{1,20})\.(2[0-9]{3})([0-9]{2})([0-9]{2})\.([0-9]{6}\.[0-9a-f]{8})$/.exec(id)
        if (result == null) throw `id is invalid`
        const [_, user, year, month, day] = result
        return `https://cdn.rinsuki.net/internal/aureplayer/v${ver}/${user}/${year}/${month}/${day}/replay.v${ver}.${id}.msgpack.gz`
    }
    case "local":
        return "replay.msgpack.gz"
    case "input-file":
        return await new Promise<string>(resolve => {
            const input = document.createElement("input")
            document.body.appendChild(input)
            input.style.position = "fixed"
            input.style.left = "0"
            input.style.top = "0"
            input.style.width = "100%"
            input.style.height = "100%"
            input.style.background = "white"
            input.type = "file"
            input.onchange = async e => {
                input.remove()
                resolve(URL.createObjectURL(new Blob([await input.files!.item(0)!.arrayBuffer()])))
            }
            input.click()
        })
    default:
        throw "unknown server"
    }
}

function Loader() {
    const [loadState, setLoadState] = useState(LoadState.FETCH)
    const [data, setData] = useState<Data | undefined>(undefined)
    const [resConfig, setResConfig] = useState<ResConfig | undefined>(undefined)
    useEffect(() => {
        Promise.all([
            getReplayURL().then(url => fetch(url)).then(async r => {
                if (r.status >= 400) throw `Server returned invalid status code (${r.status})`
                setLoadState(LoadState.DOWNLOADING)
                const gzippedData = await r.arrayBuffer()
                setLoadState(LoadState.DEFLATE)
                async function decode() {
                    if (new Uint8Array(gzippedData)[0] == "{".charCodeAt(0)) { // json
                        return JSON.parse(new TextDecoder().decode(gzippedData))
                    } else { // msgpack
                        const msgpackData = pako.inflate(new Uint8Array(gzippedData))
                        console.log(`Inflate ${gzippedData.byteLength} bytes -> ${msgpackData.byteLength} bytes (${msgpackData.byteLength/gzippedData.byteLength}x)`)
                        setLoadState(LoadState.MSGPACK_DECODE)
                        return msgpack.decode(msgpackData)
                    }
                }
                const res = await decode()
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