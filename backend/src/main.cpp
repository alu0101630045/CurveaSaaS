#include <iostream>
#include "router/Router.hpp"

int main() {
    std::cout << "Iniciando backend..." << std::endl;
    Router apiRouter;
    int puerto = 8080;
    apiRouter.iniciar(puerto);
    return 0;
}