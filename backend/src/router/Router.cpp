#include "router/Router.hpp"

#include "math/FunctionAnalyzer.hpp"

#include <arpa/inet.h>
#include <cerrno>
#include <cstring>
#include <iostream>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <sys/socket.h>
#include <unistd.h>

Router::Router() {
    // Sin estado mutable por ahora.
}

void Router::iniciar(int puerto) {
    const int serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) {
        throw std::runtime_error("No se pudo crear socket.");
    }

    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(static_cast<uint16_t>(puerto));

    if (bind(serverFd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        close(serverFd);
        throw std::runtime_error("No se pudo enlazar el puerto.");
    }

    if (listen(serverFd, 10) < 0) {
        close(serverFd);
        throw std::runtime_error("No se pudo escuchar en el puerto.");
    }

    std::cout << "Backend C++ escuchando en http://localhost:" << puerto << "\n";

    while (true) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        const int clientFd = accept(serverFd, reinterpret_cast<sockaddr*>(&clientAddr), &clientLen);
        if (clientFd < 0) {
            std::cerr << "Error aceptando cliente: " << std::strerror(errno) << "\n";
            continue;
        }

        std::string request;
        char buffer[4096];
        while (true) {
            const ssize_t n = recv(clientFd, buffer, sizeof(buffer), 0);
            if (n <= 0) {
                break;
            }
            request.append(buffer, static_cast<std::size_t>(n));
            if (request.find("\r\n\r\n") != std::string::npos && static_cast<std::size_t>(n) < sizeof(buffer)) {
                break;
            }
        }

        const auto startLine = parsearRequestLine(request);
        const std::string metodo = startLine.count("method") > 0 ? startLine.at("method") : "";
        const std::string ruta = startLine.count("path") > 0 ? startLine.at("path") : "";
        const std::string body = extraerBody(request);

        int statusCode = 200;
        std::string responseBody;
        try {
            responseBody = manejarSolicitud(metodo, ruta, body, statusCode);
        } catch (const std::exception& ex) {
            statusCode = 500;
            responseBody = std::string("{\"error\":\"") + ex.what() + "\"}";
        }

        const std::string response = construirRespuestaHttp(statusCode, "application/json", responseBody);
        send(clientFd, response.c_str(), response.size(), 0);
        close(clientFd);
    }
}

std::unordered_map<std::string, std::string> Router::parsearRequestLine(const std::string& request) {
    std::unordered_map<std::string, std::string> out;
    const std::size_t lineEnd = request.find("\r\n");
    if (lineEnd == std::string::npos) {
        return out;
    }

    std::istringstream line(request.substr(0, lineEnd));
    std::string method;
    std::string path;
    std::string version;
    line >> method >> path >> version;
    out["method"] = method;
    out["path"] = path;
    out["version"] = version;
    return out;
}

std::string Router::extraerBody(const std::string& request) {
    const std::size_t sep = request.find("\r\n\r\n");
    if (sep == std::string::npos) {
        return "";
    }
    return request.substr(sep + 4);
}

static bool extractJsonString(const std::string& json, const std::string& key, std::string& value) {
    const std::regex rgx("\\\"" + key + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
    std::smatch m;
    if (std::regex_search(json, m, rgx)) {
        value = m[1].str();
        return true;
    }
    return false;
}

static bool extractJsonNumber(const std::string& json, const std::string& key, double& value) {
    const std::regex rgx("\\\"" + key + "\\\"\\s*:\\s*(-?[0-9]+(?:\\\\.[0-9]+)?)");
    std::smatch m;
    if (std::regex_search(json, m, rgx)) {
        value = std::stod(m[1].str());
        return true;
    }
    return false;
}

std::string Router::manejarSolicitud(const std::string& metodo, const std::string& ruta, const std::string& body, int& statusCode) const {
    if (metodo == "OPTIONS") {
        statusCode = 204;
        return "";
    }

    if (metodo == "POST" && ruta == "/api/plot") {
        std::string expression;
        double xMin = -10.0;
        double xMax = 10.0;
        double samples = 500.0;
        double taylorOrder = 6.0;

        if (!extractJsonString(body, "expression", expression) || expression.empty()) {
            statusCode = 400;
            return "{\"error\":\"Debes enviar expression en el body JSON.\"}";
        }

        extractJsonNumber(body, "xMin", xMin);
        extractJsonNumber(body, "xMax", xMax);
        extractJsonNumber(body, "samples", samples);
        extractJsonNumber(body, "taylorOrder", taylorOrder);

        try {
            const AnalysisResult result = FunctionAnalyzer::analyze(
                expression,
                xMin,
                xMax,
                static_cast<int>(samples),
                static_cast<int>(taylorOrder));
            statusCode = 200;
            return FunctionAnalyzer::toJson(result);
        } catch (const std::exception& ex) {
            statusCode = 400;
            return std::string("{\"error\":\"") + ex.what() + "\"}";
        }
    }

    statusCode = 404;
    return "{\"error\":\"Ruta no encontrada en backend C++.\"}";
}

std::string Router::construirRespuestaHttp(int statusCode, const std::string& contentType, const std::string& body) {
    std::ostringstream out;
    std::string reason = "OK";
    if (statusCode == 400) {
        reason = "Bad Request";
    } else if (statusCode == 404) {
        reason = "Not Found";
    } else if (statusCode == 500) {
        reason = "Internal Server Error";
    } else if (statusCode == 204) {
        reason = "No Content";
    }

    out << "HTTP/1.1 " << statusCode << " " << reason << "\r\n";
    out << "Content-Type: " << contentType << "\r\n";
    out << "Access-Control-Allow-Origin: *\r\n";
    out << "Access-Control-Allow-Methods: POST, OPTIONS\r\n";
    out << "Access-Control-Allow-Headers: Content-Type\r\n";
    out << "Content-Length: " << body.size() << "\r\n";
    out << "Connection: close\r\n\r\n";
    out << body;
    return out.str();
}