import { createContext, FormEvent, KeyboardEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

type Settings = { dramatic: boolean; bigText: boolean; chaos: boolean }
type SaveData = {
  name: string
  coins: number
  purchased: string[]
  achievements: string[]
  seconds: number
  visits: number
  events: Record<string, number>
  settings: Settings
}
type AppContextType = {
  data: SaveData
  track: (event: string) => void
  saveName: (name: string) => void
  buy: (id: string, cost: number) => boolean
  changeSetting: (setting: keyof Settings) => void
  toast: string
  say: (message: string) => void
}

const STORAGE_KEY = 'nikakoy-progress-v1'
const freshSave: SaveData = {
  name: '', coins: 9, purchased: [], achievements: [], seconds: 0, visits: 0,
  events: {}, settings: { dramatic: false, bigText: false, chaos: false },
}

const phrases = [
  'Великолепно. Ты взаимодействуешь с пикселями, и они пока держатся.',
  'Мы бы это записали, но блокнот тоже бесполезен.',
  'Смелый шаг. В буквальном смысле один клик.',
  'Система заметила твою активность и сделала вид, что занята.',
  'Ты ожидал награду? Какая милая версия реальности.',
  'Ничего не произошло. Но с каким размахом!',
  'Мы отправили запрос в никуда. Ответ уже почти пришёл.',
  'Твоя настойчивость вызывает уважение у пустого места.',
  'Это был важный момент. Для счётчика кликов.',
  'Кажется, ты нашёл кнопку. Она тоже удивлена.',
  'Поздравляем: ты только что потратил секунду с особым смыслом.',
  'Наша команда экспертов по ничему одобряет этот выбор.',
  'Статистика показывает: ты всё ещё здесь. Статистика не осуждает. Почти.',
  'Мы бы подмигнули, но у сайта нет век.',
  'Внимание! Обнаружено желание получить результат.',
  'Твоя заявка принята. В отделе заявок никого нет.',
  'Кнопка нажата. Самооценка кнопки повысилась.',
  'Похоже на прогресс. Не переживай, это пройдёт.',
  'Отличный выбор. Остальные были не лучше.',
  'Никто не знает, зачем это здесь. Теперь и ты.',
  'Ты заслужил маленький приз. Вот: 🫴 ничего.',
  'Сайт загрузился, а смысл — нет. Бывает.',
  'Спасибо за терпение. Мы ничего с ним не сделаем.',
  'Если долго смотреть в пустоту, пустота попросит выключить звук.',
  'Миссия выполнена. Миссия была не определена.',
  'Этот интерфейс прошёл проверку на наличие смысла. Не прошёл.',
  'Кажется, мы стали ближе. К закрытию вкладки.',
  'Тебя заметили. Это был пиксель наблюдения.',
  'Очень продуктивно. По меркам комнаты ожидания.',
  'Ты уже далеко зашёл. Географически — нет.',
  'Связь с реальностью нестабильна. Повторите позже.',
  'Мы хотели сказать что-то умное, но передумали.',
  'Результат сохранён. Его не существует, но сохранён.',
  'Сайт работает на энтузиазме и подозрительно пустой батарейке.',
  'Поздравляем с новым уровнем. Уровень всё ещё нулевой.',
  'Твоё любопытство зафиксировано. В папке «зачем».',
]

const achievements = [
  { id: 'hello', title: 'Неловкое знакомство', text: 'Зайти на сайт и не сразу уйти.', icon: '◉', check: (d: SaveData) => d.events.visit >= 1 },
  { id: 'click', title: 'Палец решает', text: 'Нажать любую кнопку. Серьёзно?', icon: '⌁', check: (d: SaveData) => d.events.homeClick >= 1 },
  { id: 'minute', title: 'Минута молчания', text: 'Провести здесь целую минуту.', icon: '◷', check: (d: SaveData) => d.seconds >= 60 },
  { id: 'runner', title: 'Неуловимый', text: 'Заставить кнопку сбежать трижды.', icon: '↗', check: (d: SaveData) => d.events.flee >= 3 },
  { id: 'name', title: 'Псевдоним принят', text: 'Представиться вымышленному сайту.', icon: 'Aa', check: (d: SaveData) => d.events.register >= 1 },
  { id: 'browse', title: 'Экскурсия в ничто', text: 'Посетить магазин ничего.', icon: '⌂', check: (d: SaveData) => d.events.page_shop >= 1 },
  { id: 'buyer', title: 'Рациональная покупка', text: 'Купить что-нибудь абсолютно ненужное.', icon: '＋', check: (d: SaveData) => d.events.purchase >= 1 },
  { id: 'settings', title: 'Тонкая настройка', text: 'Настроить бесполезность под себя.', icon: '⚙', check: (d: SaveData) => d.events.page_settings >= 1 },
  { id: 'secret', title: 'Сюда вообще-то нельзя', text: 'Обнаружить секретную зону.', icon: '⌑', check: (d: SaveData) => d.events.page_secret >= 1 },
  { id: 'final', title: 'Попытка побега', text: 'Начать процедуру ухода.', icon: '↗', check: (d: SaveData) => d.events.page_final >= 1 },
  { id: 'bot', title: 'Поговорил со стеной', text: 'Задать вопрос локальному боту.', icon: '…', check: (d: SaveData) => d.events.botTalk >= 1 },
  { id: 'settingswitch', title: 'Переключатель судьбы', text: 'Изменить настройку и ничего не сломать.', icon: '◐', check: (d: SaveData) => d.events.settingChange >= 1 },
  { id: 'secretfive', title: 'Пять секунд славы', text: 'Поймать ускользающий пиксель пять раз.', icon: '✳', check: (d: SaveData) => d.events.secretCatch >= 5 },
  { id: 'coins', title: 'Миллионер почти', text: 'Накопить 25 монет без причины.', icon: '◈', check: (d: SaveData) => d.coins >= 25 },
  { id: 'tour', title: 'Турист по пустоте', text: 'Посетить все основные разделы.', icon: '◎', check: (d: SaveData) => ['page_home', 'page_registration', 'page_achievements', 'page_shop', 'page_settings', 'page_secret', 'page_final'].every((key) => d.events[key] >= 1) },
  { id: 'ten', title: 'Подозрительно терпеливый', text: 'Просидеть здесь десять минут.', icon: '◴', check: (d: SaveData) => d.seconds >= 600 },
  { id: 'collector', title: 'Собиратель хлама', text: 'Совершить три покупки.', icon: '▦', check: (d: SaveData) => d.events.purchase >= 3 },
  { id: 'repeat', title: 'Я снова здесь', text: 'Вернуться на сайт после перерыва.', icon: '↻', check: (d: SaveData) => d.visits >= 2 },
]

const AppContext = createContext<AppContextType | null>(null)
function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('Контекст сайта не подключён')
  return context
}

function loadSave(): SaveData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return freshSave
    const parsed = JSON.parse(saved) as Partial<SaveData>
    return {
      ...freshSave, ...parsed,
      events: { ...freshSave.events, ...parsed.events },
      settings: { ...freshSave.settings, ...parsed.settings },
      purchased: Array.isArray(parsed.purchased) ? parsed.purchased : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    }
  } catch { return freshSave }
}

function App() {
  const [data, setData] = useState<SaveData>(loadSave)
  const dataRef = useRef(data)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visitInitialized = useRef(false)
  const visitedPath = useRef<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const commit = useCallback((next: SaveData, message?: string) => {
    dataRef.current = next
    setData(next)
    if (message) {
      setToast(message)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(''), 3600)
    }
  }, [])

  const awardAchievements = useCallback((next: SaveData) => {
    const newlyUnlocked = achievements.filter((item) => !next.achievements.includes(item.id) && item.check(next))
    if (!newlyUnlocked.length) return next
    const updated = { ...next, achievements: [...next.achievements, ...newlyUnlocked.map((item) => item.id)] }
    setToast(`ДОСТИЖЕНИЕ: ${newlyUnlocked[0].title}`)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3600)
    return updated
  }, [])

  const track = useCallback((event: string) => {
    const current = dataRef.current
    const events = { ...current.events, [event]: (current.events[event] || 0) + 1 }
    const coinRewards: Record<string, number> = { homeClick: 1, flee: 1, register: 2, botTalk: 1, secretCatch: 2, settingChange: 1 }
    const next = awardAchievements({ ...current, events, coins: current.coins + (coinRewards[event] || 0) })
    commit(next)
  }, [awardAchievements, commit])

  const say = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3600)
  }, [])

  const saveName = useCallback((name: string) => {
    const current = dataRef.current
    const next = awardAchievements({ ...current, name, events: { ...current.events, register: (current.events.register || 0) + 1 }, coins: current.coins + 2 })
    commit(next, `Имя «${name}» записано в очень важный список.`)
  }, [awardAchievements, commit])

  const buy = useCallback((id: string, cost: number) => {
    const current = dataRef.current
    if (current.purchased.includes(id)) { say('Это уже твоё. Вернуть нельзя — тут нечего возвращать.'); return false }
    if (current.coins < cost) { say('Монет недостаточно. Попробуй заработать кликами, капиталист.'); return false }
    const next = awardAchievements({ ...current, coins: current.coins - cost, purchased: [...current.purchased, id], events: { ...current.events, purchase: (current.events.purchase || 0) + 1 } })
    commit(next, 'Покупка совершена. Смысл не входит в комплект.')
    return true
  }, [awardAchievements, commit, say])

  const changeSetting = useCallback((setting: keyof Settings) => {
    const current = dataRef.current
    const next = awardAchievements({ ...current, settings: { ...current.settings, [setting]: !current.settings[setting] }, events: { ...current.events, settingChange: (current.events.settingChange || 0) + 1 }, coins: current.coins + 1 })
    commit(next, ['Настройка применена. Что-то точно изменилось.', 'Система приняла твой выбор и слегка растерялась.', 'Готово. Обратного смысла не будет.'][Math.floor(Math.random() * 3)])
  }, [awardAchievements, commit])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (visitInitialized.current) return
    visitInitialized.current = true
    const current = dataRef.current
    const next = awardAchievements({ ...current, visits: current.visits + 1, events: { ...current.events, visit: (current.events.visit || 0) + 1 } })
    commit(next)
    // The visit counter is deliberately incremented once per app load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const current = dataRef.current
      const next = awardAchievements({ ...current, seconds: current.seconds + 1 })
      commit(next)
    }, 1000)
    return () => clearInterval(interval)
  }, [awardAchievements, commit])

  useEffect(() => {
    if (visitedPath.current === location.pathname) return
    visitedPath.current = location.pathname
    const routeKey: Record<string, string> = {
      '/': 'home', '/registration': 'registration', '/achievements': 'achievements', '/shop': 'shop',
      '/settings': 'settings', '/secret': 'secret', '/final': 'final',
    }
    const key = routeKey[location.pathname]
    if (key) track(`page_${key}`)
  }, [location.pathname, track])

  useEffect(() => {
    document.body.classList.toggle('dramatic-mode', data.settings.dramatic)
    document.body.classList.toggle('big-type-mode', data.settings.bigText)
    document.body.classList.toggle('chaos-mode', data.settings.chaos)
  }, [data.settings])

  const value = useMemo(() => ({ data, track, saveName, buy, changeSetting, toast, say }), [data, track, saveName, buy, changeSetting, toast, say])
  return (
    <AppContext.Provider value={value}>
      <div className="app-shell">
        <Header />
        <main className="page-wrap"><Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/secret" element={<Secret />} />
          <Route path="/final" element={<Final />} />
          <Route path="*" element={<NotFound />} />
        </Routes></main>
        <Footer />
        {toast && <div className="toast" role="status"><span className="toast-dot" />{toast}<button className="toast-close" onClick={() => setToast('')} aria-label="Закрыть">×</button></div>}
        <button className="floating-exit" onClick={() => navigate('/final')} aria-label="Попытаться уйти">↗<span>Уйти?</span></button>
      </div>
    </AppContext.Provider>
  )
}

const navItems = [
  { to: '/', label: 'Ничего', code: '01' },
  { to: '/registration', label: 'Знакомство', code: '02' },
  { to: '/achievements', label: 'Успехи', code: '03' },
  { to: '/shop', label: 'Магазин', code: '04' },
  { to: '/settings', label: 'Настройки', code: '05' },
  { to: '/secret', label: 'Секрет', code: '06' },
  { to: '/final', label: 'Выход', code: '07' },
]

function Header() {
  const { data } = useApp()
  const time = `${String(Math.floor(data.seconds / 60)).padStart(2, '0')}:${String(data.seconds % 60).padStart(2, '0')}`
  return <header className="site-header">
    <div className="topline">
      <Link to="/" className="wordmark" aria-label="НИКАКОЙ, на главную"><span className="logo-mark">Н</span>НИКАКОЙ<span className="wordmark-period">.</span></Link>
      <div className="header-status"><span className="live-dot" /> САЙТ БЕСПОЛЕЗЕН <span className="status-divider">/</span><span className="time-readout">{time} В НИКУДА</span></div>
      <Link to="/shop" className="wallet"><span>◈</span> {data.coins}<small>ПУСТОМОНЕТ</small></Link>
    </div>
    <nav className="main-nav" aria-label="Основная навигация">{navItems.map((item) => <NavLink key={item.to} end={item.to === '/'} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-code">{item.code}</span>{item.label}<span className="nav-arrow">↗</span></NavLink>)}</nav>
  </header>
}

function Footer() {
  return <footer className="site-footer"><span>© 2026 НИКАКОЙ ИНТЕРНЕШНЛ</span><span>СДЕЛАНО ИЗ НИЧЕГО, С ЛЮБОВЬЮ К НИЧЕМУ</span><Link to="/secret">[ не нажимать сюда ]</Link></footer>
}

function PageIntro({ index, eyebrow, title, text }: { index: string; eyebrow: string; title: ReactNode; text: string }) {
  return <div className="page-intro"><div className="eyebrow"><span>{index}</span><i />{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>
}

function Home() {
  const { data, track, say } = useApp()
  const [buttonPosition, setButtonPosition] = useState({ x: 50, y: 50 })
  const [escapes, setEscapes] = useState(0)
  const [quote, setQuote] = useState('Этот сайт не решит ни одной твоей проблемы. Но добавит пару новых вкладок.')
  const [message, setMessage] = useState('')
  const [reply, setReply] = useState('Я локальный бот. Мои амбиции ограничены этой рамкой.')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const lines = ['Не ищи здесь смысл.', 'Здесь даже пустота без энтузиазма.', 'Ты мог бы сейчас делать что-то важное.', 'Этот сайт — цифровая версия «ну и?»', 'Мы не заманиваем. Мы просто не отговариваем.']

  const evade = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'mouse' || escapes >= 4) return
    const stage = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!stage) return
    const x = 15 + Math.random() * 70
    const y = 20 + Math.random() * 60
    setButtonPosition({ x, y })
    setEscapes((value) => value + 1)
    track('flee')
  }
  const clickMe = () => {
    track('homeClick')
    setQuote(phrases[Math.floor(Math.random() * phrases.length)])
    setEscapes(5)
    say('Вот. Ты нажал. Теперь у кнопки есть повод для гордости.')
  }
  const botReply = (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim()) { setReply('Пустое сообщение. Наконец-то разговор на моём уровне.'); return }
    const text = message.toLowerCase()
    const responses = text.includes('привет') ? ['Привет. Я бы встал, но у меня нет ног.', 'И тебе ничего хорошего. В смысле — ничего.']
      : text.includes('зачем') || text.includes('смысл') ? ['Смысл вышел за кофе. Уже третий год.', 'Чтобы ты задал этот вопрос. Теперь миссия выполнена.']
        : text.includes('помощ') ? ['Конечно. Попробуй закрыть глаза и представить, что я помог.', 'Могу предложить только сочувствие и кнопку «назад».']
          : text.includes('кто') ? ['Я — бот. Локальный, как пыль под диваном.', 'Твой собеседник, пока друзья заняты чем-то полезным.']
            : [phrases[Math.floor(Math.random() * phrases.length)], 'Я обдумал это. Нет, не обдумал. Вот ответ: ничего.']
    setReply(responses[Math.floor(Math.random() * responses.length)])
    setMessage('')
    track('botTalk')
  }
  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') { setEscapes(5); say('Кнопка решила дать тебе фору. Пользуйся.'); }
  }

  return <>
    <section className="hero-grid">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="tiny-star">✳</span> ПЛАТФОРМА НИЧЕГО НЕ ДЕЛАНИЯ <span className="kicker-line" /></div>
        <h1>ТЕБЕ СЮДА<br /><em>НЕ НАДО</em><span className="hero-period">.</span></h1>
        <div className="hero-bottom"><p>Но раз уж пришёл — располагайся.<br />Тут всё равно никто не торопится.</p><div className="hero-index">№ 000<br /><span>ПОЛЬЗА: 0%</span></div></div>
      </div>
      <div className="hero-art" aria-label="Абстрактная анимация">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
        <div className="art-core">Н<span>?</span></div><div className="art-caption">НИЧЕГО<br />ПРОИСХОДИТ</div><span className="art-cross">+</span><span className="art-star">✳</span>
      </div>
    </section>

    <section className="action-band"><div className="action-label"><span className="live-dot" /> ВНИМАНИЕ, БЕСПОЛЕЗНАЯ АКТИВНОСТЬ</div><div className="escape-stage" aria-label="Поле для убегающей кнопки">
      <span className="stage-note">КНОПКА СТРЕМИТСЯ К СВОБОДЕ<br />НАЖМИ, ЕСЛИ СМОЖЕШЬ</span>
      <button ref={buttonRef} className="run-button" style={{ left: `${buttonPosition.x}%`, top: `${buttonPosition.y}%` }} onPointerEnter={evade} onClick={clickMe} onKeyDown={onButtonKeyDown} aria-label="Не нажимай эту кнопку">НЕ НАЖИМАЙ <span>↗</span></button>
      <span className="stage-counter">ПОПЫТОК: {Math.min(escapes, 4)} / 4</span>
      <span className="stage-hint">КЛАВИАТУРА: TAB → ENTER &nbsp; · &nbsp; ESC — СДАЧА</span>
    </div></section>

    <section className="quote-section"><div className="section-meta"><span>01 / НАШЕ ОБЕЩАНИЕ</span><span>ОБЕЩАНИЙ НЕТ</span></div><div className="quote-layout"><h2>ЗДЕСЬ<br />НИЧЕГО <span>НЕ</span><br /><i>ПРОИСХОДИТ</i></h2><div className="quote-right"><span className="quote-mark">“</span><p>{quote}</p><button className="text-button" onClick={() => { setQuote(lines[Math.floor(Math.random() * lines.length)]); track('homeClick') }}>ЕЩЁ ОДНА БЕСПОЛЕЗНАЯ МЫСЛЬ <b>↗</b></button></div></div></section>

    <section className="dashboard-strip"><div className="metric"><strong>{Math.floor(data.seconds / 60)}<small>м</small> {data.seconds % 60}<small>с</small></strong><span>ТВОЁ ВРЕМЯ ЗДЕСЬ</span></div><div className="metric"><strong>{data.achievements.length}<small>/{achievements.length}</small></strong><span>ПОВОДОВ ГОРДИТЬСЯ</span></div><div className="metric"><strong>{data.coins}<small>◈</small></strong><span>ПУСТОМОНЕТ В КАРМАНЕ</span></div><Link to="/achievements" className="strip-link">ПОСМОТРЕТЬ СВОИ УСПЕХИ <b>↗</b></Link></section>

    <section className="bot-section"><div className="bot-heading"><div className="eyebrow"><span>02</span><i /> КРУГЛОСУТОЧНАЯ БЕСПОЛЕЗНОСТЬ</div><h2>ЕСТЬ<br /><em>ВОПРОСЫ?</em></h2><p>Бот отвечает по сценарию. Его сценарист — тоже бот. Кажется.</p></div><div className="bot-window"><div className="bot-top"><span><i className="live-dot" /> БОТ «НИЧЕГО НЕ ЗНАЮ»</span><span>ЛОКАЛЬНО · БЕЗ ИНТЕРНЕТА</span></div><div className="bot-conversation"><div className="bot-avatar">Н</div><p>{reply}</p></div><form className="bot-form" onSubmit={botReply}><label className="sr-only" htmlFor="bot-input">Напиши боту</label><input id="bot-input" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Спроси что-нибудь. Или не спрашивай…" maxLength={140} /><button type="submit" aria-label="Отправить сообщение">↗</button></form><div className="bot-foot">СООБЩЕНИЯ НЕ ПОКИДАЮТ ЭТОТ БРАУЗЕР</div></div></section>

    <section className="manifesto"><span className="manifesto-n">N° 0001</span><p>«Мы ничего не гарантируем. Особенно то, что мы ничего не гарантируем.»</p><Link to="/registration" className="outline-link">ЗАПОЛНИТЬ БЕСПОЛЕЗНУЮ ФОРМУ <b>↗</b></Link></section>
  </>
}

function Registration() {
  const { data, saveName, say } = useApp()
  const [name, setName] = useState(data.name)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const safeName = name.trim().slice(0, 24)
    if (!safeName) { say('Поле пустое. Мы ценим последовательность, но придумай себе имя.'); return }
    saveName(safeName)
  }
  return <div className="page-content"><PageIntro index="02" eyebrow="ФОРМА № 01 — СОВЕРШЕННО НЕ НУЖНАЯ" title={<>ДАВАЙ<br /><em>ЗНАКОМИТЬСЯ</em></>} text="Мы не собираем почту, телефон и секреты. Только имя — чтобы иногда обращаться к тебе с лёгким разочарованием." />
    <div className="registration-grid"><form className="form-card" onSubmit={submit}><div className="form-card-top"><span>АНКЕТА БЕЗ ПЕРСПЕКТИВ</span><span>01 / 01</span></div><label htmlFor="nickname">КАК ТЕБЯ НАЗЫВАТЬ?</label><input id="nickname" value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, Повелитель вкладок" maxLength={24} autoComplete="off" /><div className="input-caption"><span>ТОЛЬКО В ЭТОМ БРАУЗЕРЕ</span><span>{name.length}/24</span></div><button type="submit" className="lime-button">ЗАПИСАТЬСЯ В НИКУДА <b>↗</b></button>{data.name && <div className="saved-name"><span className="live-dot" /> ТЫ УЖЕ ЗДЕСЬ КАК <strong>{data.name}</strong></div>}<p className="privacy-note">Сохраняется только в localStorage. Удалишь данные браузера — мы забудем тебя первыми.</p></form><aside className="registration-aside"><div className="aside-stamp">БЕЗ<br />ГАРАНТИЙ</div><h3>ЧТО ТЫ<br />ПОЛУЧИШЬ?</h3><ul><li><span>—</span> Почётное ничто</li><li><span>—</span> Локальное внимание бота</li><li><span>—</span> Возможно, монетку</li><li><span>—</span> Ни одного письма</li></ul><span className="aside-scribble">обещаем<br />не спамить*</span><small>* мы не знаем, как</small></aside></div>
  </div>
}

function Achievements() {
  const { data } = useApp()
  const unlocked = data.achievements.length
  return <div className="page-content"><PageIntro index="03" eyebrow="ЗАЛ СЛАВЫ, В КОТОРОМ НИКОГО НЕТ" title={<>ТВОИ<br /><em>ДОСТИЖЕНИЯ</em></>} text="Каждое достижение открывается по-настоящему. Награда — чувство, что ты мог бы потратить время иначе." />
    <div className="achievement-summary"><div><strong>{String(unlocked).padStart(2, '0')}</strong><span>ОТКРЫТО ИЗ {achievements.length}</span></div><div className="progress-track"><span style={{ width: `${(unlocked / achievements.length) * 100}%` }} /></div><span className="achievement-percent">{Math.round((unlocked / achievements.length) * 100)}%</span></div>
    <div className="achievement-grid">{achievements.map((item, index) => {
      const isUnlocked = data.achievements.includes(item.id)
      return <article key={item.id} className={`achievement-card${isUnlocked ? ' unlocked' : ''}`}><div className="achievement-card-top"><span className="achievement-icon">{item.icon}</span><span className="achievement-number">N° {String(index + 1).padStart(2, '0')}</span><span className="achievement-lock">{isUnlocked ? '✓' : '○'}</span></div><h3>{item.title}</h3><p>{item.text}</p><span className="achievement-state">{isUnlocked ? 'ОТКРЫТО · ПОЗДРАВЛЯЕМ?' : 'ЕЩЁ ОДНА ПРИЧИНА ОСТАТЬСЯ'}</span></article>
    })}</div><div className="after-grid-note">ЕЩЁ {achievements.length - unlocked} ПОВОДОВ ДЛЯ ГОРДОСТИ. ИЛИ НЕТ.</div>
  </div>
}

const products = [
  { id: 'air', name: 'Банка свежего воздуха', detail: 'Открывать нельзя. Там воздух.', cost: 3, sign: '◌', tag: 'ХИТ НИЧЕГО' },
  { id: 'thought', name: 'Мысль на потом', detail: 'Срок годности истёк до покупки.', cost: 5, sign: '〰', tag: 'МЫСЛИТЕЛЬНОЕ' },
  { id: 'pixel', name: 'Личный пиксель', detail: 'Один. Не самый яркий.', cost: 7, sign: '▪', tag: 'ЛИМИТИРОВАНО' },
  { id: 'time', name: 'Дополнительная секунда', detail: 'Уже прошла, пока ты читал.', cost: 10, sign: '◷', tag: 'НЕВОЗВРАТНО' },
]
function Shop() {
  const { data, buy } = useApp()
  return <div className="page-content"><PageIntro index="04" eyebrow="ПОТРАТЬ МОНЕТЫ НА ТО, ЧТОБЫ ОНИ ПРОПАЛИ" title={<>МАГАЗИН<br /><em>НИЧЕГО</em></>} text="Валюта виртуальная. Покупки тоже почти виртуальные. Банк уже в курсе и тоже не впечатлён." />
    <div className="shop-bar"><div><span className="shop-label">ТВОЙ БАЛАНС</span><strong>◈ {data.coins} <small>ПУСТОМОНЕТ</small></strong></div><div className="shop-explainer">Получай монеты за активность.<br />Трать их на активность ещё меньшую.</div><Link className="earn-link" to="/">ПОЙТИ ЗАРАБОТАТЬ ↗</Link></div>
    <div className="product-grid">{products.map((item, index) => {
      const owned = data.purchased.includes(item.id)
      return <article className={`product-card product-${index + 1}${owned ? ' owned' : ''}`} key={item.id}><div className="product-top"><span>{item.tag}</span><span>0{index + 1} / 04</span></div><div className="product-art"><span>{item.sign}</span><i>НИЧЕГО<br />ОСОБЕННОГО</i></div><h3>{item.name}</h3><p>{item.detail}</p><div className="product-buy"><span className="price">◈ {item.cost}</span><button className={owned ? 'owned-button' : 'buy-button'} disabled={owned} onClick={() => buy(item.id, item.cost)}>{owned ? 'КУПЛЕНО ✓' : 'КУПИТЬ ↗'}</button></div></article>
    })}</div><section className="inventory"><div><span className="eyebrow"><span>ИНВЕНТАРЬ</span><i /> ТВОИ ПРИОБРЕТЕНИЯ</span><h2>У ТЕБЯ ЕСТЬ<br /><em>НЕМНОГО НИЧЕГО</em></h2></div><div className="inventory-items">{data.purchased.length ? data.purchased.map((id) => <span className="inventory-pill" key={id}>✓ {products.find((product) => product.id === id)?.name || id}</span>) : <p>Пока пусто. Впервые отсутствие — это нормально.</p>}</div></section>
  </div>
}

function SettingsPage() {
  const { data, changeSetting, say } = useApp()
  const rows: { key: keyof Settings; title: string; description: string; active: string; inactive: string }[] = [
    { key: 'dramatic', title: 'Добавить драматизма', description: 'Контраст выше. Ситуация — всё ещё безвыходная.', active: 'МАКСИМАЛЬНО', inactive: 'СПОКОЙНО' },
    { key: 'bigText', title: 'Шрифт для важных мыслей', description: 'Важных мыслей здесь не обнаружено, но буквы вырастут.', active: 'КРУПНО', inactive: 'ОБЫЧНО' },
    { key: 'chaos', title: 'Режим контролируемого хаоса', description: 'Порядок элементов иногда будет слегка сомневаться.', active: 'ХАОС', inactive: 'ПОРЯДОК' },
  ]
  return <div className="page-content"><PageIntro index="05" eyebrow="НАСТРОЙКИ, КОТОРЫЕ НАСТРОЯТ ТЕБЯ" title={<>ПОД СЕБЯ.<br /><em>ЗАЧЕМ — НЕ ЗНАЕМ.</em></>} text="Каждый переключатель действительно влияет на интерфейс. Просто последствия могут быть в основном эмоциональными." />
    <div className="settings-layout"><div className="settings-list">{rows.map((row, index) => <article className="setting-row" key={row.key}><div className="setting-id">0{index + 1}</div><div className="setting-copy"><h3>{row.title}</h3><p>{row.description}</p></div><span className="toggle-state">{data.settings[row.key] ? row.active : row.inactive}</span><button className={`switch${data.settings[row.key] ? ' on' : ''}`} onClick={() => changeSetting(row.key)} role="switch" aria-checked={data.settings[row.key]} aria-label={row.title}><span /></button></article>)}</div><aside className="settings-note"><span className="note-spark">✳</span><p>Изменения сохраняются автоматически. Как и твой выбор остаться здесь.</p><button className="text-button" onClick={() => say('Сбросить все настройки? Нет. Мы привязались.')}>СБРОСИТЬ СМЫСЛ <b>↗</b></button></aside></div><div className="settings-footnote"><span>НАСТРОЕК: 03</span><span>ВОЗМОЖНОСТЕЙ: ТЕХНИЧЕСКИ БОЛЬШЕ</span><span>СМЫСЛА: 0</span></div>
  </div>
}

function Secret() {
  const { track, say } = useApp()
  const [hits, setHits] = useState(0)
  const [target, setTarget] = useState({ left: 52, top: 48 })
  const [unlocked, setUnlocked] = useState(false)
  const catchPixel = () => {
    if (unlocked) { say('Пиксель пойман и снова отпущен. Он был не готов.'); return }
    const next = hits + 1
    setHits(next)
    track('secretCatch')
    if (next >= 5) { setUnlocked(true); say('Поймал! Тебе достаётся секрет: ничего не меняется.'); return }
    setTarget({ left: 8 + Math.random() * 82, top: 12 + Math.random() * 70 })
  }
  return <div className="page-content secret-page"><PageIntro index="06" eyebrow="ТЫ НЕ ДОЛЖЕН БЫЛ ЭТО НАЙТИ" title={<>СЕКРЕТНАЯ<br /><em>ЗОНА</em></>} text="Доступ получен по ошибке. Пожалуйста, никому не говори. Здесь секретов меньше, чем кажется." />
    <div className="secret-banner"><span className="secret-eye">◉</span><div><span>СОВЕРШЕННО СЕКРЕТНО · НЕ СКРИНШОТИТЬ</span><h2>ТАЙНА № 1</h2><p>У сайта есть владелец. Он тоже не знает, что происходит.</p></div><span className="secret-stamp">НЕ<br />ЧИТАТЬ</span></div>
    <section className="minigame"><div className="minigame-heading"><div><span className="eyebrow"><span>МИНИ-ИГРА</span><i /> УРОВЕНЬ СЛОЖНОСТИ: НУЖНО МОРГАТЬ</span><h2>ПОЙМАЙ<br /><em>ПИКСЕЛЬ</em></h2></div><div className="game-score"><strong>{Math.min(hits, 5)}<small>/05</small></strong><span>ПОЙМАНО</span></div></div><div className="game-field"><div className="field-cross cross-a">+</div><div className="field-cross cross-b">+</div>{unlocked ? <div className="game-won"><span>✳</span><strong>ПОЙМАНО</strong><p>Внутри ничего. Как и обещали.</p><button className="text-button" onClick={() => { setHits(0); setUnlocked(false); say('Пиксель вернулся на работу.'); }}>ИГРАТЬ ЕЩЁ РАЗ ↗</button></div> : <><span className="field-instruction">ОН МАЛЕНЬКИЙ. КАК И ТВОИ ШАНСЫ.</span><button className="pixel-target" style={{ left: `${target.left}%`, top: `${target.top}%` }} onClick={catchPixel} aria-label="Поймать пиксель"> </button><span className="field-footer">КЛИКНИ ПО НЕГО ПЯТЬ РАЗ</span></>}</div></section>
    <div className="secret-foot">ЕСЛИ ТЫ ДОШЁЛ ДО ЭТОГО МЕСТА — НИКАКОЙ ВЫХОД СПРАВА ВНИЗУ.</div>
  </div>
}

function Final() {
  const { track, say } = useApp()
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const steps = [
    { title: <>УЖЕ<br /><em>УХОДИШЬ?</em></>, text: 'Мы не будем тебя удерживать. Впрочем, браузер закроешь ты сам.', button: 'ДА, Я УХОЖУ', alt: 'Ладно, ещё секунду' },
    { title: <>ПОДОЖДИ.<br /><em>ТЫ ЗАБЫЛ НИЧЕГО.</em></>, text: 'Твои монеты, достижения и имя останутся в этом браузере. Мы — нет.', button: 'ЗАБРАТЬ НИЧЕГО', alt: 'Это манипуляция?' },
    { title: <>ПОСЛЕДНИЙ<br /><em>ВОПРОС</em></>, text: 'Ты правда думал, что здесь будет грандиозная развязка?', button: 'ДАВАЙ УЖЕ', alt: 'А если нажать сюда?' },
    { title: <>ТЫ<br /><em>СВОБОДЕН.</em></>, text: 'Спасибо, что провёл с нами время. Мы не заметили, как оно прошло.', button: 'ВЕРНУТЬСЯ В НИКУДА', alt: 'Открыть секретную зону' },
  ]
  const current = steps[step]
  const advance = () => { track('finalStep'); if (step < 3) setStep(step + 1); else navigate('/') }
  const alternative = () => {
    if (step === 0) { say('Мы так и знали. Продолжаем ничего.'); setStep(1) }
    else if (step === 1) say('Это не манипуляция. Это очень медленная кнопка «назад».')
    else if (step === 2) { say('Правильный вопрос. Неправильный сайт.'); setStep(3) }
    else navigate('/secret')
  }
  return <div className="page-content final-page"><div className="final-decoration"><div className="final-ring" /><span>ПОПЫТКА ПОКИНУТЬ САЙТ</span><span>СТАТУС: НЕ УДЕРЖИВАЕМ*</span></div><PageIntro index="07" eyebrow="СЦЕНАРИЙ ВЫХОДА · ШАГ 0" title={current.title} text={current.text} /><div className="final-actions"><button className="lime-button" onClick={advance}>{current.button} <b>↗</b></button><button className="text-button" onClick={alternative}>{current.alt} <b>↗</b></button></div><div className="final-progress">{steps.map((_, index) => <span key={index} className={index <= step ? 'done' : ''} />)}<small>ШАГ {Math.min(step + 1, 4)} / 4</small></div><div className="final-legal">* Удержание осуществляется исключительно твоим собственным любопытством.</div></div>
}

function NotFound() {
  return <div className="page-content"><PageIntro index="404" eyebrow="НЕ ТУДА" title={<>СТРАНИЦА<br /><em>НИКУДА НЕ ДЕЛАСЬ</em></>} text="Она просто никогда не существовала. Как и причина паниковать." /><Link className="lime-button inline-button" to="/">ВЕРНУТЬСЯ К НИЧЕМУ ↗</Link></div>
}

export default App
