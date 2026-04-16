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
- Шрифт: VT323 (Google Fonts) — терминал 80х вайб
- Лого: logo.svg — три красных (#cc2020) синусоиды в квадрате, прозрачный фон
- Hero фото: hero.jpg — TC6000 + рэк, аниме стиль (Grok img2img), с CRT scanlines эффектом
- opacity: 0.6, filter: contrast(1.1) grayscale(0.3) на hero фото

## Текущая структура index.html
- Nav — лого (80x80) слева, кнопка >Start справа (fixed, z-index:10)
- Hero — фото на весь экран (100vh) с CRT scanlines через ::after
- Terminal section — скрытый блок, появляется по клику >Start

## Навигация
- >Start скроллит вниз и показывает терминал
- Терминал печатает текст побуквенно (requestAnimationFrame)
- Последняя строка терминала: [MASTERING] [POST] [CONTACT] — будет кликабельной

## Терминальный интро текст
```
> INITIALIZING...
> LOCATION: BIELEFELD, DE
> OPERATOR: YEGOR DEMCHENKO

> AUDIO ENGINEER
> MASTERING / POST-PRODUCTION

> CURRENTLY AT DD MASTERING, OBERHAUSEN

> AVAILABLE FOR PROJECTS
> chudooyudoo@gmail.com

> [MASTERING]  [POST]  [CONTACT]
```

## Планируемые секции (после терминала)
- Mastering — описание услуги
- Post-production — описание услуги
- Contact — email

## Будущие фичи (в разработке)
- ЭЛТ монитор рамка — фото сделает друг с Alpha камерой в понедельник
  - Рамка вырезается, внутри рендерится терминал
  - Эффект "попадания в монитор" при нажатии Start
- Боковые маски на широких экранах (16:9) — бегущий текст как маска по бокам
- Кастомный курсор — мигающий прямоугольник как в DOS
- Easter egg — печатаешь слово на клавиатуре → скрытая страница
  - Слово-триггер: TBD
  - Скрытая страница: CV + анимешная картинка (Sidream img с девочкой на TC6000)
- Секретная страница с CV (cv.html) — не слинкована нигде

## Владелец
Yegor Demchenko, аудио инженер, Bielefeld DE
Работает с DD Mastering (Fritz Fey, Oberhausen)
Email: chudooyudoo@gmail.com
