cmake_minimum_required(VERSION 3.15)
project(SaasMatematico VERSION 1.0)

# Usaremos C++17 
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)

include_directories(include)
include_directories(src)

add_executable(servidor_api 
    src/main.cpp
    src/router/Router.cpp
    src/math/ExpressionParser.cpp
    src/math/FunctionAnalyzer.cpp
)

target_compile_options(servidor_api PRIVATE -Wall -Wextra -Wpedantic)
