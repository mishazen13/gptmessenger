cmake_minimum_required(VERSION 3.16)
project(gptmessenger LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(gptmessenger
    src/main.cpp
    src/messenger.cpp
    src/storage.cpp
    src/ui.cpp
)
target_include_directories(gptmessenger PRIVATE include)

add_executable(gptmessenger_server
    src/server_main.cpp
    src/server.cpp
    src/storage.cpp
)
target_include_directories(gptmessenger_server PRIVATE include)
