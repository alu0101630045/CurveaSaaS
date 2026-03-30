#pragma once

#include <string>
#include <vector>

class ExpressionParser {
public:
    explicit ExpressionParser(const std::string& expression);
    double evaluate(double x) const;

private:
    enum class TokenType {
        Number,
        Variable,
        Operator,
        Function,
        LeftParen,
        RightParen
    };

    struct Token {
        TokenType type;
        std::string text;
        double value;
    };

    std::vector<Token> rpn_;

    static std::vector<Token> tokenize(const std::string& expression);
    static std::vector<Token> toRpn(const std::vector<Token>& tokens);
    static bool isFunctionName(const std::string& name);
    static int precedence(const std::string& op);
    static bool rightAssociative(const std::string& op);
};
