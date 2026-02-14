# GPT Messenger (C++)

Проект содержит сервер и desktop-приложение для Windows с визуальным интерфейсом (без консольной панели логов).

## Компоненты
- `gptmessenger_server` — TCP-сервер (пользователи, друзья, группы, сообщения)
- `gptmessenger_desktop` (Windows) — GUI-клиент в стиле liquid-glass/blur
- `gptmessenger` — legacy консольный клиент

## Сборка

```bash
cmake -S . -B build
cmake --build build
```

## Запуск сервера

```bash
./build/gptmessenger_server 5555 data.txt
```

## Запуск Windows GUI

```bash
./build/gptmessenger_desktop.exe
```

> GUI подключается к `127.0.0.1:5555`. Сначала запускайте сервер.

## Новый GUI (как в макете)
- слева: блок аккаунта, друзья/группы и список чатов;
- справа: область переписки и поле отправки;
- убрана отдельная «панель вывода информации/логов»;
- blur/backdrop-эффект окна через DWM.
