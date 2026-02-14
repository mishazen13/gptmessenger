#include "storage.hpp"

#include <fstream>
#include <sstream>

void Storage::load(const std::string &path,
                   std::map<std::string, User> &users,
                   std::map<std::string, Group> &groups,
                   std::map<std::string, std::vector<Message>> &dm,
                   int &next_message_id) {
    std::ifstream in(path);
    if (!in) {
        return;
    }

    users.clear();
    groups.clear();
    dm.clear();

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
            next_message_id = std::stoi(line);
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
            users[username] = u;
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
            groups[gname] = g;
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
            dm[key].push_back(m);
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
            groups[gname].name = gname;
            groups[gname].messages.push_back(m);
        }
    }
}

void Storage::save(const std::string &path,
                   const std::map<std::string, User> &users,
                   const std::map<std::string, Group> &groups,
                   const std::map<std::string, std::vector<Message>> &dm,
                   int next_message_id) {
    std::ofstream out(path);
    out << "[meta]\n" << next_message_id << "\n";

    out << "[users]\n";
    for (const auto &[name, u] : users) {
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
    for (const auto &[name, g] : groups) {
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
    for (const auto &[key, messages] : dm) {
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
    for (const auto &[gname, g] : groups) {
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
