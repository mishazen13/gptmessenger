#include "ui.hpp"

#include <algorithm>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <thread>

#ifdef _WIN32
#include <windows.h>
#endif

namespace ui {
namespace {
bool g_use_ansi = true;
bool g_use_unicode = true;

constexpr const char *RESET = "\033[0m";
constexpr const char *BOLD = "\033[1m";
constexpr const char *DIM = "\033[2m";
constexpr const char *CYAN = "\033[38;5;87m";
constexpr const char *BLUE = "\033[38;5;111m";
constexpr const char *WHITE = "\033[38;5;255m";
constexpr const char *PANEL = "\033[48;5;238m";
constexpr const char *GLASS = "\033[48;5;250m";

std::string style(const char *code) { return g_use_ansi ? std::string(code) : std::string(); }
const char *glyph(const char *unicode, const char *ascii) { return g_use_unicode ? unicode : ascii; }
} // namespace

void initialize_terminal() {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);

    HANDLE h_out = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode = 0;
    if (h_out == INVALID_HANDLE_VALUE || !GetConsoleMode(h_out, &mode)) {
        g_use_ansi = false;
        g_use_unicode = false;
        return;
    }

    if (!SetConsoleMode(h_out, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING)) {
        g_use_ansi = false;
    }

    g_use_unicode = true;
#else
    g_use_ansi = true;
    g_use_unicode = true;
#endif
}

void clear() {
    if (g_use_ansi) {
        std::cout << "\033[2J\033[H" << std::flush;
    } else {
        std::cout << std::string(40, '\n') << std::flush;
    }
}

void sleep_ms(int ms) { std::this_thread::sleep_for(std::chrono::milliseconds(ms)); }

void line(const std::string &text, int width) {
    const char *v = glyph("│", "|");
    std::cout << style(PANEL) << style(WHITE) << v << " " << std::left << std::setw(width - 4) << text << " " << v << style(RESET) << "\n";
}

void box(const std::string &title, const std::vector<std::string> &rows) {
    constexpr int width = 72;
    const char *tl = glyph("┌", "+");
    const char *tr = glyph("┐", "+");
    const char *ml = glyph("├", "+");
    const char *mr = glyph("┤", "+");
    const char *bl = glyph("└", "+");
    const char *br = glyph("┘", "+");

    std::cout << style(PANEL) << style(CYAN) << tl << std::string(width - 2, '-') << tr << style(RESET) << "\n";
    line(title, width);
    std::cout << style(PANEL) << style(CYAN) << ml << std::string(width - 2, '-') << mr << style(RESET) << "\n";
    for (const auto &r : rows) {
        line(r, width);
    }
    std::cout << style(PANEL) << style(CYAN) << bl << std::string(width - 2, '-') << br << style(RESET) << "\n";
    std::cout << std::flush;
}

void liquid_glass_header(const std::string &title, const std::string &subtitle) {
    clear();
    std::cout << style(GLASS) << "                                                                        " << style(RESET) << "\n";
    std::cout << style(GLASS) << "   " << style(BOLD) << style(BLUE) << title << style(RESET) << style(GLASS);
    std::cout << std::string(std::max(1, 70 - static_cast<int>(title.size())), ' ') << style(RESET) << "\n";
    std::cout << style(GLASS) << "   " << style(DIM) << style(WHITE) << subtitle << style(RESET) << style(GLASS);
    std::cout << std::string(std::max(1, 70 - static_cast<int>(subtitle.size())), ' ') << style(RESET) << "\n";
    std::cout << style(GLASS) << "                                                                        " << style(RESET) << "\n\n";
    std::cout << std::flush;
}

void pulse_animation(const std::string &text) {
    for (int i = 0; i < 3; ++i) {
        std::cout << style(CYAN) << text << std::string(i + 1, '.') << style(RESET) << "\r" << std::flush;
        sleep_ms(140);
    }
    std::cout << std::string(text.size() + 5, ' ') << "\r" << std::flush;
}

std::string input(const std::string &prompt) {
    std::cout << style(CYAN) << prompt << style(RESET) << std::flush;
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
        std::cout << "Invalid input. Try again.\n";
    }
}

} // namespace ui
