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
}

// load all SoundBox players on page dom loaded
window.addEventListener("DOMContentLoaded", loadPlayers)

// export SoundBox modules
export const SoundBox = { Player, players, loadPlayers }
