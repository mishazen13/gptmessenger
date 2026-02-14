#pragma once

#include <string>
#include <vector>

namespace ui {

void clear();
void sleep_ms(int ms);
void line(const std::string &text = "", int width = 72);
void box(const std::string &title, const std::vector<std::string> &rows);
void liquid_glass_header(const std::string &title, const std::string &subtitle);
void pulse_animation(const std::string &text);
std::string input(const std::string &prompt);
int choose_int(const std::string &prompt, int min, int max);

} // namespace ui
