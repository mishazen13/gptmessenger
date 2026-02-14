# GPT Messenger (C++)

Консольный мессенджер на C++ с визуальным стилем **liquid glass** (ANSI-оформление), анимациями и базовыми функциями:

- регистрация и логин;
- добавление/удаление друзей;
- создание и открытие групп;
- личные и групповые чаты;
- контекстное меню сообщений: **ответ** и **удаление своих сообщений**;
- сохранение состояния в `data.txt`.

## Структура проекта

- `include/models.hpp` — доменные структуры (`User`, `Group`, `Message`)
- `include/ui.hpp`, `src/ui.cpp` — UI, эффекты и ввод
- `include/storage.hpp`, `src/storage.cpp` — загрузка/сохранение данных
- `include/messenger.hpp`, `src/messenger.cpp` — бизнес-логика клиентского приложения
- `include/server.hpp`, `src/server.cpp`, `src/server_main.cpp` — отдельный TCP-сервер
- `src/main.cpp` — точка входа клиентского приложения

## Сборка

```bash
cmake -S . -B build
cmake --build build
```

## Запуск клиента

```bash
./build/gptmessenger
```

## Запуск сервера

```bash
./build/gptmessenger_server 5555 data.txt
```

Если аргументы не переданы, сервер стартует на порту `5555` и использует `data.txt`.

Сервер реализован кроссплатформенно: Linux/macOS (POSIX sockets) и Windows (Winsock2).

### Протокол сервера

Сервер принимает текстовые команды в формате `CMD\targ1\targ2...` (разделитель — tab, строки заканчиваются `\n`).

Примеры команд:
- `PING`
- `REGISTER\tuser\tpass`
- `LOGIN\tuser\tpass`
- `ADD_FRIEND\tuser\tpeer`
- `CREATE_GROUP\tuser\tgroup`
- `SEND_DM\tfrom\tto\ttext`
- `GET_DM\tuser\tpeer`
- `SEND_GROUP\tfrom\tgroup\ttext`
- `GET_GROUP\tgroup`

Ответы сервера: `OK\t...` или `ERR\t...`.

> Для красивого интерфейса клиента нужен терминал с поддержкой ANSI-цветов и UTF-8.


### Troubleshooting (Windows)
If you saw raw sequences like `[2J` and garbled text before, update to this version: the client now initializes terminal support automatically (UTF-8 + VT mode) and falls back to plain text when ANSI is unavailable.
