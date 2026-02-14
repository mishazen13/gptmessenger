#pragma once

#include <optional>
#include <set>
#include <string>
#include <vector>

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
