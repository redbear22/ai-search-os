from services.ai_answer_service import build_ai_answer_report


def test_rules_fallback_without_api():
    report = build_ai_answer_report("home espresso machine", use_api=False)
    assert report.keyword == "home espresso machine"
    assert report.source == "rules"
    assert len(report.must_answer) >= 3
