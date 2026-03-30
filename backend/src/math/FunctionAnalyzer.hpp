#pragma once

#include <string>
#include <vector>

struct Point {
    double x;
    double y;
    bool finite;
};

struct AxisIntercept {
    double x;
    double y;
};

struct Asymptote {
    std::string type;
    std::string equation;
    double x;
    double y;
    double slope;
};

struct AnalysisResult {
    std::string expression;
    double xMin;
    double xMax;
    std::vector<Point> points;
    std::vector<double> taylorCoefficients;
    std::vector<Asymptote> asymptotes;
    std::vector<AxisIntercept> xIntercepts;
    bool hasYIntercept;
    AxisIntercept yIntercept;
};

class FunctionAnalyzer {
public:
    static AnalysisResult analyze(const std::string& expression, double xMin, double xMax, int samples, int taylorOrder);
    static std::string toJson(const AnalysisResult& result);

private:
    static double evaluateExpression(const std::string& expression, double x);
};
