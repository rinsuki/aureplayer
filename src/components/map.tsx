import { observer } from "mobx-react-lite"
import React, { useContext, useEffect, useMemo, useRef, useState } from "react"
import { COLORS, replaceToHQURL, WINDOWS_REPLAYER_URL } from "../const"
import { state } from "../state"
import { DataContext, DataMove, DataPlayer, ResConfigContext, ResConfigMap } from "../types"
import "./map.scss"

function useCanvas(callback: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void, moreDeps: any[] = []) {
    const [canvas, setCanvas] = useState<HTMLCanvasElement>()
    const [ctx, setCtx] = useState<CanvasRenderingContext2D>()
    useEffect(() => {
        if (canvas == null || ctx == null) return
        let stop = false
        function loop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
            if (stop) return
            requestAnimationFrame(() => loop(canvas, ctx))
            callback(canvas, ctx)
        }
        loop(canvas, ctx)
        return () => {
            stop = true
        }
    }, [canvas, ctx, ...moreDeps])
    return (canvas: HTMLCanvasElement | undefined | null) => {
        setCanvas(canvas ?? undefined)
        setCtx(canvas?.getContext("2d") ?? undefined)
    }
}

function usePosConverter(resMap: ResConfigMap) {
    return useMemo(() => {
        const gameSize = [
            resMap.calibration.game_pos[1][0] - resMap.calibration.game_pos[0][0],
            resMap.calibration.game_pos[1][1] - resMap.calibration.game_pos[0][1],
        ]
        const texSize = [
            resMap.calibration.texture_pos[1][0] - resMap.calibration.texture_pos[0][0],
            resMap.calibration.texture_pos[1][1] - resMap.calibration.texture_pos[0][1],
        ]
        const scale = [texSize[0]/gameSize[0], texSize[1]/gameSize[1]]
        const shift = [
            resMap.calibration.texture_pos[0][0] - resMap.calibration.game_pos[0][0] * scale[0],
            resMap.calibration.texture_pos[0][1] - resMap.calibration.game_pos[0][1] * scale[1],
        ]
        return ({x, y}: {x: number, y: number}) => {
            return {
                x: x * scale[0] + shift[0],
                y: y * scale[1] + shift[1]
            }
        }
    }, [...resMap.calibration.texture_pos, ...resMap.calibration.game_pos])
}

const images = new Map<string, HTMLImageElement>()
function getImage(path: string) {
    const existed = images.get(path)
    if (existed != null) return existed
    const image = new Image()
    image.src = `${WINDOWS_REPLAYER_URL}${path.includes("maps") ? replaceToHQURL(path) : path}`
    images.set(path, image)
    return image
}

function useMap() {
    const data = useContext(DataContext)
    const resConfig = useContext(ResConfigContext)
    const resMap = resConfig.maps[data.settings.map]
    const canvasState = useRef({
        x: 100,
        y: 100,
        scale: 1,
        drag: null as ({
            x: number,
            y: number,
        } | null),
        drawCount: 0,
        fps: 0,
    })
    getImage(resMap.path).onload = e => {
        const img = e.target as HTMLImageElement
        canvasState.current.scale = window.innerWidth / img.width
    }
    const [pixelRatio, setPixelRatio] = useState(devicePixelRatio)
    const posConverter = usePosConverter(resMap)
    useEffect(() => {
        const timer = setInterval(() => {
            canvasState.current.fps = canvasState.current.drawCount
            canvasState.current.drawCount = 0
        }, 1000)
        return () => {
            clearInterval(timer)
        }
    }, [])

    return [
        useCanvas((canvas, ctx) => {
            if (pixelRatio !== devicePixelRatio) setPixelRatio(devicePixelRatio)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const s = canvasState.current
            // マップ描画
            const mapImage = getImage(resMap.path)
            s.scale = Math.max(0.1, Math.min(5, s.scale))
            if (isNaN(s.x)) s.x = 0
            if (isNaN(s.y)) s.y = 0
            s.x = Math.min(canvas.width / pixelRatio / 2, Math.max(s.x, (-mapImage.width * s.scale) + (canvas.width / pixelRatio / 2)))
            s.y = Math.min(canvas.height / pixelRatio / 2, Math.max(s.y, (-mapImage.height * s.scale) + (canvas.height / pixelRatio / 2)))
            ctx.drawImage(mapImage, s.x * pixelRatio, s.y * pixelRatio, mapImage.width * s.scale * pixelRatio, mapImage.height * s.scale * pixelRatio)
            // プレーヤー描画
            for (const [id, player] of data.players.entries()) {
                let position = {
                    x: 0,
                    y: 0
                }
                let lastMove: DataMove | undefined
                let deadTimestamp = 0
                for (const move of data.moves) {
                    if (move.player !== id) continue
                    if (move.timestamp > state.currentSeconds) break
                    if (lastMove != null && move.seq < lastMove.seq) continue
                    lastMove = move
                }
                if (lastMove != null) {
                    const second = (state.currentSeconds - lastMove.timestamp)
                    position.x = lastMove.position.x + lastMove.velocity.x * second
                    position.y = lastMove.position.y + lastMove.velocity.y * second
                }
                const isDead = player.dead_at != null && player.dead_at < state.currentSeconds
                ctx.globalAlpha = isDead ? 0.5 : 1

                position = posConverter(position)

                const image = getImage(`res/${isDead ? "ghost" : "player"}/${COLORS.indexOf(player.color)}.png`)
                const width = (isDead ? resMap.ghost_pixel_width : resMap.body_pixel_width) * s.scale * pixelRatio
                const height = image.width ? width * (image.height / image.width) : 1
                ctx.drawImage(
                    image,
                    ((s.x + (position.x * s.scale)) * pixelRatio) - (width / 2),
                    ((s.y + (position.y * s.scale)) * pixelRatio) - height,
                    width, height,
                )
                ctx.fillStyle = data.impostors.includes(id) ? "red" : "white"
                ctx.font = `${15*pixelRatio}px sans-serif`
                const metrics = ctx.measureText(player.name)
                ctx.fillText(
                    player.name,
                    ((s.x + (position.x * s.scale)) * pixelRatio) - metrics.width / 2,
                    // actualBoundingBoxDescent を引かないと y の下とかがはみ出る
                    ((s.y + (position.y * s.scale)) * pixelRatio) - height - metrics.actualBoundingBoxDescent 
                )
                ctx.globalAlpha = 1
            }
            // stats描画
            ctx.fillStyle = "white"
            ctx.font = `${10*pixelRatio}px monospace`
            ctx.fillText(`x=${s.x}`, 0, 10 * pixelRatio)
            ctx.fillText(`y=${s.y}`, 0, 20 * pixelRatio)
            ctx.fillText(`scale=${s.scale}`, 0, 30 * pixelRatio)
            ctx.fillText(`pixelRatio=${pixelRatio}`, 0, 40 * pixelRatio)
            ctx.fillText(`fps=${s.fps}`, 0, 50 * pixelRatio)
            s.drawCount++
        }, [
            pixelRatio,
            posConverter,
            resMap.path,
        ]),
        canvasState,
        pixelRatio,
    ] as const
}

export const GameMap = observer(() => {
    const [wrapper, setWrapper] = useState<HTMLDivElement>()
    const [{width, height}, setSize] = useState({width: 0, height: 0})
    const [setCanvas, state, pixelRatio] = useMap()
    useEffect(() => {
        if (wrapper == null) return
        const observer = new ResizeObserver(entries => {
            const size = entries[0].contentRect
            setSize({
                width: size.width,
                height: size.height,
            })
        })
        observer.observe(wrapper)
        return () => {
            observer.disconnect()
        }
    }, [wrapper])

    return <div ref={wrapper => setWrapper(wrapper ?? undefined)} className="map" style={{overflow: "hidden"}}>
        <canvas
            ref={setCanvas}
            width={width * devicePixelRatio}
            height={height * devicePixelRatio}
            style={{position: "absolute", width: `${width}px`, height: `${height}px`, cursor: "grab"}}

            onWheel = {e => {
                const scaleStep = Math.max(-0.05, Math.min(0.05, -(e.deltaY * 0.01)))
                const oldScale = state.current.scale
                state.current.scale = oldScale + scaleStep
                state.current.x -= ((e.nativeEvent.offsetX - state.current.x) / oldScale) * scaleStep
                state.current.y -= ((e.nativeEvent.offsetY - state.current.y) / oldScale) * scaleStep
            }}
            onPointerDown = {e => {
                state.current.drag = {
                    x: e.screenX,
                    y: e.screenY,
                }
                e.currentTarget.style.cursor = "grabbing"
                e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerUp = {e => {
                e.currentTarget.style.cursor = "grab"
                state.current.drag = null
            }}
            onPointerMove = {e => {
                const { drag } = state.current
                if (drag == null) return
                // HEEEEEY WebKit team, please, please enable e.movementX/Y in pointermove event?
                // Thanks
                state.current.x += e.screenX - drag.x
                state.current.y += e.screenY - drag.y
                drag.x = e.screenX
                drag.y = e.screenY
            }}
        />
    </div>
})