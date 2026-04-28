/** Player frame url */
const url = import.meta.url.replace("/modules/soundbox.js", "/players/default.html")

/** @typedef {{ src: string, title: string, artist?: string, cover?: string, captions?: string }} Source Sound source */
/** @typedef {{ url: string, sources: Source[] }} Options Player options */

/** SoundBox Player */
class Player {
  /**
   * SoundBox Player
   * @param {Options} options Player options
   */
  constructor(options) {
    /** @type {string} Player id */
    this.id = crypto.randomUUID()
    /** @type {Options} Player options */
    this.options = options
    /** @type {HTMLIFrameElement} Player iframe element */
    this.element = document.createElement("iframe")
    // set iframe style
    this.element.style.border = "none"
    this.element.style.width = "100%"
    this.element.style.height = "100%"
    this.element.style.display = "inline-block"
    this.element.style.margin = "0px"
    // set iframe src to load
    this.element.src = options.url + "?id=" + this.id
  }
}

/** @type {Player[]} All created SoundBox players */
const players = []

/** @type {Object.<string, Blob>} Cached files directory */
const cache = {}

/**
 * Loads a file from url
 * @param {string} url file source url
 * @returns {Promise<Blob | null>}
 */
const loadFile = url => (
  new Promise(resolve => {
    // resolve if available on cache
    if (url in cache) { return resolve(cache[url]) }
    // fetch file content
    fetch(url).then(async resp => {
      // create blob from response
      const blob = await resp.blob()
      // store on cache directory
      cache[url] = blob
      // resolve blob
      resolve(blob)
    }).catch(() => resolve(null))
  })
)

/** @type {Player | null} Currently active player */
let currentPlayer = null

/** @type {HTMLAudioElement} Audio element */
const audio = document.createElement("audio")

// create audio context
const context = new AudioContext()
// create source node by audio element
const source = context.createMediaElementSource(audio)
// create audio analyser
const analyser = context.createAnalyser()
// set fft size
analyser.fftSize = 32
// half of fft size returns to visualizer
const length = analyser.frequencyBinCount
// create byte array from length
const bytes = new Uint8Array(length)
// connect analyser and context
source.connect(analyser)
analyser.connect(context.destination)

// audio play listener
audio.addEventListener("play", () => {
  // check if context is suspended
  if (context.state === 'suspended') {
    // resume context
    context.resume()
  }
})

// method to update
const update = () => {
  // check if components ready
  if (audio.duration && currentPlayer) {
    // read frequency data from analyser
    analyser.getByteFrequencyData(bytes)
    // create update data object
    const data = {
      // current time and duration
      time: { current: audio.currentTime, duration: audio.duration },
      // visualizer bytes
      bytes: bytes
    }
    // send update object
    sendMessage(currentPlayer, data, null, "update")
  }
  // request next frame
  requestAnimationFrame(update)
}

// start update loop
update()

/**
 * Post messages into player window
 * @param {Player} player Player module
 * @param {any} data message data
 * @param {string} [uuid] message resolve id
 * @param {string} [type] message type
 */
const sendMessage = (player, data, uuid, type) => {
  // post message to window with identifiers
  player.element.contentWindow.postMessage({
    id: player.id, data, type, uuid, soundbox: true
  })
}

// incoming messages listener
window.addEventListener("message", async event => {
  // get event message data
  const data = event.data
  // return if invalid for soundbox
  if (!data && !data.soundbox) { return }
  // get player by id
  const player = players.find(item => item.id === data.id)
  // return if no player found
  if (!player) { return }
  // switch by message type
  if (data.type === "init") {
    // submit player option
    sendMessage(player, player.options, data.uuid)
  } else if (data.type === "load-file") {
    // submit loaded file
    sendMessage(player, await loadFile(data.data), data.uuid)
  } else if (data.type === "play") {
    // update current audio source fi changed
    if (audio.src !== data.data.src) { audio.src = data.data.src }
    // start audio
    audio.play()
    // set as currently active player
    currentPlayer = player
  }
})

/** Acceptable source attributes */
const attributes = ["src", "title", "artist", "cover", "captions"]

/** Load all soundbox elements available */
const loadPlayers = () => {
  // get all available soundbox element
  const elements = document.querySelectorAll("soundbox")
  // for each element
  for (let i = 0; i < elements.length; i++) {
    // current element
    const element = elements[i]
    // set element display style
    element.style.display = "flex"
    // sources array
    const sources = []
    // get all available source element
    const sourceElements = element.querySelectorAll("source")
    // for each source element
    for (let s = 0; s < sourceElements.length; s++) {
      /** @type {Source} create source object */
      const source = attributes.reduce((attrs, key) => ({
        ...attrs, [key]: sourceElements[s].getAttribute(key)
      }), {})
      // continue if not required values
      if (!source.src || !source.title) { continue }
      // push to sources
      sources.push(source)
    }
    // continue if no sources
    if (sources.length === 0) { continue }
    // create soundbox player
    const player = new Player({ url, sources })
    // clear sandbox child element
    element.innerHTML = ""
    // append player frame
    element.appendChild(player.element)
    // push player to players
    players.push(player)
  }
  // initial player resize
  resizePlayers()
}

/** Resize all players to their inner content height */
const resizePlayers = () => {
  // for each player
  for (let i = 0; i < players.length; i++) {
    // current player
    const player = players[i]
    // get element width
    const width = player.element.getBoundingClientRect().width
    // calculate spacing
    const spacing = width < 420 ? width * 0.04 : 16
    // calculate player section height
    const playerHeight = (width < 420 ? width * 0.24 : 96) + spacing * 2
    // calculate tracks section height
    const tracksHeight = player.options.sources.length < 2 ? 0
      : (width < 420 ? width * 0.12 : 50) * player.options.sources.length + spacing
    // set total soundbox height
    player.element.style.height = (playerHeight + tracksHeight) + "px"
  }
}

// load all SoundBox players on page dom loaded
window.addEventListener("DOMContentLoaded", loadPlayers)

// resize all SoundBox players on page resize
window.addEventListener("resize", resizePlayers)

// export SoundBox modules
export const SoundBox = { Player, players, loadPlayers }
