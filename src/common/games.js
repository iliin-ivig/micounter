import storage from '@system.storage'

const KEY = 'games'
const LIMIT = 30

// Сыгранные игры, новые первыми: { id, at, labels, colors, bg, scores, points, duration }.
// points — [[зона, секунды от начала], ...], duration — секунды; в играх до 1.9.0 их нет
function read(callback) {
  storage.get({
    key: KEY,
    success: data => {
      let list = []
      try {
        list = data ? JSON.parse(data) : []
      } catch (e) {
        list = []
      }
      if (!Array.isArray(list)) list = []
      callback(list.filter(g => g && Array.isArray(g.scores) && Array.isArray(g.labels)))
    },
    fail: () => callback([])
  })
}

function write(list, callback) {
  storage.set({
    key: KEY,
    value: JSON.stringify(list),
    complete: () => callback && callback(list)
  })
}

export function loadGames(callback) {
  read(callback)
}

// Список после завершения игры: пустая (0:0) убирается, иначе встаёт первой.
// Игру можно завершить, продолжить и завершить снова — запись с тем же id заменяется
export function withGame(list, game) {
  const rest = list.filter(g => g.id !== game.id)
  const empty = game.scores[0] + game.scores[1] === 0
  return empty ? rest : [game].concat(rest).slice(0, LIMIT)
}

export function saveGames(list) {
  write(list.slice(0, LIMIT))
}

export function clearGames(callback) {
  write([], callback)
}
