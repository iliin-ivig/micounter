import { BG_COLORS, DIGIT_COLORS, LABELS } from './settings.js'

// Ячейки показывают вариант так, как он будет выглядеть в зоне игрока.
// Размеры подобраны, чтобы сетка занимала всю высоту экрана 520px под заголовком
const KINDS = {
  label: {
    options: LABELS,
    columns: 4,
    cellWidth: 46,
    cellHeight: 54,
    fontSize: 28,
    field: 'labels',
    cell: (s, p, v) => ({ bg: s.bg[p], fg: s.colors[p], text: v })
  },
  color: {
    options: DIGIT_COLORS,
    columns: 3,
    cellWidth: 64,
    cellHeight: 128,
    fontSize: 56,
    field: 'colors',
    cell: (s, p, v) => ({ bg: s.bg[p], fg: v, text: '8' })
  },
  bg: {
    options: BG_COLORS,
    columns: 3,
    cellWidth: 64,
    cellHeight: 96,
    fontSize: 56,
    field: 'bg',
    cell: (s, p, v) => ({ bg: v, fg: s.colors[p], text: '8' })
  }
}

// Всё, что нужно разметке экрана выбора. flex-wrap в Vela нет, поэтому сетка разбита на ряды
export function buildPicker(settings, kindName, player) {
  const kind = KINDS[kindName]
  const current = settings[kind.field][player]
  const cells = kind.options.map(v => Object.assign(kind.cell(settings, player, v), {
    value: v,
    selected: v === current
  }))

  const rows = []
  for (let i = 0; i < cells.length; i += kind.columns) {
    rows.push(cells.slice(i, i + kind.columns))
  }
  return {
    kind: kindName,
    player,
    // Заголовок переводится в разметке: picker.<kind> в src/i18n
    label: settings.labels[player],
    rows,
    cellWidth: kind.cellWidth,
    cellHeight: kind.cellHeight,
    cellRadius: Math.round(Math.min(kind.cellWidth, kind.cellHeight) / 4),
    fontSize: kind.fontSize
  }
}

export function applyChoice(settings, picker, value) {
  const field = KINDS[picker.kind].field
  const values = settings[field].slice()
  values[picker.player] = value
  return Object.assign({}, settings, { [field]: values })
}
