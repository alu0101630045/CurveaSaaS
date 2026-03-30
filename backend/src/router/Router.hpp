#pragma once
#include <string>
#include <unordered_map>

class Router {
public:
    Router();
    void iniciar(int puerto);

private:
    std::string manejarSolicitud(const std::string& metodo, const std::string& ruta, const std::string& body, int& statusCode) const;
    static std::unordered_map<std::string, std::string> parsearRequestLine(const std::string& request);
    static std::string extraerBody(const std::string& request);
    static std::string construirRespuestaHttp(int statusCode, const std::string& contentType, const std::string& body);
};