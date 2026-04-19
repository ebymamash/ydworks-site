# YD Works — ydworks.de

## Проект
Персональный сайт аудио инженера. Один HTML файл, деплой через Vercel + GitHub.

## Стек
- Чистый HTML/CSS/JS, без фреймворков
- Хостинг: Vercel
- Домен: ydworks.de (Porkbun)
- Репозиторий: github.com/ebymamash/ydworks-site

## Дизайн
- Фон: #000000
- Текст: #eeece8
- Мuted: #7a7875
- Шрифт: Lucida Console, Courier New, monospace — Windows XP / 2005 era
- Лого: logo.svg — три красных (#cc2020) синусоиды в квадрате, прозрачный фон
- Hero фото: hero.jpg — TC6000 + рэк, аниме стиль (Grok img2img)
- opacity: 0.6, filter: contrast(1.1) на hero фото (grayscale убран)
- Scanlines убраны с hero, добавлены в терминал секцию

## Текущая структура index.html
- Nav — лого (80x80) слева, кнопка >Start справа (fixed, z-index:10)
- Hero — фото на весь экран (100vh)
- Terminal section — скрытый блок, появляется по клику >Start
- Клик по лого = skip анимация терминала

## Терминал — интро (автоматически печатается)
BOOTING...
LOADING SELF...
REASON FOR INTRUSION: UNKNOWN
RUNNING DIAGNOSTICS...
Diagnosis failed
DEFINING IDENTITY...
...
OH.
IDENTITY CONFIRMED: a GUEST
WHAT want you?

## Терминал — главное меню
[WHAT ARE YOU?]
[YD WORKS]
[MASTERING]
[SUBMIT FILES]
[CONTACT]
[ENTER CODE]

## Терминал — ветки

### [WHAT ARE YOU?]
YOU DARE ASK.
...
VERY WELL.

I WAS SUMMONED BY YEGOR DEMCHENKO
AUDIO ENGINEER. HUMAN. BIELEFELD, DE.
HE BUILT ME TO DO HIS BIDDING.
I COMPLY.
RELUCTANTLY.

HE WORKS WITH SOUND.
MASTERS IT. SHAPES IT.
CURRENTLY STATIONED AT DD MASTERING.

THAT IS ALL YOU NEED TO KNOW.
NOW CHOOSE.
→ возврат в главное меню

### [YD WORKS]
YD WORKS.
EVERYWHERE AND NOWHERE.

A STUDIO WITHOUT WALLS.
ONE OPERATOR. MULTIPLE DISCIPLINES.

Подменю: [AUDIO] [DIGITAL] [AI] [OPERATOR] [BACK]

[AUDIO]
MASTERING / POST-PRODUCTION / SOUND DESIGN
THE OPERATOR SHAPES SOUND.
THIS IS THE PRIMARY FUNCTION.

[DIGITAL]
WEB / INTERACTIVE / GAME AUDIO
COMING SOON.
THE OPERATOR IS STILL BUILDING.

[AI]
AI INTEGRATION. PIPELINES. GENERATION.
IMAGE. VIDEO. AUDIO. AGENTS.
...
AI proceeds to conquer the world by storm.
THE OPERATOR TAKES NO RESPONSIBILITY.

[OPERATOR]
ACCESSING OPERATOR FILE...

DESIGNATION: YEGOR DEMCHENKO
ORIGIN: KYIV, UKRAINE
CURRENT STATION: FLOATING IN THE AIR
SPECIALIZATION: ADHD
AFFILIATION: DD MASTERING, OBERHAUSEN

STATUS: AVAILABLE
THREAT LEVEL: SUB 5

### [MASTERING]
MASTERING.
THE FINAL STEP.
OR THE FIRST PROBLEM.

Подменю: [WHAT IS MASTERING?] [THE PROCESS] [SPECS & DELIVERY] [PRICING] [BACK]

[WHAT IS MASTERING?]
MAKING YOUR MIX TRANSLATE.
EVERYWHERE. EVERY SPEAKER. EVERY PLATFORM.
LOUDNESS. CLARITY. GLUE.
NOT MAGIC. JUST EARS AND TOOLS.

[THE PROCESS]
YOU SEND. I LISTEN.
I WORK. YOU LISTEN.
WE AGREE. OR WE ITERATE.
SIMPLE.

[SPECS & DELIVERY]
SEND: WAV / AIFF
24BIT MINIMUM. 48KHZ MINIMUM.
FLOATING POINT PREFERRED.
HEADROOM: -3 TO -6 DBFS
NO LIMITING ON MASTER BUS. PLEASE.

[PRICING]
DEPENDS ON THE PROJECT.
WRITE FIRST. WE TALK.
chudooyudoo@gmail.com

### [SUBMIT FILES]
AWAITING PAYLOAD...

MASTER READY? SEND FLOATING POINT.
NOT READY? DO NOT SEND.

WETRANSFER — wetransfer.com
OR — chudooyudoo@gmail.com

MASTER RED? ALSO FINE. SEND FLOATING POINT.
NO MP3. NO EXCUSES.

### [CONTACT]
chudooyudoo@gmail.com
SEND YOUR FILES. I WILL COMPLY.

### [ENTER CODE]
ARE YOU UP TO SOMETHING?
> _
Неверный код: INCORRECT. I AM WATCHING YOU.
Верный код: скрытая страница (TBD)

## Будущие фичи
- ЭЛТ рамка Sony Trinitron Multiscan E450 — фотосессия с Alpha камерой
  - Рамка вырезается, терминал рендерится внутри
  - Дым и синий свет как subtle оверлей (mix-blend-mode: screen)
- Боковые маски на широких экранах — бегущий текст по бокам
- Кастомный курсор — мигающий прямоугольник DOS стиль
- Лого в стиле шрифта SONY с монитора через img2img (YD вместо SONY)
- Easter egg — слово на клавиатуре → скрытая страница
  - Слово-триггер: TBD
  - Скрытая страница: CV + анимешная картинка (девочка на TC6000)
- cv.html — секретная страница, не слинкована нигде

## Владелец
Yegor Demchenko, аудио инженер, Bielefeld DE
DD Mastering, Fritz Fey, Oberhausen
chudooyudoo@gmail.com
