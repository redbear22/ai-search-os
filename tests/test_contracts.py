from contracts.agentic_os import AIAnswerReport, StrategyPortfolioReport


def test_strategy_report_defaults():
    report = StrategyPortfolioReport(keyword="espresso")
    assert report.keyword == "espresso"
    assert report.actions == []


def test_ai_answer_report():
    report = AIAnswerReport(keyword="test", source="rules")
    assert report.must_answer == []
