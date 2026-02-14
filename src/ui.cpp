#include "ui.hpp"

#include <algorithm>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <thread>

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

void line(const std::string &text, int width) {
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
