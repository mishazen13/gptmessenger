# GPT Messenger (C++)

В проекте теперь есть **полноценное desktop-приложение для Windows** (не консоль), плюс сервер.

## Что есть
- `gptmessenger_server` — TCP-сервер мессенджера (хранит пользователей/друзей/сообщения)
- `gptmessenger_desktop` (Windows) — GUI-клиент с окном, кнопками, полями и эффектом blur (DWM)
- `gptmessenger` — старый консольный клиент (для совместимости)

## Сборка

```bash
cmake -S . -B build
cmake --build build
```

## Запуск сервера

```bash
./build/gptmessenger_server 5555 data.txt
```

## Запуск GUI-клиента (Windows)

```bash
./build/gptmessenger_desktop.exe
```

> GUI-клиент подключается к `127.0.0.1:5555`, поэтому сервер должен быть запущен заранее.

## Возможности GUI-клиента
- регистрация;
- логин;
- добавление в друзья;
- отправка личных сообщений;
- просмотр истории DM;
- визуальный desktop-интерфейс с blur-эффектом (DWM).

## Структура
- `src/server.cpp`, `src/server_main.cpp` — сервер
- `src/win_gui_main.cpp` — desktop GUI-клиент Windows
- `src/messenger.cpp`, `src/ui.cpp` — консольный legacy-клиент
