#include "messenger.hpp"
#include "ui.hpp"

#include <iostream>

int main() {
    std::ios::sync_with_stdio(false);
    ui::initialize_terminal();

    Messenger app;
    app.run();
    return 0;
}
