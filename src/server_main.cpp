#include "server.hpp"

#include <cstdlib>
#include <iostream>
#include <string>

int main(int argc, char **argv) {
    int port = 5555;
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }

    std::string storage = "data.txt";
    if (argc > 2) {
        storage = argv[2];
    }

    std::cout << "Starting gptmessenger server on port " << port << " using storage: " << storage << "\n";
    MessengerServer server(port, storage);
    server.run();
    return EXIT_SUCCESS;
}
