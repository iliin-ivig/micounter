// Разбор данных после # в ссылке из QR-кода MiCounter. Формат описан в src/common/share.js.
// Палитры совпадают с src/common/settings.js — менять вместе
(function (root) {
  var DIGIT_COLORS = [
    '#FBFBFB', '#FB6225', '#FFD54A',
    '#4CD964', '#22D3EE', '#3D6BFF',
    '#A970FF', '#FF5C8A', '#000000'
  ]
  var BG_COLORS = [
    '#000000', '#3A3A3A', '#D32F2F', '#F4511E',
    '#F9A825', '#7CB342', '#2E7D32', '#00897B',
    '#039BE5', '#1E5BD8', '#6A3FD3', '#D81B60'
  ]
  // Цвета по умолчанию, если цвета игры нет в палитре (игры из старых версий)
  var DEFAULT_DIGITS = ['#FBFBFB', '#FB6225']

  function color(palette, ch, fallback) {
    var i = parseInt(ch, 36)
    return ch !== 'z' && palette[i] ? palette[i] : fallback
  }

  // Возвращает игры от новых к старым: { labels, digits, bg, scores, start, end } — start и end
  // в миллисекундах, end — null, если длительность не сохранена. На неверных данных — null
  function decodeGames(hash) {
    var parts = String(hash || '').replace(/^#/, '').split('_')
    if (parts[0] !== '1' || parts.length < 3) return null
    var base = parseInt(parts[1], 36)
    if (!isFinite(base)) return null
    var games = []
    for (var i = 2; i < parts.length; i++) {
      var f = parts[i].split('.')
      var head = f[0] || ''
      if (head.length !== 6 || f.length !== 5) return null
      var start = (base - parseInt(f[3], 36)) * 60000
      var scores = [parseInt(f[1], 36), parseInt(f[2], 36)]
      if (!isFinite(start) || !isFinite(scores[0]) || !isFinite(scores[1])) return null
      games.push({
        labels: [head[0], head[1]],
        digits: [color(DIGIT_COLORS, head[2], DEFAULT_DIGITS[0]), color(DIGIT_COLORS, head[4], DEFAULT_DIGITS[1])],
        bg: [color(BG_COLORS, head[3], '#000000'), color(BG_COLORS, head[5], '#000000')],
        scores: scores,
        start: start,
        end: f[4] === '' ? null : start + parseInt(f[4], 36) * 60000
      })
    }
    return games
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { decodeGames: decodeGames }
  else root.decodeGames = decodeGames
})(this)
