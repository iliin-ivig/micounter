import { BG_COLORS, DIGIT_COLORS, LABELS } from './settings.js'

// Ссылка на страницу, которая рисует историю из данных после #. Часть после # браузер
// на сервер не отправляет, поэтому игры остаются на телефоне того, кто отсканировал код
const PAGE = 'https://iliin-ivig.github.io/micounter/#'

// Длина ссылки, при которой QR-код на экране 212px ещё надёжно считывается
const MAX_LENGTH = 300

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

// Формат v2: "2" и поток бит в base64url (6 бит на символ, старшие биты первыми, хвост добит нулями).
// Поток: начало самой новой игры в минутах от 1970 года (26 бит), затем игры от новых к старым:
//   1 бит «буквы и цвета как у предыдущей (более новой) игры» — у первой игры его нет;
//   если не совпали — буквы A и B по 5 бит (индекс в LABELS), затем цвета цифр A, фона A,
//   цифр B, фона B по 4 бита (индекс в палитре, 15 — цвета нет в палитре);
//   счёт A и счёт B — Exp-Golomb k=3;
//   длительность в минутах + 1 (0 — не сохранена) — Exp-Golomb k=3;
//   у всех игр кроме первой — пауза в минутах от конца этой игры до начала более новой, Exp-Golomb k=2.
// Палитры и буквы дублируются на странице docs/codec.js — менять вместе
const VERSION = '2'
const BASE_BITS = 26
const SETUP_BITS = [5, 5, 4, 4, 4, 4]

function write(bits, value, n) {
  for (let i = n - 1; i >= 0; i--) bits.push(Math.floor(value / Math.pow(2, i)) % 2)
}

// Exp-Golomb порядка k: маленькие числа короткие, большие длиннее, ограничения сверху нет
function writeNumber(bits, value, k) {
  const q = Math.floor(value / Math.pow(2, k)) + 1
  let n = 1
  while (Math.pow(2, n) <= q) n += 1
  write(bits, 0, n - 1)
  write(bits, q, n)
  write(bits, value % Math.pow(2, k), k)
}

function toText(bits) {
  let text = ''
  for (let i = 0; i < bits.length; i += 6) {
    let v = 0
    for (let j = 0; j < 6; j++) v = v * 2 + (bits[i + j] || 0)
    text += ALPHABET[v]
  }
  return text
}

function index(list, value, missing) {
  const i = list.indexOf(value)
  return i < 0 ? missing : i
}

function setup(game) {
  const colors = game.colors || []
  const bg = game.bg || []
  return [
    index(LABELS, game.labels[0], 31), index(LABELS, game.labels[1], 31),
    index(DIGIT_COLORS, colors[0], 15), index(BG_COLORS, bg[0], 15),
    index(DIGIT_COLORS, colors[1], 15), index(BG_COLORS, bg[1], 15)
  ]
}

const minute = ms => Math.floor(ms / 60000)

// newer — соседняя более новая игра, уже записанная в поток
function writeGame(bits, game, newer) {
  const values = setup(game)
  const same = newer && setup(newer).join() === values.join()
  if (newer) write(bits, same ? 1 : 0, 1)
  if (!same) values.forEach((v, i) => write(bits, v, SETUP_BITS[i]))
  writeNumber(bits, game.scores[0], 3)
  writeNumber(bits, game.scores[1], 3)

  const start = minute(game.at)
  const room = newer ? minute(newer.at) - start : Infinity
  // Длительность — до минуты окончания, чтобы время конца на странице совпало с часами.
  // Игра не может кончиться позже начала следующей, иначе пауза станет отрицательной
  const length = game.duration === undefined
    ? 0
    : Math.max(0, Math.min(minute(game.at + game.duration * 1000) - start, room))
  writeNumber(bits, game.duration === undefined ? 0 : length + 1, 3)
  if (newer) writeNumber(bits, room - length, 2)
}

// Ссылка для QR-кода и сколько игр в неё поместилось. В ссылку попадают самые поздние по началу
export function shareLink(games) {
  const sorted = games.slice().sort((a, b) => b.at - a.at)
  if (sorted.length === 0) return { url: '', count: 0 }
  const bits = []
  write(bits, minute(sorted[0].at), BASE_BITS)
  let url = ''
  let count = 0
  for (const game of sorted) {
    const size = bits.length
    writeGame(bits, game, count > 0 ? sorted[count - 1] : null)
    const next = PAGE + VERSION + toText(bits)
    if (next.length > MAX_LENGTH) {
      bits.length = size
      break
    }
    url = next
    count += 1
  }
  return { url, count }
}
