import { action, makeObservable, observable } from "mobx"

class State {
    @observable currentSeconds = 0
    @observable playRate = 1
    @observable playing = false
    @observable duration = 1
    @observable mapScale = 0.25

    constructor() {
        makeObservable(this)
    }

    @action incraseSeconds(seconds: number) {
        state.currentSeconds += seconds
        if (state.currentSeconds >= this.duration) this.playing = false
    }

    @action absoluteSeek(seconds: number) {
        state.currentSeconds = seconds
    }
}

export const state = new State()

let before = performance.now()

function loop() {
    requestAnimationFrame(loop)
    const now = performance.now()
    if (state.playing) state.incraseSeconds((now - before) / (1000 * state.playRate))
    before = now
}
loop()