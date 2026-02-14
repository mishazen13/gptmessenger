#pragma once

#include "models.hpp"

#include <map>
#include <string>
#include <vector>

class Messenger {
  public:
    explicit Messenger(std::string storage_path = "data.txt");
    void run();

  private:
    std::string storage_path_;
    std::map<std::string, User> users_;
    std::map<std::string, Group> groups_;
    std::map<std::string, std::vector<Message>> dm_;
    int next_message_id_ = 1;

    static std::string timestamp();
    static std::string dm_key(std::string a, std::string b);

    void register_user();
    void login_user();
    void user_session(const std::string &username);
    void list_friends(const std::string &username);
    void add_friend(const std::string &username);
    void remove_friend(const std::string &username);
    void create_group(const std::string &username);
    void render_messages(const std::vector<Message> &msgs, const std::string &title);
    void message_context_menu(std::vector<Message> &msgs, const std::string &username);
    void open_dm(const std::string &username);
    void open_group(const std::string &username);

    void load();
    void save() const;
};
