#pragma once

#include "models.hpp"

#include <map>
#include <string>

class Storage {
  public:
    static void load(const std::string &path,
                     std::map<std::string, User> &users,
                     std::map<std::string, Group> &groups,
                     std::map<std::string, std::vector<Message>> &dm,
                     int &next_message_id);

    static void save(const std::string &path,
                     const std::map<std::string, User> &users,
                     const std::map<std::string, Group> &groups,
                     const std::map<std::string, std::vector<Message>> &dm,
                     int next_message_id);
};
