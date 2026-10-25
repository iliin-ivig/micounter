// Запускает приложение в эмуляторе Vela с экраном Mi Band 10 (212x520), проходит по основным
// экранам и сохраняет скриншоты в screenshots/.
//
//   npm run screenshots [-- путь/к/app.rpk]
//
// По умолчанию берётся самый свежий .rpk из dist/. SDK эмулятора (~830 МБ) скачивается при первом
// запуске в ~/.vela/sdk или в VELA_SDK_HOME. На Linux нужны системные библиотеки:
// libgl1 libx11-6 libxcb1 libxext6 libxfixes3 libxdamage1 libpulse0 libnss3
const fs = require('fs')
const os = require('os')
const path = require('path')
const { VvdManager, VelaImageType, IVvdArchType } = require('@aiot-toolkit/emulator')

const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots')
const SDK = process.env.VELA_SDK_HOME || path.join(os.homedir(), '.vela', 'sdk')
const IMAGE = VelaImageType.VELA_WATCH_5
const VVD = 'MiCounter_Band10'
const PACKAGE = 'com.micounter.app'

// Координаты на экране 212x520, см. разметку src/pages/index/index.ux
const ZONE_A = [106, 130]
const ZONE_B = [106, 390]
const ZONE_B_BG = [20, 330] // фон зоны B мимо цифры и буквы
const FINISH = [159, 260]
const NEW_GAME = [151, 280]
const FIRST_CELL = [35, 151] // первая плитка выбора цвета цифр: белый
const BLUE_BG_CELL = [35, 446] // синий в выборе фона: четвёртый ряд, первый столбец

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = msg => console.log(`[screenshots] ${msg}`)

function findRpk() {
  if (process.argv[2]) return path.resolve(process.argv[2])
  const dist = path.join(ROOT, 'dist')
  const rpks = fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => f.endsWith('.rpk')) : []
  if (rpks.length === 0) throw new Error('В dist/ нет .rpk — сначала выполните npm run build')
  rpks.sort((a, b) => fs.statSync(path.join(dist, b)).mtimeMs - fs.statSync(path.join(dist, a)).mtimeMs)
  return path.join(dist, rpks[0])
}

// Тулчейн вызывает adb по имени, а встроенный в @miwt/adb бинарник лежит не в PATH
function addAdbToPath() {
  const dir = { linux: 'linux', darwin: 'mac', win32: 'win' }[process.platform]
  // package.json пакета закрыт через exports, поэтому корень ищем вверх от его главного файла
  let pkg = path.dirname(require.resolve('@miwt/adb'))
  while (!fs.existsSync(path.join(pkg, 'bin'))) pkg = path.dirname(pkg)
  process.env.PATH = `${path.join(pkg, 'bin', dir)}${path.delimiter}${process.env.PATH}`
}

async function ensureSdk(manager) {
  if ((await manager.hasSDKPartUpdate()).length === 0 && manager.hasLocaleImage(IMAGE)) return
  log(`скачиваю SDK эмулятора в ${SDK}, около 830 МБ`)
  const downloader = await manager.downloadSDK({
    imageTypeArr: [IMAGE],
    force: false,
    cliProgress: true,
    parallelDownloads: 4
  })
  await downloader.downlodPromise
}

// Каждый прогон на новом устройстве: история игр и настройки не тянутся из прошлого запуска
function recreateVvd(manager) {
  if (manager.getVvdList().some(v => v.name === VVD)) manager.deleteVvd(VVD)
  manager.createVvd({
    name: VVD,
    imageType: IMAGE,
    arch: IVvdArchType.arm,
    imageDir: path.join(SDK, 'system-images', IMAGE),
    width: '212',
    height: '520',
    customLcdRadius: ''
  })
}

async function main() {
  const rpk = findRpk()
  addAdbToPath()
  fs.mkdirSync(OUT, { recursive: true })

  const manager = new VvdManager({ sdkHome: SDK })
  await ensureSdk(manager)
  recreateVvd(manager)

  log('запускаю эмулятор')
  let stopping = false
  const { emulatorInstance, getAgent } = await manager.startVvd({
    vvdName: VVD,
    qtHideWindow: true,
    grpcPort: 8554,
    stdoutCallback: () => {},
    stderrCallback: () => {},
    exitCallback: code => {
      if (!stopping) {
        console.error(`[screenshots] эмулятор неожиданно завершился с кодом ${code}`)
        process.exit(1)
      }
    }
  })

  try {
    await emulatorInstance.isConnected()
    log(`ставлю ${path.relative(ROOT, rpk)}`)
    await emulatorInstance.pushAndInstall(rpk, PACKAGE)
    // startApp ждёт строку о запуске в логе эмулятора и часто не дожидается её, хотя приложение
    // запускается. Проверка запуска — первый скриншот
    await emulatorInstance.startApp(PACKAGE).catch(e => log(`startApp: ${e}`))
    await sleep(2000)

    const agent = await getAgent()
    // Без этого sendMouse молча ничего не делает: агент считает себя неподключённым
    await agent.waitForReady()

    const mouse = ([x, y], buttons) => agent.sendMouse({ x, y, buttons })
    const tap = async (point, times = 1) => {
      for (let i = 0; i < times; i++) {
        await mouse(point, 1)
        await sleep(80)
        await mouse(point, 0)
        await sleep(150)
      }
      await sleep(500)
    }
    // Одиночное «кнопка зажата» эмулятор передаёт как тап, поэтому событие повторяется
    const hold = async point => {
      const end = Date.now() + 1200
      while (Date.now() < end) {
        await mouse(point, 1)
        await sleep(50)
      }
      await mouse(point, 0)
      await sleep(1000)
    }
    const shot = async name => {
      fs.writeFileSync(path.join(OUT, `${name}.png`), await agent.getScreenshot())
      log(`screenshots/${name}.png`)
    }
    const playGame = async (a, b) => {
      await tap(ZONE_A, a)
      await tap(ZONE_B, b)
    }

    // После холодного старта приложение рисуется не сразу, а нажатия до этого теряются.
    // Чёрный экран в PNG весит около 1,5 КБ, игровой — больше 5 КБ
    const deadline = Date.now() + 30000
    while ((await agent.getScreenshot()).length < 5000) {
      if (Date.now() > deadline) throw new Error('приложение не отрисовалось за 30 секунд')
      await sleep(500)
    }
    await sleep(500)

    await shot('01-start')

    // Две сыгранные игры, чтобы на экране итога была история
    await playGame(11, 7)
    await tap(FINISH)
    await tap(NEW_GAME)
    await playGame(9, 11)
    await tap(FINISH)
    await tap(NEW_GAME)

    await playGame(7, 5)
    await shot('02-game')

    await hold(ZONE_A)
    await shot('03-picker-color')
    await tap(FIRST_CELL)

    await hold(ZONE_B_BG)
    await shot('04-picker-bg')
    await tap(BLUE_BG_CELL)
    await shot('05-game-custom')

    await tap(FINISH)
    await shot('06-result')
  } finally {
    stopping = true
    await manager.stopVvd(VVD)
  }
}

main().then(
  () => process.exit(0),
  e => {
    console.error('[screenshots]', e && e.stack || e)
    process.exit(1)
  }
)
