import { observer } from "mobx-react-lite"
import React, { useContext, useMemo } from "react"
import { COLORS, replaceToHQURL, WINDOWS_REPLAYER_URL } from "../const"
import { state } from "../state"
import { DataContext, DataMove, DataPlayer, ResConfigContext } from "../types"
import "./map.scss"
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch"

const Player = observer<{player: DataPlayer, id: number}>(({player, id}) => {
    const data = useContext(DataContext)
    const resConfig = useContext(ResConfigContext)
    const resMap = resConfig.maps[data.settings.map]
    const mymoves = useMemo(() => {
        return data.moves.filter(move => move.player === id)
    }, [id])
    const position = {
        x: 0,
        y: 0
    }
    let lastMove: DataMove | undefined
    let deadTimestamp = 0
    for (const move of mymoves) {
        if (move.timestamp > state.currentSeconds) break
        if (lastMove != null && move.seq < lastMove.seq) continue
        lastMove = move
    }
    if (lastMove != null) {
        const second = (state.currentSeconds - lastMove.timestamp)
        position.x = lastMove.position.x + lastMove.velocity.x * second
        position.y = lastMove.position.y + lastMove.velocity.y * second
    }

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

    const isDead = player.dead_at != null && player.dead_at < state.currentSeconds

    return <div className="player" style={{top: `${position.y * scale[1] + shift[1]}px`, left: `${position.x * scale[0] + shift[0] - 22}px`, opacity: isDead ? 0.5 : 1}}>
        <div style={{position: "absolute", bottom: 0}}>
            <div style={{fontSize: "4em", color: "white"}}>{player.name}</div>
            <img src={`${WINDOWS_REPLAYER_URL}res/${isDead ? "ghost" : "player"}/${COLORS.indexOf(player.color)}.png`} style={{width: "44px"}}/>
        </div>
    </div>
})

export const Map = observer(() => {
    const data = useContext(DataContext)
    const resConfig = useContext(ResConfigContext)
    const resMap = resConfig.maps[data.settings.map]

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

    return <div className="map" style={{contain: "strict"}}>
        <TransformWrapper
            defaultScale = {0.25}
            defaultPositionX={0}
            defaultPositionY={0}
            options = {{
                minScale: 0.1,
                maxScale: 4,
                limitToBounds: false,
                limitToWrapper: false,
            }}
        >
            <TransformComponent>
                <>
                    <img src={WINDOWS_REPLAYER_URL + replaceToHQURL(resMap.path)}/>
                    {...data.players.map((player, id) => <Player key={id} player={player} id={id} />)}
                </>
            </TransformComponent>
        </TransformWrapper>
    </div>
})