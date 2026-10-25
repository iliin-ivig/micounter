import storage from '@system.storage'

const KEY = 'settings'

// Первые четыре цвета взяты с циферблата: белый, серый и два оттенка оранжевого.
// Чёрный — для ярких фонов
export const DIGIT_COLORS = [
  '#FBFBFB', '#989898', '#FB6225',
  '#FB8247', '#FFD54A', '#4CD964',
  '#4AA3FF', '#FF5C8A', '#000000'
]

// Насыщенные цвета, на которых читаются белые цифры; тёмные приглушённые выглядели полупрозрачными
export const BG_COLORS = [
  '#000000', '#3A3A3A', '#D32F2F', '#F4511E',
  '#F9A825', '#7CB342', '#2E7D32', '#00897B',
  '#039BE5', '#1E5BD8', '#6A3FD3', '#D81B60'
]

export const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')

export function defaults() {
  return {
    bg: ['#000000', '#000000'],
    colors: ['#FBFBFB', '#FB6225'],
    labels: ['A', 'B']
  }
}

// Отбрасывает значения не из палитр, чтобы испорченная запись не ломала экран
function normalize(raw) {
  const d = defaults()
  if (!raw || typeof raw !== 'object') return d
  const pick = (value, allowed, fallback) => (allowed.indexOf(value) >= 0 ? value : fallback)
  // В версии 1.1.0 фон был общим и хранился строкой
  const bg = typeof raw.bg === 'string' ? [raw.bg, raw.bg] : raw.bg
  return {
    bg: [0, 1].map(i => pick(bg && bg[i], BG_COLORS, d.bg[i])),
    colors: [0, 1].map(i => pick(raw.colors && raw.colors[i], DIGIT_COLORS, d.colors[i])),
    labels: [0, 1].map(i => pick(raw.labels && raw.labels[i], LABELS, d.labels[i]))
  }
}

export function load(callback) {
  storage.get({
    key: KEY,
    success: data => {
      let raw = null
      try {
        raw = data ? JSON.parse(data) : null
      } catch (e) {
        raw = null
      }
      callback(normalize(raw))
    },
    fail: () => callback(defaults())
  })
}

// done вызывается после записи, чтобы следующий экран прочитал уже новые настройки
export function save(settings, done) {
  storage.set({
    key: KEY,
    value: JSON.stringify(settings),
    complete: () => done && done()
  })
}
