import React, { Fragment, useContext } from "react"
import { COLORS, WINDOWS_REPLAYER_URL } from "../const"
import { state } from "../state"
import { Data, DataContext, DataEvent, DataPlayer, endReasonToString } from "../types"
import "./event.scss"

const Player: React.FC<{id: number, timestamp: number}> = ({id, timestamp}) => {
    const data = useContext(DataContext)
    const player = data.players[id]
    if (player == null) return <>{`Invalid Player ID: ${id}`}</>
    const isImpostor = data.impostors.includes(id)
    const isDead = player.dead_at == null ? false : player.dead_at < timestamp
    return <span data-color={player.color} className={`player ${isImpostor ? "player-impostor" : "player-crewmate"}`}>
        <img className="player-icon" src={`${WINDOWS_REPLAYER_URL}res/${isDead ? "ghost" : "player"}/${COLORS.indexOf(player.color)}.png`} alt={player.color} title={player.color}/>
        <span className="player-name">{player.name}</span>
    </span>
}

const TimestampLink: React.FC<{timestamp: number}> = ({timestamp}) => {
    return <a href="#" className="timestamp-link" onClick={e => {
        e.preventDefault()
        state.absoluteSeek(timestamp - 1)
    }}>{Math.floor(timestamp / 60)}:{Math.floor(timestamp % 60).toString().padStart(2, "0")}</a>
}

const EventContent: React.FC<{event: DataEvent}> = ({event}) => {
    const data = useContext(DataContext)
    switch (event.type) {
    case "kill":
        return <div className="event event-kill">
            <TimestampLink timestamp={event.timestamp} />
            <Player id={event.imposter} timestamp={event.timestamp} /> が <Player id={event.victim} timestamp={event.timestamp} /> をキル
        </div>
    case "enter_vent":
        return <div className="event event-enter-vent">
            <TimestampLink timestamp={event.timestamp} />
            <Player id={event.player} timestamp={event.timestamp} /> がベント入り
        </div>
    case "exit_vent":
        return <div className="event event-exit-vent">
            <TimestampLink timestamp={event.timestamp} />
            <Player id={event.player} timestamp={event.timestamp} /> がベント退出
        </div>
    case "start_meeting":
        return <div className="event event-start-meeting">
            <TimestampLink timestamp={event.timestamp} />
            <Player id={event.player} timestamp={event.timestamp} /> がミーティング開始 ({
                event.dead_body == null
                ? "エマージェンシーボタン"
                : <><Player id={event.dead_body} timestamp={event.timestamp} />の死体を発見</>
            })
        </div>
    case "vote_finish":
        return <div className="event event-vote-finish">
            <TimestampLink timestamp={event.timestamp} />
            <table>
                <colgroup>
                    <col span={1} style={{width: "50%"}} />
                    <col span={1} style={{width: "50%"}} />
                </colgroup>
                <thead><tr><th colSpan={2}>投票終了！</th></tr></thead>
                <tfoot><tr><th colSpan={2}><strong>{event.exiled == null ? (event.is_tie ? "スキップ (同数票のため)" : "スキップ") : <>
                    <Player id={event.exiled} timestamp={event.timestamp} />を処刑
                </>}</strong></th></tr></tfoot>
                <tbody>
                {...event.states.map((state, player_id) => {
                    if (state.is_dead) return null
                    return <tr key={player_id}>
                        <td><Player id={player_id} timestamp={event.timestamp} /></td>
                        <td>{state.voted_for != null ? <Player id={state.voted_for} timestamp={event.timestamp} /> : "スキップ"}</td>
                    </tr>
                })}
                </tbody>
            </table>
        </div>
    case "voted":
        return <div className="event-voted"></div>
    case "chat":
        return <div className="event event-chat">
            <TimestampLink timestamp={event.timestamp} />
            <Player id={event.player} timestamp={event.timestamp} />: {event.text}
        </div>
    default:
        return <div>{JSON.stringify(event)}</div>
    }
    return null
}

export const Events: React.FC<{}> = () => {
    const data = useContext(DataContext)
    return <div className="events">
        <div className="event-start">{new Date(data.started_at * 1000).toLocaleString()}に開始</div>
        <div className="members">
            <p>インポスター ({data.impostors.length}):</p>
            {...data.impostors.map(i => <Player id={i} timestamp={0}/>)}
            <p>クルーメイト ({data.players.length - data.impostors.length}):</p>
            {...data.players.map((_, i) => data.impostors.includes(i) ? null : <Player id={i} timestamp={0}/>)}
            <p>の計{data.players.length}人でスタート</p>
        </div>
        {data.events.map((event, i) => {
            const beforeTimestamp = i === 0 ? 0 : data.events[i-1].timestamp
            const diff = Math.floor(event.timestamp - beforeTimestamp)
            return <Fragment key={i}>
                {diff > 1 && <div className="event-time-margin" style={{marginTop: `${diff}px`}} />}
                <EventContent event={event}/>
            </Fragment>
        })}
        <div className="evnet-end-game">
            <p><strong>{endReasonToString(data.end_reason)}</strong>でゲーム終了！</p>
            <p>所要時間: {Math.floor(data.duration / 60)}分{Math.floor(data.duration % 60).toString().padStart(2, "0")}秒</p>
        </div>
    </div>
}