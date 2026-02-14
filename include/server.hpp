#pragma once

#include "models.hpp"

#include <map>
#include <mutex>
#include <string>
#include <vector>

class MessengerServer {
  public:
    MessengerServer(int port, std::string storage_path = "data.txt");
    void run();

  private:
    int port_;
    std::string storage_path_;
    std::map<std::string, User> users_;
    std::map<std::string, Group> groups_;
    std::map<std::string, std::vector<Message>> dm_;
    int next_message_id_ = 1;
    std::mutex mu_;

    static std::string dm_key(std::string a, std::string b);
    static std::string timestamp();
    static std::vector<std::string> split_tab(const std::string &line);
    static std::string escape_field(const std::string &value);
    static std::string serialize_messages(const std::vector<Message> &messages);

    std::string handle_command(const std::string &line);
    void load();
    void save();
};
