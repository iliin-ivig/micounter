// Разбор данных после # в ссылке из QR-кода MiCounter. Формат описан в src/common/share.js.
// Палитры и буквы совпадают с src/common/settings.js — менять вместе
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
  var LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  // Цвета по умолчанию, если цвета игры нет в палитре (игры из старых версий)
  var DEFAULT_DIGITS = ['#FBFBFB', '#FB6225']

  function reader(text) {
    var bits = []
    for (var i = 0; i < text.length; i++) {
      var v = ALPHABET.indexOf(text[i])
      if (v < 0) throw new Error('bad char')
      for (var j = 5; j >= 0; j--) bits.push((v >> j) & 1)
    }
    var pos = 0
    function read(n) {
      if (pos + n > bits.length) throw new Error('truncated')
      var v = 0
      for (var i = 0; i < n; i++) v = v * 2 + bits[pos++]
      return v
    }
    function number(k) {
      var zeros = 0
      while (read(1) === 0) zeros++
      var q = Math.pow(2, zeros) + read(zeros)
      return (q - 1) * Math.pow(2, k) + read(k)
    }
    // Хвост добит нулями до целого символа — это меньше 6 бит, а любая игра длиннее
    function more() { return bits.length - pos >= 6 }
    return { read: read, number: number, more: more }
  }

  // Возвращает игры от новых к старым: { labels, digits, bg, scores, start, end } — start и end
  // в миллисекундах, end — null, если длительность не сохранена. На неверных данных — null
  function decodeGames(hash) {
    var text = String(hash || '').replace(/^#/, '')
    if (text[0] !== '2') return null
    try {
      var r = reader(text.slice(1))
      var start = r.read(26)
      var games = []
      var setup = null
      while (r.more()) {
        if (!setup || r.read(1) === 0) setup = [r.read(5), r.read(5), r.read(4), r.read(4), r.read(4), r.read(4)]
        var scores = [r.number(3), r.number(3)]
        var length = r.number(3) - 1
        if (games.length > 0) start = games[games.length - 1].start / 60000 - r.number(2) - Math.max(length, 0)
        games.push({
          labels: [LABELS[setup[0]] || '?', LABELS[setup[1]] || '?'],
          digits: [DIGIT_COLORS[setup[2]] || DEFAULT_DIGITS[0], DIGIT_COLORS[setup[4]] || DEFAULT_DIGITS[1]],
          bg: [BG_COLORS[setup[3]] || '#000000', BG_COLORS[setup[5]] || '#000000'],
          scores: scores,
          start: start * 60000,
          end: length < 0 ? null : (start + length) * 60000
        })
      }
      return games.length > 0 ? games : null
    } catch (e) {
      return null
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { decodeGames: decodeGames }
  else root.decodeGames = decodeGames
})(this)
