_ = require("lodash")
EE = require("events")
path = require("path")
log = require("debug")("cypress:server:preprocessor")
Promise = require("bluebird")

appData = require("../util/app_data")
cwd = require("../cwd")
plugins = require("../plugins")
savedState = require("../util/saved_state")

PrettyError = require("pretty-error")
pe = new PrettyError()
pe.skipNodeFiles()

errorMessage = (err = {}) ->
  (err.stack ? err.annotated ? err.message ? err.toString())
  ## strip out stack noise from parser like
  ## at Parser.pp$5.raise (/path/to/node_modules/babylon/lib/index.js:4215:13)
  .replace(/\n\s*at.*/g, "")
  .replace(/From previous event:\n?/g, "")

clientSideError = (err) ->
  console.error(pe.render(err))
  err = errorMessage(err)
  ## \n doesn't come through properly so preserve it so the
  ## runner can do the right thing
  .replace(/\n/g, '{newline}')
  ## babel adds syntax highlighting for the console in the form of
  ## [90m that need to be stripped out or they appear in the error message
  .replace(/\[\d{1,3}m/g, '')

  """
  (function () {
    Cypress.action("spec:script:error", {
      type: "BUNDLE_ERROR",
      error: #{JSON.stringify(err)}
    })
  }())
  """

getOutputPath = (config, filePath) ->
  appData.projectsPath(savedState.toHashName(config.projectRoot), "bundles", filePath)

baseEmitter = new EE()
fileProcessors = {}
configs = {}

setDefaultPreprocessor = ->
  log("set default preprocessor")

  browserify = require("@cypress/browserify-preprocessor")
  plugins.register("file:preprocessor", browserify())

plugins.registerHandler (ipc) ->
  ipc.on "preprocessor:rerun", (filePath) ->
    baseEmitter.emit("file:updated", filePath)

  baseEmitter.on "close", (filePath) ->
    ipc.send("preprocessor:close", filePath)

module.exports = {
  emitter: baseEmitter
  errorMessage: errorMessage
  clientSideError: clientSideError

  getFile: (filePath, config, options = {}) ->
    filePath = path.join(config.projectRoot, filePath)

    log("getFile #{filePath}")

    if not preprocessorConfig = configs[filePath]
      preprocessorConfig = configs[filePath] = _.extend(new EE(), {
        filePath: filePath
        outputPath: getOutputPath(config, filePath.replace(config.projectRoot, ""))
        shouldWatch: not config.isTextTerminal
      })
      preprocessorConfig.on "rerun", ->
        baseEmitter.emit("file:updated", filePath)
      baseEmitter.once "close", ->
        preprocessorConfig.emit("close")
 
    if not plugins.has("file:preprocessor")
      setDefaultPreprocessor(config)

    if config.isTextTerminal and fileProcessor = fileProcessors[filePath]
      log("headless and already processed")
      return fileProcessor

    preprocessor = fileProcessors[filePath] = Promise.try ->
      plugins.execute("file:preprocessor", preprocessorConfig)

    return preprocessor

  removeFile: (filePath) ->
    return if not fileProcessors[filePath]

    log("removeFile #{filePath}")
    baseEmitter.emit("close", filePath)
    if config = configs[filePath]
      config.emit("close")
    delete configs[filePath]
    delete fileProcessors[filePath]

  close: ->
    log("close preprocessor")

    configs = {}
    fileProcessors = {}
    baseEmitter.emit("close")
    baseEmitter.removeAllListeners()

}
