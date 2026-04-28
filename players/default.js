/** @type {string} Player id */
const id = new URLSearchParams(location.search).get("id")

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
  }
})

/** Styling helpers */
const styles = {
  /** Create background image rule */
  image: url => ({ "background-image": url ? `url(${url})` : null })
}

// player app
new Vue({
  // root element
  el: "#app",
  // app data
  data: {
    // ready state
    ready: false,
    // current source item
    current: null,
    // audio sources
    sources: [],
    // styling helpers
    styles
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
        const blob = await sendMessage("load-file", source.cover)
        // replace cover with blob url
        source.cover = blob ? URL.createObjectURL(blob) : null
      }
      // set sources array
      this.sources = data.sources
      // set first source as current
      this.current = data.sources[0]
    }
  },
  // mounted listener
  async mounted() {
    // initiate app
    await this.init()
    // set as ready
    this.ready = true
  }
})
