from app.models.module import Module
from app.models.quiz import Option, Question, Quiz
from seed_course2 import COURSE, build_unit_audit, parse_raw_mcqs, seed


SAMPLE_YEAR2_MCQS = """COURSE NAME: Professional Communication & Interpersonal Effectiveness
══════════════════════════════════════
UNIT 1: Business Communication
══════════════════════════════════════
Topic: Business Communication
Subtopic: Business English
Q1. [Easy] [Remember] [CO1]
A trainee writes, “I wanna discuss the sales report ASAP” in an official email to a client.
Which revision reflects appropriate business English?
A. “I wanna discuss the report quickly.”
B. “I wish to discuss the sales report at your earliest convenience.”
C. “Let’s chat about the report now.”
D. “Need to discuss sales immediately.”
✔ Correct Answer: B. “I wish to discuss the sales report at your earliest convenience.”
📌 Explanation:
Business English emphasizes professionalism, clarity, and formal tone.
Option A still contains informal language such as “wanna.”
[CONCEPTS TESTED: formal-language | workplace-writing | business-english]
///
Q2. [Easy] [Understand] [CO1]
During a client meeting, an employee avoids slang and uses concise professional vocabulary.
This behavior mainly improves:
A. Workplace punctuality
B. Financial documentation
C. Professional credibility
D. Technical automation
✔ Correct Answer: C. Professional credibility
📌 Explanation:
Professional vocabulary enhances trust and competence in workplace communication.
Punctuality (A) is unrelated to language usage.
[CONCEPTS TESTED: professional-communication | workplace-image | vocabulary-usage]
///
"""


def test_parse_year2_mcqs_preserves_metadata():
    mcqs, source_issues = parse_raw_mcqs(SAMPLE_YEAR2_MCQS)

    assert [mcq.number for mcq in mcqs] == [1, 2]
    assert mcqs[0].unit == "UNIT 1: Business Communication"
    assert mcqs[0].topic == "Business Communication"
    assert mcqs[0].subtopic == "Business English"
    assert mcqs[0].difficulty == "Easy"
    assert mcqs[0].bloom == "Remember"
    assert mcqs[0].co == "CO1"
    assert mcqs[0].correct_index == 1
    assert mcqs[0].concepts == ["formal-language", "workplace-writing", "business-english"]
    assert not source_issues

    audit = build_unit_audit(mcqs, source_issues)
    assert "Total MCQs: 2" in audit
    assert "Formatting Errors: None" in audit


def test_seed_year2_mcqs_creates_records(db_session):
    created = seed(db_session, raw_text=SAMPLE_YEAR2_MCQS)

    assert created is True
    module = db_session.query(Module).filter(Module.title == COURSE["title"], Module.year == 2).one()
    assert module.order == 2
    assert len(module.lessons) == 2  # Unit lesson + Topic lesson

    quizzes = db_session.query(Quiz).filter(Quiz.module_id == module.module_id).all()
    assert len(quizzes) == 1
    assert db_session.query(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 2
    assert db_session.query(Option).join(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 8

    first_quiz = quizzes[0]
    first_question = sorted(first_quiz.questions, key=lambda question: question.order)[0]
    assert first_question.difficulty_level == "Easy"
    assert "CO1" in first_question.placement_relevance
    assert sum(1 for option in first_question.options if option.is_correct) == 1
