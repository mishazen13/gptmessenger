#include "messenger.hpp"

#include "storage.hpp"
#include "ui.hpp"

#include <algorithm>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <optional>
#include <sstream>

Messenger::Messenger(std::string storage_path) : storage_path_(std::move(storage_path)) {}

void Messenger::run() {
    load();
    while (true) {
        ui::liquid_glass_header("C++ Liquid Glass Messenger", "Регистрация, логин, друзья, группы, ответы, удаление, анимации");
        ui::box("Главное меню", {
                                 "1) Регистрация",
                                 "2) Логин",
                                 "3) Выход",
                             });
        int choice = ui::choose_int("Выберите пункт [1-3]: ", 1, 3);
        if (choice == 1) {
            register_user();
        } else if (choice == 2) {
            login_user();
        } else {
            save();
            std::cout << "До встречи!\n";
            return;
        }
    }
}

std::string Messenger::timestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tm{};
#ifdef _WIN32
    localtime_s(&tm, &t);
#else
    localtime_r(&t, &tm);
#endif
    std::ostringstream os;
    os << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return os.str();
}

std::string Messenger::dm_key(std::string a, std::string b) {
    if (a > b) {
        std::swap(a, b);
    }
    return a + "|" + b;
}

void Messenger::register_user() {
    ui::liquid_glass_header("Регистрация", "Создайте новый аккаунт");
    std::string username = ui::input("Логин: ");
    std::string password = ui::input("Пароль: ");
    if (username.empty() || password.empty()) {
        std::cout << "Поля не могут быть пустыми.\n";
        ui::sleep_ms(800);
        return;
    }
    if (users_.count(username)) {
        std::cout << "Пользователь уже существует.\n";
        ui::sleep_ms(900);
        return;
    }
    users_[username] = User{username, password, {}};
    ui::pulse_animation("Создание аккаунта");
    save();
    std::cout << "Успешно зарегистрировано.\n";
    ui::sleep_ms(900);
}

void Messenger::login_user() {
    ui::liquid_glass_header("Логин", "Войдите в существующий аккаунт");
    std::string username = ui::input("Логин: ");
    std::string password = ui::input("Пароль: ");
    auto it = users_.find(username);
    if (it == users_.end() || it->second.password != password) {
        std::cout << "Неверный логин или пароль.\n";
        ui::sleep_ms(1000);
        return;
    }
    ui::pulse_animation("Вход");
    user_session(username);
}

void Messenger::user_session(const std::string &username) {
    while (true) {
        ui::liquid_glass_header("Аккаунт: " + username, "Эффект liquid glass + анимированная консоль");
        ui::box("Меню пользователя", {
                                         "1) Добавить в друзья",
                                         "2) Удалить из друзей",
                                         "3) Открыть чат с другом",
                                         "4) Создать группу",
                                         "5) Открыть группу",
                                         "6) Список друзей",
                                         "7) Выйти из аккаунта",
                                     });
        int choice = ui::choose_int("Выберите [1-7]: ", 1, 7);
        if (choice == 1) {
            add_friend(username);
        } else if (choice == 2) {
            remove_friend(username);
        } else if (choice == 3) {
            open_dm(username);
        } else if (choice == 4) {
            create_group(username);
        } else if (choice == 5) {
            open_group(username);
        } else if (choice == 6) {
            list_friends(username);
        } else {
            save();
            return;
        }
    }
}

void Messenger::list_friends(const std::string &username) {
    ui::liquid_glass_header("Друзья", "Ваш список контактов");
    std::vector<std::string> lines;
    for (const auto &f : users_[username].friends) {
        lines.emplace_back("• " + f);
    }
    if (lines.empty()) {
        lines.push_back("У вас пока нет друзей.");
    }
    ui::box("Список друзей", lines);
    ui::input("Enter для продолжения...");
}

void Messenger::add_friend(const std::string &username) {
    ui::liquid_glass_header("Добавление друга", "Двустороннее добавление");
    std::string peer = ui::input("Введите логин: ");
    if (!users_.count(peer) || peer == username) {
        std::cout << "Некорректный пользователь.\n";
        ui::sleep_ms(900);
        return;
    }
    users_[username].friends.insert(peer);
    users_[peer].friends.insert(username);
    save();
    std::cout << "Пользователь добавлен в друзья.\n";
    ui::sleep_ms(900);
}

void Messenger::remove_friend(const std::string &username) {
    ui::liquid_glass_header("Удаление друга", "Удаление для обеих сторон");
    std::string peer = ui::input("Кого удалить: ");
    users_[username].friends.erase(peer);
    if (users_.count(peer)) {
        users_[peer].friends.erase(username);
    }
    save();
    std::cout << "Если друг существовал — он удалён.\n";
    ui::sleep_ms(900);
}

void Messenger::create_group(const std::string &username) {
    ui::liquid_glass_header("Создание группы", "Группа создается вместе с владельцем");
    std::string name = ui::input("Название группы: ");
    if (name.empty() || groups_.count(name)) {
        std::cout << "Пустое или занятое имя группы.\n";
        ui::sleep_ms(900);
        return;
    }
    Group g;
    g.name = name;
    g.members.insert(username);
    groups_[name] = g;
    save();
    std::cout << "Группа создана.\n";
    ui::sleep_ms(900);
}

void Messenger::render_messages(const std::vector<Message> &msgs, const std::string &title) {
    ui::liquid_glass_header(title, "Контекстное меню: ответ и удаление");
    if (msgs.empty()) {
        ui::box("Сообщения", {"Пока нет сообщений"});
        return;
    }
    std::vector<std::string> lines;
    for (const auto &m : msgs) {
        std::ostringstream os;
        os << "#" << m.id << " [" << m.timestamp << "] " << m.from << ": " << m.text;
        if (m.reply_to) {
            os << " (reply to #" << *m.reply_to << ")";
        }
        lines.push_back(os.str());
    }
    ui::box("Сообщения", lines);
}

void Messenger::message_context_menu(std::vector<Message> &msgs, const std::string &username) {
    if (msgs.empty()) {
        std::cout << "Сообщений нет.\n";
        ui::sleep_ms(700);
        return;
    }
    int id = ui::choose_int("ID сообщения: ", 1, 1000000000);
    auto it = std::find_if(msgs.begin(), msgs.end(), [&](const Message &m) { return m.id == id; });
    if (it == msgs.end()) {
        std::cout << "Сообщение не найдено.\n";
        ui::sleep_ms(700);
        return;
    }
    ui::box("Контекстное меню", {"1) Ответить", "2) Удалить", "3) Отмена"});
    int action = ui::choose_int("Выберите [1-3]: ", 1, 3);
    if (action == 1) {
        std::string text = ui::input("Текст ответа: ");
        if (text.empty()) {
            return;
        }
        msgs.push_back({next_message_id_++, username, text, timestamp(), id});
        std::cout << "Ответ отправлен.\n";
    } else if (action == 2) {
        if (it->from != username) {
            std::cout << "Можно удалять только свои сообщения.\n";
        } else {
            msgs.erase(it);
            std::cout << "Сообщение удалено.\n";
        }
    }
    save();
    ui::sleep_ms(900);
}

void Messenger::open_dm(const std::string &username) {
    ui::liquid_glass_header("Личный чат", "Только с пользователями из друзей");
    std::string peer = ui::input("Логин друга: ");
    if (!users_[username].friends.count(peer)) {
        std::cout << "Этот пользователь не в друзьях.\n";
        ui::sleep_ms(900);
        return;
    }
    std::string key = dm_key(username, peer);
    auto &msgs = dm_[key];
    while (true) {
        render_messages(msgs, "Чат: " + username + " ↔ " + peer);
        ui::box("Действия", {"1) Отправить сообщение", "2) Контекстное меню", "3) Назад"});
        int c = ui::choose_int("Выберите [1-3]: ", 1, 3);
        if (c == 1) {
            std::string text = ui::input("Сообщение: ");
            if (!text.empty()) {
                msgs.push_back({next_message_id_++, username, text, timestamp(), std::nullopt});
                save();
                ui::pulse_animation("Отправка");
            }
        } else if (c == 2) {
            message_context_menu(msgs, username);
        } else {
            break;
        }
    }
}

void Messenger::open_group(const std::string &username) {
    ui::liquid_glass_header("Группы", "Открыть или вступить в группу");
    std::string name = ui::input("Название группы: ");
    auto it = groups_.find(name);
    if (it == groups_.end()) {
        std::cout << "Группа не найдена.\n";
        ui::sleep_ms(900);
        return;
    }
    it->second.members.insert(username);
    while (true) {
        render_messages(it->second.messages, "Группа: " + name);
        ui::box("Действия", {"1) Отправить сообщение", "2) Контекстное меню", "3) Участники", "4) Назад"});
        int c = ui::choose_int("Выберите [1-4]: ", 1, 4);
        if (c == 1) {
            std::string text = ui::input("Сообщение в группу: ");
            if (!text.empty()) {
                it->second.messages.push_back({next_message_id_++, username, text, timestamp(), std::nullopt});
                save();
                ui::pulse_animation("Отправка");
            }
        } else if (c == 2) {
            message_context_menu(it->second.messages, username);
        } else if (c == 3) {
            std::vector<std::string> lines;
            for (const auto &m : it->second.members) {
                lines.push_back("• " + m);
            }
            ui::box("Участники", lines);
            ui::input("Enter для продолжения...");
        } else {
            save();
            break;
        }
    }
}

void Messenger::load() {
    Storage::load(storage_path_, users_, groups_, dm_, next_message_id_);
}

void Messenger::save() const {
    Storage::save(storage_path_, users_, groups_, dm_, next_message_id_);
}
