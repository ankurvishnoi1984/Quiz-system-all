/*
 * Shared helpers for the PowerPoint add-in pages.
 *
 * Both pages are plain HTML (not part of the React bundle) because Office needs to
 * load office.js into the page before anything else runs, and because add-in pages
 * must stay tiny — they are rendered inside a small frame on a slide or side pane.
 *
 * The connected session is stored in the PowerPoint document itself
 * (Office.context.document.settings), so the deck keeps working on any machine.
 */
(function (global) {
  var SETTING_SESSION = 'quizEmbedSessionId'
  var SETTING_TOKEN = 'quizEmbedToken'

  function appOrigin() {
    return global.location.origin
  }

  /** Accepts a full embed URL copied from the Share panel, or a bare token. */
  function parseEmbedLink(rawValue) {
    var value = String(rawValue || '').trim()
    if (!value) return null

    try {
      var url = new URL(value)
      var sessionId = url.searchParams.get('session')
      var token = url.searchParams.get('token')
      if (sessionId && token) {
        return { sessionId: sessionId, token: token }
      }
    } catch (err) {
      // Not a URL — fall through.
    }

    return null
  }

  function buildDisplayUrl(config) {
    return (
      appOrigin() +
      '/embed/display?session=' +
      encodeURIComponent(config.sessionId) +
      '&token=' +
      encodeURIComponent(config.token)
    )
  }

  function buildControlsUrl(config) {
    return appOrigin() + '/embed/controls?session=' + encodeURIComponent(config.sessionId)
  }

  function readConfig() {
    if (!global.Office || !Office.context || !Office.context.document) return null
    var settings = Office.context.document.settings
    var sessionId = settings.get(SETTING_SESSION)
    var token = settings.get(SETTING_TOKEN)
    if (!sessionId || !token) return null
    return { sessionId: String(sessionId), token: String(token) }
  }

  function saveConfig(config, callback) {
    var settings = Office.context.document.settings
    settings.set(SETTING_SESSION, config.sessionId)
    settings.set(SETTING_TOKEN, config.token)
    settings.saveAsync(function (result) {
      callback(result.status === Office.AsyncResultStatus.Succeeded ? null : result.error)
    })
  }

  function clearConfig(callback) {
    var settings = Office.context.document.settings
    settings.remove(SETTING_SESSION)
    settings.remove(SETTING_TOKEN)
    settings.saveAsync(function () {
      callback()
    })
  }

  /**
   * PowerPoint does not reliably raise SettingsChanged across add-in parts, so the
   * content add-in re-reads the document settings on a timer instead.
   */
  function watchConfig(onChange, intervalMs) {
    var last = ''
    function tick() {
      var settings = Office.context.document.settings
      settings.refreshAsync(function () {
        var config = readConfig()
        var signature = config ? config.sessionId + '|' + config.token : ''
        if (signature !== last) {
          last = signature
          onChange(config)
        }
      })
    }
    tick()
    return global.setInterval(tick, intervalMs || 4000)
  }

  global.QuizEmbed = {
    appOrigin: appOrigin,
    parseEmbedLink: parseEmbedLink,
    buildDisplayUrl: buildDisplayUrl,
    buildControlsUrl: buildControlsUrl,
    readConfig: readConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    watchConfig: watchConfig,
  }
})(window)
