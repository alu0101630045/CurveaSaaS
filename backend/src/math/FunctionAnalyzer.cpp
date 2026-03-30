#include "math/FunctionAnalyzer.hpp"

#include "math/ExpressionParser.hpp"

#include <cmath>
#include <iomanip>
#include <limits>
#include <sstream>
#include <stdexcept>

namespace {

double evaluateSafe(const ExpressionParser& parser, double x, bool& ok) {
    try {
        const double value = parser.evaluate(x);
        ok = std::isfinite(value) != 0;
        return value;
    } catch (...) {
        ok = false;
        return 0.0;
    }
}

double nthDerivative(const ExpressionParser& parser, int order, double x, double h, bool& ok) {
    if (order == 0) {
        return evaluateSafe(parser, x, ok);
    }

    bool okL = false;
    bool okR = false;
    const double left = nthDerivative(parser, order - 1, x - h, h, okL);
    const double right = nthDerivative(parser, order - 1, x + h, h, okR);
    ok = okL && okR;
    if (!ok) {
        return 0.0;
    }
    return (right - left) / (2.0 * h);
}

double factorial(int n) {
    double f = 1.0;
    for (int i = 2; i <= n; i += 1) {
        f *= static_cast<double>(i);
    }
    return f;
}

std::string escapeJson(const std::string& text) {
    std::string out;
    out.reserve(text.size());
    for (const char c : text) {
        if (c == '"') {
            out += "\\\"";
        } else if (c == '\\') {
            out += "\\\\";
        } else if (c == '\n') {
            out += "\\n";
        } else {
            out.push_back(c);
        }
    }
    return out;
}

std::string doubleToString(double value) {
    std::ostringstream os;
    os << std::setprecision(12) << value;
    return os.str();
}

}  // namespace

AnalysisResult FunctionAnalyzer::analyze(const std::string& expression, double xMin, double xMax, int samples, int taylorOrder) {
    if (xMin >= xMax) {
        throw std::runtime_error("xMin debe ser menor que xMax.");
    }
    if (samples < 25 || samples > 5000) {
        throw std::runtime_error("samples fuera de rango.");
    }
    if (taylorOrder < 1 || taylorOrder > 10) {
        throw std::runtime_error("taylorOrder fuera de rango.");
    }

    ExpressionParser parser(expression);

    AnalysisResult result;
    result.expression = expression;
    result.xMin = xMin;
    result.xMax = xMax;
    result.hasYIntercept = false;

    const double step = (xMax - xMin) / static_cast<double>(samples - 1);
    result.points.reserve(static_cast<std::size_t>(samples));

    for (int i = 0; i < samples; i += 1) {
        const double x = xMin + static_cast<double>(i) * step;
        bool ok = false;
        const double y = evaluateSafe(parser, x, ok);
        result.points.push_back({x, y, ok});
    }

    const double x0 = 0.0;
    const double h = 1e-3;
    for (int n = 0; n <= taylorOrder; n += 1) {
        bool ok = false;
        const double derivative = nthDerivative(parser, n, x0, h, ok);
        if (!ok) {
            result.taylorCoefficients.push_back(std::numeric_limits<double>::quiet_NaN());
        } else {
            result.taylorCoefficients.push_back(derivative / factorial(n));
        }
    }

    bool okY = false;
    const double yAtZero = evaluateSafe(parser, 0.0, okY);
    if (okY) {
        result.hasYIntercept = true;
        result.yIntercept = {0.0, yAtZero};
    }

    for (std::size_t i = 1; i < result.points.size(); i += 1) {
        const Point& p0 = result.points[i - 1];
        const Point& p1 = result.points[i];
        if (!p0.finite || !p1.finite) {
            continue;
        }

        if (std::fabs(p0.y) < 1e-7) {
            result.xIntercepts.push_back({p0.x, p0.y});
            continue;
        }

        if ((p0.y < 0.0 && p1.y > 0.0) || (p0.y > 0.0 && p1.y < 0.0)) {
            double a = p0.x;
            double b = p1.x;
            for (int k = 0; k < 32; k += 1) {
                const double m = (a + b) / 2.0;
                bool okM = false;
                const double fm = evaluateSafe(parser, m, okM);
                if (!okM) {
                    break;
                }
                if (std::fabs(fm) < 1e-8) {
                    a = m;
                    b = m;
                    break;
                }

                bool okA = false;
                const double fa = evaluateSafe(parser, a, okA);
                if (!okA) {
                    break;
                }

                if ((fa < 0.0 && fm > 0.0) || (fa > 0.0 && fm < 0.0)) {
                    b = m;
                } else {
                    a = m;
                }
            }
            const double root = (a + b) / 2.0;
            result.xIntercepts.push_back({root, 0.0});
        }
    }

    for (std::size_t i = 1; i + 1 < result.points.size(); i += 1) {
        const Point& prev = result.points[i - 1];
        const Point& curr = result.points[i];
        const Point& next = result.points[i + 1];

        if (!prev.finite || !curr.finite || !next.finite) {
            continue;
        }

        if (std::fabs(curr.y) > 1e5 && std::fabs(prev.y) < 1e3 && std::fabs(next.y) < 1e3) {
            result.asymptotes.push_back({"vertical", "x = " + doubleToString(curr.x), curr.x, 0.0, 0.0});
        }
    }

    bool okP1 = false;
    bool okP2 = false;
    bool okN1 = false;
    bool okN2 = false;
    const double p1 = evaluateSafe(parser, 1000.0, okP1);
    const double p2 = evaluateSafe(parser, 2000.0, okP2);
    const double n1 = evaluateSafe(parser, -1000.0, okN1);
    const double n2 = evaluateSafe(parser, -2000.0, okN2);

    if (okP1 && okP2 && std::fabs(p1 - p2) < 0.01) {
        result.asymptotes.push_back({"horizontal", "y = " + doubleToString((p1 + p2) / 2.0), 0.0, (p1 + p2) / 2.0, 0.0});
    }
    if (okN1 && okN2 && std::fabs(n1 - n2) < 0.01) {
        result.asymptotes.push_back({"horizontal", "y = " + doubleToString((n1 + n2) / 2.0), 0.0, (n1 + n2) / 2.0, 0.0});
    }

    if (okP1 && okP2 && std::fabs(p1 - p2) >= 0.01) {
        const double m = (p2 - p1) / 1000.0;
        const double b = p2 - m * 2000.0;
        const double e1 = std::fabs((m * 1000.0 + b) - p1);
        const double e2 = std::fabs((m * 2000.0 + b) - p2);
        if (std::fabs(m) > 1e-5 && e1 < 10.0 && e2 < 10.0) {
            result.asymptotes.push_back({"oblique", "y = " + doubleToString(m) + "*x + " + doubleToString(b), 0.0, b, m});
        }
    }

    if (okN1 && okN2 && std::fabs(n1 - n2) >= 0.01) {
        const double m = (n2 - n1) / -1000.0;
        const double b = n2 - m * (-2000.0);
        const double e1 = std::fabs((m * -1000.0 + b) - n1);
        const double e2 = std::fabs((m * -2000.0 + b) - n2);
        if (std::fabs(m) > 1e-5 && e1 < 10.0 && e2 < 10.0) {
            result.asymptotes.push_back({"oblique", "y = " + doubleToString(m) + "*x + " + doubleToString(b), 0.0, b, m});
        }
    }

    return result;
}

double FunctionAnalyzer::evaluateExpression(const std::string& expression, double x) {
    ExpressionParser parser(expression);
    return parser.evaluate(x);
}

std::string FunctionAnalyzer::toJson(const AnalysisResult& result) {
    std::ostringstream out;
    out << "{";
    out << "\"expression\":\"" << escapeJson(result.expression) << "\",";
    out << "\"xMin\":" << doubleToString(result.xMin) << ",";
    out << "\"xMax\":" << doubleToString(result.xMax) << ",";

    out << "\"points\":[";
    for (std::size_t i = 0; i < result.points.size(); i += 1) {
        const Point& p = result.points[i];
        out << "{";
        out << "\"x\":" << doubleToString(p.x) << ",";
        if (p.finite) {
            out << "\"y\":" << doubleToString(p.y);
        } else {
            out << "\"y\":null";
        }
        out << "}";
        if (i + 1 < result.points.size()) {
            out << ",";
        }
    }
    out << "],";

    out << "\"taylor\":[";
    for (std::size_t i = 0; i < result.taylorCoefficients.size(); i += 1) {
        const double c = result.taylorCoefficients[i];
        if (std::isfinite(c) != 0) {
            out << doubleToString(c);
        } else {
            out << "null";
        }
        if (i + 1 < result.taylorCoefficients.size()) {
            out << ",";
        }
    }
    out << "],";

    out << "\"asymptotes\":[";
    for (std::size_t i = 0; i < result.asymptotes.size(); i += 1) {
        const Asymptote& a = result.asymptotes[i];
        out << "{";
        out << "\"type\":\"" << escapeJson(a.type) << "\",";
        out << "\"equation\":\"" << escapeJson(a.equation) << "\",";
        out << "\"x\":" << doubleToString(a.x) << ",";
        out << "\"y\":" << doubleToString(a.y) << ",";
        out << "\"slope\":" << doubleToString(a.slope);
        out << "}";
        if (i + 1 < result.asymptotes.size()) {
            out << ",";
        }
    }
    out << "],";

    out << "\"xIntercepts\":[";
    for (std::size_t i = 0; i < result.xIntercepts.size(); i += 1) {
        const AxisIntercept& p = result.xIntercepts[i];
        out << "{";
        out << "\"x\":" << doubleToString(p.x) << ",";
        out << "\"y\":" << doubleToString(p.y);
        out << "}";
        if (i + 1 < result.xIntercepts.size()) {
            out << ",";
        }
    }
    out << "],";

    out << "\"yIntercept\":";
    if (result.hasYIntercept) {
        out << "{";
        out << "\"x\":" << doubleToString(result.yIntercept.x) << ",";
        out << "\"y\":" << doubleToString(result.yIntercept.y);
        out << "}";
    } else {
        out << "null";
    }

    out << "}";
    return out.str();
}
