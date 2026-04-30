// get url hash params
const params = new URLSearchParams(location.hash.replace("#", ""))

/** @type {string} Player id */
const id = params.get("id")

/** @type {Object.<string, any} Pending promise resolvers */
const resolvers = {}

const sendMessage = (type, data) => (
  new Promise(resolve => {
    // create message id
    const uuid = crypto.randomUUID()
    // store resolve method on resolvers
    resolvers[uuid] = resolve
    // submit message to parent window
    window.parent.postMessage({
      type, data, uuid, id, soundbox: true
    })
  })
)

// event listener for messages
window.addEventListener("message", event => {
  // get event message data
  const data = event.data
  // return if invalid for soundbox
  if (!data && !data.soundbox) { return }
  // return if invalid player id
  if (data.id !== id) { return }
  // check message uuid in resolvers
  if (data.uuid && data.uuid in resolvers) {
    // resolve promise
    resolvers[data.uuid](data.data)
    // delete promise resolver
    delete resolvers[data.uuid]
  } else if (data.type === "update") {
    // update time details
    player.time = data.data.time
  } else if (data.type === "pause") {
    // update playing state
    player.playing = false
  } else if (data.type === "next") {
    // play next item
    player.next()
  }
})

/** Styling helpers */
const styles = {
  /** Creates background image rule */
  image: url => ({ "background-image": url ? `url(${url})` : null }),
  /** Creates width rule for seek value */
  seek: time => ({ "width": `${(100 * time.current / time.duration).toFixed(4)}%` })
}

/** Calculation helpers */
const calcs = {
  /** Creates time display string */
  time: input => {
    // extract value for each unit
    const minutes = Math.floor(input / 60)
    const seconds = Math.round(input % 60)
    // add leading zeros
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    // return tim in mm:ss format
    return `${mm}:${ss}`;
  }
}

// player app
const player = new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // ready state
    ready: false,
    // current source item
    current: null,
    // playing status
    playing: false,
    // current time details
    time: null,
    // audio sources
    sources: [],
    // styling helpers
    styles,
    // calculation helpers
    calcs
  },
  // app methods
  methods: {
    // initiates player
    async init() {
      // request initiation data from parent
      const data = await sendMessage("init")
      // for each source item
      for (let i = 0; i < data.sources.length; i++) {
        // current source
        const source = data.sources[i]
        // continue if no cover
        if (!source.cover) { continue }
        // request cover image blob
        const blob = await sendMessage("cache", source.cover)
        // replace cover with blob url
        source.cover = blob ? URL.createObjectURL(blob) : null
      }
      // set sources array
      this.sources = data.sources
      // set first source as current
      this.current = data.sources[0]
      // request to load media for first player
      if (params.get("preload") === "true") { sendMessage("load", this.current) }
    },
    // play current audio
    play(item) {
      // set as current item
      this.current = item
      // play request for current source
      sendMessage("play", item)
      // set as playing
      this.playing = true
    },
    // play next audio
    next() {
      // get current item index
      const index = this.sources.indexOf(this.current)
      // get next item by index
      const item = this.sources[index + 1]
      // check if any item available
      if (item) {
        // set as current item
        this.current = item
        // play request for current source
        sendMessage("play", item)
        // set as playing
        this.playing = true
      } else {
        // seek to beginning
        sendMessage("seek", 0)
        // set as paused
        this.playing = false
      }
    },
    // toggle play state
    toggle() {
      // get request type by playing state
      const type = this.playing ? "pause" : "play"
      // request for current source
      sendMessage(type, { ...this.current, time: this.time?.current })
      // toggle playing state
      this.playing = !this.playing
    },
    // seek audio
    seek(event) {
      // return if no duration
      if (!this.time.duration) { return }
      // get seek bar width
      const width = event.target.getBoundingClientRect().width
      // calculate time factor
      const factor = event.offsetX / width
      // calculate required time
      const time = this.time.duration * factor
      // set current time manually
      this.time.current = time
      // seek request for current source
      sendMessage("seek", time)
    }
  },
  // mounted listener
  async mounted() {
    // initiate app
    await this.init()
    // keyboard event listener
    window.addEventListener("keyup", event => {
      // toggle play state for space key
      if (event.key === " ") { this.toggle() }
      // return if no time details
      if (!this.time) { return }
      // seek forward for arrow right key
      if (event.key === "ArrowRight") { sendMessage("seek", this.time.current + 10) }
      // seek backward for arrow left key
      if (event.key === "ArrowLeft") { sendMessage("seek", this.time.current - 10) }
    })
    // set as ready
    this.ready = true
  }
})
