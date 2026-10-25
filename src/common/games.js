import storage from '@system.storage'

const KEY = 'games'
const LIMIT = 30

// Сыгранные игры, новые первыми: { id, at, labels, colors, scores }
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

// Игру можно завершить, продолжить и завершить снова — запись с тем же id заменяется
export function putGame(game, callback) {
  read(list => {
    const rest = list.filter(g => g.id !== game.id)
    write([game].concat(rest).slice(0, LIMIT), callback)
  })
}

export function removeGame(id, callback) {
  read(list => write(list.filter(g => g.id !== id), callback))
}

export function clearGames(callback) {
  write([], callback)
}
