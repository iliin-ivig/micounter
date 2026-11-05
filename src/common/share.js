import { BG_COLORS, DIGIT_COLORS } from './settings.js'

// Ссылка на страницу, которая рисует историю из данных после #. Часть после # браузер
// на сервер не отправляет, поэтому игры остаются на телефоне того, кто отсканировал код
const PAGE = 'https://iliin-ivig.github.io/micounter/#'

// Длина ссылки, при которой QR-код на экране 212px ещё надёжно считывается
const MAX_LENGTH = 300

// Формат v1: "1_<база>_<игра>_<игра>...", игры от новых к старым.
// База — начало самой новой игры в минутах от 1970 года, base36.
// Игра — «AB» буквы, 4 символа индексов в палитрах (цифры A, фон A, цифры B, фон B; z — цвета
// нет в палитре), затем через точку: счёт A, счёт B, на сколько минут игра началась раньше базы,
// длительность в минутах (пусто, если не сохранена). Числа — base36.
// Палитры дублируются на странице docs/index.html — менять вместе
function paletteIndex(palette, color) {
  const i = palette.indexOf(color)
  return i < 0 ? 'z' : i.toString(36)
}

function encodeGame(game, base) {
  const minutes = Math.floor(game.at / 60000)
  const colors = game.colors || []
  const bg = game.bg || []
  return [
    game.labels[0] + game.labels[1] +
      paletteIndex(DIGIT_COLORS, colors[0]) + paletteIndex(BG_COLORS, bg[0]) +
      paletteIndex(DIGIT_COLORS, colors[1]) + paletteIndex(BG_COLORS, bg[1]),
    game.scores[0].toString(36),
    game.scores[1].toString(36),
    (base - minutes).toString(36),
    game.duration === undefined ? '' : Math.round(game.duration / 60).toString(36)
  ].join('.')
}

// Ссылка для QR-кода и сколько игр в неё поместилось. games — от новых к старым
export function shareLink(games) {
  if (games.length === 0) return { url: '', count: 0 }
  const base = Math.floor(games[0].at / 60000)
  let url = `${PAGE}1_${base.toString(36)}`
  let count = 0
  for (const game of games) {
    const next = `${url}_${encodeGame(game, base)}`
    if (next.length > MAX_LENGTH) break
    url = next
    count += 1
  }
  return { url, count }
}
