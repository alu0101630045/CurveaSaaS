#include "math/ExpressionParser.hpp"

#include <cctype>
#include <cmath>
#include <stack>
#include <stdexcept>

ExpressionParser::ExpressionParser(const std::string& expression)
    : rpn_(toRpn(tokenize(expression))) {}

bool ExpressionParser::isFunctionName(const std::string& name) {
    return name == "sin" || name == "cos" || name == "tan" || name == "exp" ||
           name == "log" || name == "sqrt" || name == "abs";
}

int ExpressionParser::precedence(const std::string& op) {
    if (op == "+" || op == "-") {
        return 1;
    }
    if (op == "*" || op == "/") {
        return 2;
    }
    if (op == "^") {
        return 3;
    }
    return -1;
}

bool ExpressionParser::rightAssociative(const std::string& op) {
    return op == "^";
}

std::vector<ExpressionParser::Token> ExpressionParser::tokenize(const std::string& expression) {
    std::vector<Token> tokens;
    std::size_t i = 0;

    while (i < expression.size()) {
        if (std::isspace(static_cast<unsigned char>(expression[i])) != 0) {
            i += 1;
            continue;
        }

        const char c = expression[i];
        if (std::isdigit(static_cast<unsigned char>(c)) != 0 || c == '.') {
            std::size_t j = i;
            while (j < expression.size()) {
                const char cj = expression[j];
                if (std::isdigit(static_cast<unsigned char>(cj)) == 0 && cj != '.') {
                    break;
                }
                j += 1;
            }
            tokens.push_back({TokenType::Number, expression.substr(i, j - i), std::stod(expression.substr(i, j - i))});
            i = j;
            continue;
        }

        if (std::isalpha(static_cast<unsigned char>(c)) != 0) {
            std::size_t j = i;
            while (j < expression.size() && std::isalpha(static_cast<unsigned char>(expression[j])) != 0) {
                j += 1;
            }
            const std::string word = expression.substr(i, j - i);
            if (word == "x") {
                tokens.push_back({TokenType::Variable, word, 0.0});
            } else if (isFunctionName(word)) {
                tokens.push_back({TokenType::Function, word, 0.0});
            } else if (word == "pi") {
                tokens.push_back({TokenType::Number, word, 3.14159265358979323846});
            } else if (word == "e") {
                tokens.push_back({TokenType::Number, word, 2.71828182845904523536});
            } else {
                throw std::runtime_error("Funcion o simbolo no soportado: " + word);
            }
            i = j;
            continue;
        }

        if (c == '(') {
            tokens.push_back({TokenType::LeftParen, "(", 0.0});
            i += 1;
            continue;
        }
        if (c == ')') {
            tokens.push_back({TokenType::RightParen, ")", 0.0});
            i += 1;
            continue;
        }

        if (c == '+' || c == '-' || c == '*' || c == '/' || c == '^') {
            const bool unaryMinus = c == '-' &&
                                    (tokens.empty() ||
                                     tokens.back().type == TokenType::Operator ||
                                     tokens.back().type == TokenType::LeftParen);
            if (unaryMinus) {
                tokens.push_back({TokenType::Number, "0", 0.0});
            }
            tokens.push_back({TokenType::Operator, std::string(1, c), 0.0});
            i += 1;
            continue;
        }

        throw std::runtime_error("Caracter no permitido en expresion.");
    }

    return tokens;
}

std::vector<ExpressionParser::Token> ExpressionParser::toRpn(const std::vector<Token>& tokens) {
    std::vector<Token> output;
    std::stack<Token> stack;

    for (const Token& token : tokens) {
        if (token.type == TokenType::Number || token.type == TokenType::Variable) {
            output.push_back(token);
            continue;
        }

        if (token.type == TokenType::Function) {
            stack.push(token);
            continue;
        }

        if (token.type == TokenType::Operator) {
            while (!stack.empty()) {
                const Token& top = stack.top();
                if (top.type == TokenType::Operator) {
                    const int pTop = precedence(top.text);
                    const int pTok = precedence(token.text);
                    if (pTop > pTok || (pTop == pTok && !rightAssociative(token.text))) {
                        output.push_back(top);
                        stack.pop();
                        continue;
                    }
                } else if (top.type == TokenType::Function) {
                    output.push_back(top);
                    stack.pop();
                    continue;
                }
                break;
            }
            stack.push(token);
            continue;
        }

        if (token.type == TokenType::LeftParen) {
            stack.push(token);
            continue;
        }

        if (token.type == TokenType::RightParen) {
            bool foundLeft = false;
            while (!stack.empty()) {
                if (stack.top().type == TokenType::LeftParen) {
                    stack.pop();
                    foundLeft = true;
                    break;
                }
                output.push_back(stack.top());
                stack.pop();
            }
            if (!foundLeft) {
                throw std::runtime_error("Parentesis desbalanceados.");
            }
            if (!stack.empty() && stack.top().type == TokenType::Function) {
                output.push_back(stack.top());
                stack.pop();
            }
        }
    }

    while (!stack.empty()) {
        if (stack.top().type == TokenType::LeftParen || stack.top().type == TokenType::RightParen) {
            throw std::runtime_error("Parentesis desbalanceados.");
        }
        output.push_back(stack.top());
        stack.pop();
    }

    return output;
}

double ExpressionParser::evaluate(double x) const {
    std::stack<double> values;

    for (const Token& token : rpn_) {
        if (token.type == TokenType::Number) {
            values.push(token.value);
            continue;
        }
        if (token.type == TokenType::Variable) {
            values.push(x);
            continue;
        }

        if (token.type == TokenType::Function) {
            if (values.empty()) {
                throw std::runtime_error("Expresion invalida: falta argumento de funcion.");
            }
            const double arg = values.top();
            values.pop();

            if (token.text == "sin") {
                values.push(std::sin(arg));
            } else if (token.text == "cos") {
                values.push(std::cos(arg));
            } else if (token.text == "tan") {
                values.push(std::tan(arg));
            } else if (token.text == "exp") {
                values.push(std::exp(arg));
            } else if (token.text == "log") {
                values.push(std::log(arg));
            } else if (token.text == "sqrt") {
                values.push(std::sqrt(arg));
            } else if (token.text == "abs") {
                values.push(std::fabs(arg));
            } else {
                throw std::runtime_error("Funcion no soportada.");
            }
            continue;
        }

        if (token.type == TokenType::Operator) {
            if (values.size() < 2) {
                throw std::runtime_error("Expresion invalida: operador sin operandos.");
            }

            const double rhs = values.top();
            values.pop();
            const double lhs = values.top();
            values.pop();

            if (token.text == "+") {
                values.push(lhs + rhs);
            } else if (token.text == "-") {
                values.push(lhs - rhs);
            } else if (token.text == "*") {
                values.push(lhs * rhs);
            } else if (token.text == "/") {
                values.push(lhs / rhs);
            } else if (token.text == "^") {
                values.push(std::pow(lhs, rhs));
            } else {
                throw std::runtime_error("Operador no soportado.");
            }
        }
    }

    if (values.size() != 1) {
        throw std::runtime_error("Expresion invalida.");
    }

    return values.top();
}
