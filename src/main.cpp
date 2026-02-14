#include <algorithm>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <optional>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

namespace ui {
constexpr const char *RESET = "\033[0m";
constexpr const char *BOLD = "\033[1m";
constexpr const char *DIM = "\033[2m";
constexpr const char *CYAN = "\033[38;5;87m";
constexpr const char *BLUE = "\033[38;5;111m";
constexpr const char *WHITE = "\033[38;5;255m";
constexpr const char *PANEL = "\033[48;5;238m";
constexpr const char *GLASS = "\033[48;5;250m";

void clear() { std::cout << "\033[2J\033[H"; }

void sleep_ms(int ms) { std::this_thread::sleep_for(std::chrono::milliseconds(ms)); }

void line(const std::string &text = "", int width = 72) {
    std::cout << PANEL << WHITE << "│ " << std::left << std::setw(width - 4) << text << " │" << RESET << "\n";
}

void box(const std::string &title, const std::vector<std::string> &rows) {
    constexpr int width = 72;
    std::cout << PANEL << CYAN << "┌" << std::string(width - 2, '-') << "┐" << RESET << "\n";
    line(title, width);
    std::cout << PANEL << CYAN << "├" << std::string(width - 2, '-') << "┤" << RESET << "\n";
    for (const auto &r : rows) {
        line(r, width);
    }
    std::cout << PANEL << CYAN << "└" << std::string(width - 2, '-') << "┘" << RESET << "\n";
}

void liquid_glass_header(const std::string &title, const std::string &subtitle) {
    clear();
    std::cout << GLASS << "                                                                        " << RESET << "\n";
    std::cout << GLASS << "   " << BOLD << BLUE << title << RESET << GLASS;
    std::cout << std::string(std::max(1, 70 - static_cast<int>(title.size())), ' ') << RESET << "\n";
    std::cout << GLASS << "   " << DIM << WHITE << subtitle << RESET << GLASS;
    std::cout << std::string(std::max(1, 70 - static_cast<int>(subtitle.size())), ' ') << RESET << "\n";
    std::cout << GLASS << "                                                                        " << RESET << "\n\n";
}

void pulse_animation(const std::string &text) {
    for (int i = 0; i < 3; ++i) {
        std::cout << CYAN << text << std::string(i + 1, '.') << RESET << "\r" << std::flush;
        sleep_ms(140);
    }
    std::cout << std::string(text.size() + 5, ' ') << "\r";
}

std::string input(const std::string &prompt) {
    std::cout << CYAN << prompt << RESET;
    std::string value;
    std::getline(std::cin, value);
    return value;
}

int choose_int(const std::string &prompt, int min, int max) {
    while (true) {
        std::string s = input(prompt);
        std::stringstream ss(s);
        int value = 0;
        if (ss >> value && !(ss >> s) && value >= min && value <= max) {
            return value;
        }
        std::cout << "Неверный ввод. Попробуйте снова.\n";
    }
}
} // namespace ui

struct Message {
    int id{};
    std::string from;
    std::string text;
    std::string timestamp;
    std::optional<int> reply_to;
};

struct User {
    std::string username;
    std::string password;
    std::set<std::string> friends;
};

struct Group {
    std::string name;
    std::set<std::string> members;
    std::vector<Message> messages;
};

class Messenger {
  public:
    void run() {
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

  private:
    std::map<std::string, User> users_;
    std::map<std::string, Group> groups_;
    std::map<std::string, std::vector<Message>> dm_;
    int next_message_id_ = 1;

    static std::string timestamp() {
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

    static std::string dm_key(std::string a, std::string b) {
        if (a > b) {
            std::swap(a, b);
        }
        return a + "|" + b;
    }

    void register_user() {
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

    void login_user() {
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

    void user_session(const std::string &username) {
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

    void list_friends(const std::string &username) {
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

    void add_friend(const std::string &username) {
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

    void remove_friend(const std::string &username) {
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

    void create_group(const std::string &username) {
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

    void render_messages(const std::vector<Message> &msgs, const std::string &title) {
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

    void message_context_menu(std::vector<Message> &msgs, const std::string &username) {
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

    void open_dm(const std::string &username) {
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

    void open_group(const std::string &username) {
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

    void load() {
        std::ifstream in("data.txt");
        if (!in) {
            return;
        }

        users_.clear();
        groups_.clear();
        dm_.clear();

        std::string section;
        std::string line;
        while (std::getline(in, line)) {
            if (line.rfind("[", 0) == 0) {
                section = line;
                continue;
            }
            if (line.empty()) {
                continue;
            }
            if (section == "[meta]") {
                next_message_id_ = std::stoi(line);
            } else if (section == "[users]") {
                std::stringstream ss(line);
                std::string username, password, friends;
                std::getline(ss, username, '\t');
                std::getline(ss, password, '\t');
                std::getline(ss, friends, '\t');
                User u{username, password, {}};
                std::stringstream fs(friends);
                std::string f;
                while (std::getline(fs, f, ',')) {
                    if (!f.empty()) {
                        u.friends.insert(f);
                    }
                }
                users_[username] = u;
            } else if (section == "[groups]") {
                std::stringstream ss(line);
                std::string gname, members;
                std::getline(ss, gname, '\t');
                std::getline(ss, members, '\t');
                Group g;
                g.name = gname;
                std::stringstream ms(members);
                std::string m;
                while (std::getline(ms, m, ',')) {
                    if (!m.empty()) {
                        g.members.insert(m);
                    }
                }
                groups_[gname] = g;
            } else if (section == "[dm]") {
                std::stringstream ss(line);
                std::string key, sid, from, time, reply, text;
                std::getline(ss, key, '\t');
                std::getline(ss, sid, '\t');
                std::getline(ss, from, '\t');
                std::getline(ss, time, '\t');
                std::getline(ss, reply, '\t');
                std::getline(ss, text, '\t');
                Message m;
                m.id = std::stoi(sid);
                m.from = from;
                m.timestamp = time;
                m.text = text;
                if (reply != "-") {
                    m.reply_to = std::stoi(reply);
                }
                dm_[key].push_back(m);
            } else if (section == "[group_messages]") {
                std::stringstream ss(line);
                std::string gname, sid, from, time, reply, text;
                std::getline(ss, gname, '\t');
                std::getline(ss, sid, '\t');
                std::getline(ss, from, '\t');
                std::getline(ss, time, '\t');
                std::getline(ss, reply, '\t');
                std::getline(ss, text, '\t');
                Message m;
                m.id = std::stoi(sid);
                m.from = from;
                m.timestamp = time;
                m.text = text;
                if (reply != "-") {
                    m.reply_to = std::stoi(reply);
                }
                groups_[gname].name = gname;
                groups_[gname].messages.push_back(m);
            }
        }
    }

    void save() {
        std::ofstream out("data.txt");
        out << "[meta]\n" << next_message_id_ << "\n";

        out << "[users]\n";
        for (const auto &[name, u] : users_) {
            out << name << '\t' << u.password << '\t';
            bool first = true;
            for (const auto &f : u.friends) {
                if (!first) {
                    out << ',';
                }
                out << f;
                first = false;
            }
            out << "\n";
        }

        out << "[groups]\n";
        for (const auto &[name, g] : groups_) {
            out << name << '\t';
            bool first = true;
            for (const auto &m : g.members) {
                if (!first) {
                    out << ',';
                }
                out << m;
                first = false;
            }
            out << "\n";
        }

        out << "[dm]\n";
        for (const auto &[key, messages] : dm_) {
            for (const auto &m : messages) {
                out << key << '\t' << m.id << '\t' << m.from << '\t' << m.timestamp << '\t';
                if (m.reply_to) {
                    out << *m.reply_to;
                } else {
                    out << '-';
                }
                out << '\t' << m.text << "\n";
            }
        }

        out << "[group_messages]\n";
        for (const auto &[gname, g] : groups_) {
            for (const auto &m : g.messages) {
                out << gname << '\t' << m.id << '\t' << m.from << '\t' << m.timestamp << '\t';
                if (m.reply_to) {
                    out << *m.reply_to;
                } else {
                    out << '-';
                }
                out << '\t' << m.text << "\n";
            }
        }
    }
};

int main() {
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    Messenger app;
    app.run();
    return 0;
}
