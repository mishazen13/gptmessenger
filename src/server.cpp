#include "server.hpp"

#include "storage.hpp"

#include <algorithm>
#include <chrono>
#include <cerrno>
#include <ctime>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <optional>
#include <sstream>
#include <thread>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

MessengerServer::MessengerServer(int port, std::string storage_path) : port_(port), storage_path_(std::move(storage_path)) {}

std::string MessengerServer::dm_key(std::string a, std::string b) {
    if (a > b) {
        std::swap(a, b);
    }
    return a + "|" + b;
}

std::string MessengerServer::timestamp() {
    auto now = std::chrono::system_clock::now();
    std::time_t t = std::chrono::system_clock::to_time_t(now);
    std::tm tm{};
    localtime_r(&t, &tm);
    std::ostringstream os;
    os << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    return os.str();
}

std::vector<std::string> MessengerServer::split_tab(const std::string &line) {
    std::vector<std::string> parts;
    std::stringstream ss(line);
    std::string item;
    while (std::getline(ss, item, '\t')) {
        parts.push_back(item);
    }
    return parts;
}

std::string MessengerServer::escape_field(const std::string &value) {
    std::string out;
    out.reserve(value.size());
    for (char c : value) {
        if (c == '\\' || c == '|' || c == ';' || c == ',') {
            out.push_back('\\');
        }
        out.push_back(c);
    }
    return out;
}

std::string MessengerServer::serialize_messages(const std::vector<Message> &messages) {
    std::ostringstream os;
    bool first = true;
    for (const auto &m : messages) {
        if (!first) {
            os << ';';
        }
        os << m.id << ',' << escape_field(m.from) << ',' << escape_field(m.timestamp) << ',';
        if (m.reply_to) {
            os << *m.reply_to;
        } else {
            os << '-';
        }
        os << ',' << escape_field(m.text);
        first = false;
    }
    return os.str();
}

void MessengerServer::load() {
    std::lock_guard<std::mutex> lock(mu_);
    Storage::load(storage_path_, users_, groups_, dm_, next_message_id_);
}

void MessengerServer::save() {
    Storage::save(storage_path_, users_, groups_, dm_, next_message_id_);
}

std::string MessengerServer::handle_command(const std::string &line) {
    auto p = split_tab(line);
    if (p.empty()) {
        return "ERR\tempty command";
    }

    std::lock_guard<std::mutex> lock(mu_);
    const std::string &cmd = p[0];

    if (cmd == "PING") {
        return "OK\tPONG";
    }
    if (cmd == "REGISTER") {
        if (p.size() != 3) return "ERR\tusage REGISTER\\tuser\\tpass";
        if (users_.count(p[1])) return "ERR\tuser exists";
        users_[p[1]] = User{p[1], p[2], {}};
        save();
        return "OK\tregistered";
    }
    if (cmd == "LOGIN") {
        if (p.size() != 3) return "ERR\tusage LOGIN\\tuser\\tpass";
        auto it = users_.find(p[1]);
        if (it == users_.end() || it->second.password != p[2]) return "ERR\tbad credentials";
        return "OK\tlogged";
    }
    if (cmd == "ADD_FRIEND") {
        if (p.size() != 3) return "ERR\tusage ADD_FRIEND\\tuser\\tpeer";
        if (!users_.count(p[1]) || !users_.count(p[2]) || p[1] == p[2]) return "ERR\tbad users";
        users_[p[1]].friends.insert(p[2]);
        users_[p[2]].friends.insert(p[1]);
        save();
        return "OK\tfriend added";
    }
    if (cmd == "REMOVE_FRIEND") {
        if (p.size() != 3) return "ERR\tusage REMOVE_FRIEND\\tuser\\tpeer";
        if (!users_.count(p[1])) return "ERR\tunknown user";
        users_[p[1]].friends.erase(p[2]);
        if (users_.count(p[2])) users_[p[2]].friends.erase(p[1]);
        save();
        return "OK\tfriend removed";
    }
    if (cmd == "CREATE_GROUP") {
        if (p.size() != 3) return "ERR\tusage CREATE_GROUP\\tuser\\tgroup";
        if (!users_.count(p[1])) return "ERR\tunknown user";
        if (groups_.count(p[2])) return "ERR\tgroup exists";
        Group g;
        g.name = p[2];
        g.members.insert(p[1]);
        groups_[p[2]] = g;
        save();
        return "OK\tgroup created";
    }
    if (cmd == "JOIN_GROUP") {
        if (p.size() != 3) return "ERR\tusage JOIN_GROUP\\tuser\\tgroup";
        if (!users_.count(p[1])) return "ERR\tunknown user";
        auto it = groups_.find(p[2]);
        if (it == groups_.end()) return "ERR\tgroup not found";
        it->second.members.insert(p[1]);
        save();
        return "OK\tjoined";
    }
    if (cmd == "SEND_DM") {
        if (p.size() < 4) return "ERR\tusage SEND_DM\\tfrom\\tto\\ttext";
        if (!users_.count(p[1]) || !users_.count(p[2])) return "ERR\tunknown user";
        if (!users_[p[1]].friends.count(p[2])) return "ERR\tnot friends";
        Message m{next_message_id_++, p[1], p[3], timestamp(), std::nullopt};
        dm_[dm_key(p[1], p[2])].push_back(m);
        save();
        return "OK\t" + std::to_string(m.id);
    }
    if (cmd == "REPLY_DM") {
        if (p.size() < 5) return "ERR\tusage REPLY_DM\\tfrom\\tto\\treply_id\\ttext";
        auto key = dm_key(p[1], p[2]);
        int reply_id = std::stoi(p[3]);
        auto &msgs = dm_[key];
        auto it = std::find_if(msgs.begin(), msgs.end(), [&](const Message &m) { return m.id == reply_id; });
        if (it == msgs.end()) return "ERR\treply target not found";
        Message m{next_message_id_++, p[1], p[4], timestamp(), reply_id};
        msgs.push_back(m);
        save();
        return "OK\t" + std::to_string(m.id);
    }
    if (cmd == "DELETE_DM") {
        if (p.size() != 4) return "ERR\tusage DELETE_DM\\tuser\\tpeer\\tid";
        auto key = dm_key(p[1], p[2]);
        int id = std::stoi(p[3]);
        auto &msgs = dm_[key];
        auto it = std::find_if(msgs.begin(), msgs.end(), [&](const Message &m) { return m.id == id; });
        if (it == msgs.end()) return "ERR\tmessage not found";
        if (it->from != p[1]) return "ERR\tonly owner can delete";
        msgs.erase(it);
        save();
        return "OK\tdeleted";
    }
    if (cmd == "GET_DM") {
        if (p.size() != 3) return "ERR\tusage GET_DM\\tuser\\tpeer";
        auto key = dm_key(p[1], p[2]);
        return "OK\t" + serialize_messages(dm_[key]);
    }
    if (cmd == "SEND_GROUP") {
        if (p.size() < 4) return "ERR\tusage SEND_GROUP\\tfrom\\tgroup\\ttext";
        auto git = groups_.find(p[2]);
        if (git == groups_.end()) return "ERR\tgroup not found";
        if (!git->second.members.count(p[1])) return "ERR\tnot a member";
        Message m{next_message_id_++, p[1], p[3], timestamp(), std::nullopt};
        git->second.messages.push_back(m);
        save();
        return "OK\t" + std::to_string(m.id);
    }
    if (cmd == "REPLY_GROUP") {
        if (p.size() < 5) return "ERR\tusage REPLY_GROUP\\tfrom\\tgroup\\treply_id\\ttext";
        auto git = groups_.find(p[2]);
        if (git == groups_.end()) return "ERR\tgroup not found";
        int reply_id = std::stoi(p[3]);
        auto &msgs = git->second.messages;
        auto it = std::find_if(msgs.begin(), msgs.end(), [&](const Message &m) { return m.id == reply_id; });
        if (it == msgs.end()) return "ERR\treply target not found";
        Message m{next_message_id_++, p[1], p[4], timestamp(), reply_id};
        msgs.push_back(m);
        save();
        return "OK\t" + std::to_string(m.id);
    }
    if (cmd == "DELETE_GROUP_MSG") {
        if (p.size() != 4) return "ERR\tusage DELETE_GROUP_MSG\\tuser\\tgroup\\tid";
        auto git = groups_.find(p[2]);
        if (git == groups_.end()) return "ERR\tgroup not found";
        int id = std::stoi(p[3]);
        auto &msgs = git->second.messages;
        auto it = std::find_if(msgs.begin(), msgs.end(), [&](const Message &m) { return m.id == id; });
        if (it == msgs.end()) return "ERR\tmessage not found";
        if (it->from != p[1]) return "ERR\tonly owner can delete";
        msgs.erase(it);
        save();
        return "OK\tdeleted";
    }
    if (cmd == "GET_GROUP") {
        if (p.size() != 2) return "ERR\tusage GET_GROUP\\tgroup";
        auto git = groups_.find(p[1]);
        if (git == groups_.end()) return "ERR\tgroup not found";
        return "OK\t" + serialize_messages(git->second.messages);
    }

    return "ERR\tunknown command";
}

void MessengerServer::run() {
    load();

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        std::cerr << "Failed to create socket\n";
        return;
    }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(static_cast<uint16_t>(port_));

    if (bind(server_fd, reinterpret_cast<sockaddr *>(&addr), sizeof(addr)) < 0) {
        std::cerr << "Bind failed: " << std::strerror(errno) << "\n";
        close(server_fd);
        return;
    }

    if (listen(server_fd, 16) < 0) {
        std::cerr << "Listen failed\n";
        close(server_fd);
        return;
    }

    std::cout << "Messenger server listening on 0.0.0.0:" << port_ << "\n";

    while (true) {
        int client_fd = accept(server_fd, nullptr, nullptr);
        if (client_fd < 0) {
            continue;
        }

        std::thread([this, client_fd]() {
            std::string buffer;
            char temp[1024];
            while (true) {
                ssize_t n = recv(client_fd, temp, sizeof(temp), 0);
                if (n <= 0) {
                    break;
                }
                buffer.append(temp, temp + n);
                std::size_t pos;
                while ((pos = buffer.find('\n')) != std::string::npos) {
                    std::string line = buffer.substr(0, pos);
                    if (!line.empty() && line.back() == '\r') {
                        line.pop_back();
                    }
                    buffer.erase(0, pos + 1);
                    if (line == "QUIT") {
                        close(client_fd);
                        return;
                    }
                    std::string response = handle_command(line) + "\n";
                    send(client_fd, response.c_str(), response.size(), 0);
                }
            }
            close(client_fd);
        }).detach();
    }
}
