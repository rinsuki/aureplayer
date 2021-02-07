import { createContext } from "react"

export type DataEvent = { timestamp: number } & ({
    type: "kill",
    imposter: number,
    victim: number,
} | {
    type: "enter_vent" | "exit_vent",
    player: number,
    vent_id: number,
} | {
    type: "start_meeting",
    player: number,
    dead_body: number | null,
} | {
    type: "voted",
    player: number,
} | {
    type: "vote_finish",
    is_tie: boolean,
    exiled: number | null,
    states: {
        did_report: boolean,
        did_vote: boolean,
        is_dead: boolean,
        voted_for: number | null,
    }[]
} | {
    type: "chat",
    player: number,
    text: string,
    is_dead: boolean,
})

export type DataColor = "Red" | "Blue" | "Green" | "Pink" | "Orange" | "Yellow" | "Grey" | "White" | "Purple" | "Brown" | "Cyan" | "LightGreen"

export interface DataPlayer {
    name: string
    color: DataColor
    dead_at: number | null
}

export type DataEndReason = "CREWMATES_BY_VOTE" | "CREWMATES_BY_TASK" | "IMPOSTORS_BY_VOTE" | "IMPOSTORS_BY_KILL" | "IMPOSTORS_BY_SABOTAGE" | "IMPOSTOR_DISCONNECT" | "CREWMATE_DISCONNECT"

export interface DataMove {
    type: "normal" | "vents"
    player: number
    seq: number
    timestamp: number
    position: {x: number, y: number}
    velocity: {x: number, y: number}
}

export interface Data {
    id: string
    events: DataEvent[]
    started_at: number
    duration: number
    moves: DataMove[]
    players: DataPlayer[]
    impostors: number[]
    end_reason: DataEndReason
    settings: {
        map: number
    }
}

export function endReasonToString(endReason: DataEndReason): string {
    switch (endReason) {
    case "CREWMATES_BY_TASK":
        return "クルーメイトのタスク勝利"
    case "CREWMATES_BY_VOTE":
        return "クルーメイトの全狼釣り勝利"
    case "IMPOSTORS_BY_KILL":
        return "インポスターのキル勝利"
    case "IMPOSTORS_BY_SABOTAGE":
        return "インポスターのサボタージの時間切れ勝利"
    case "IMPOSTORS_BY_VOTE":
        return "インポスターのクルーメイト釣り勝利"
    case "IMPOSTOR_DISCONNECT":
        return "クルーメイトのインポスター回線切断勝利"
    case "CREWMATE_DISCONNECT":
        return "インポスターのクルーメイト回線切断勝利"
    default:
        return `Unknown Reason (${endReason})`
    }
}

export const DataContext = createContext<Data>(undefined as any /* FAKE */)

export interface ResConfig {
    maps: {
        path: string,
        center: [number, number]
        calibration: {
            game_pos: [[number, number], [number, number]]
            texture_pos: [[number, number], [number, number]]
        }
    }[]
}

export const ResConfigContext = createContext<ResConfig>(undefined as any)