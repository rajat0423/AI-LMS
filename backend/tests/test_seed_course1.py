from app.models.module import Module
from app.models.quiz import Option, Question, Quiz
from seed_course1 import COURSE, build_unit_audit, parse_raw_mcqs, seed


SAMPLE_YEAR1_MCQS = """COURSE NAME: Foundation of Communication & Self-Management
══════════════════════════════════════
UNIT 1: Self & Mindset
══════════════════════════════════════
Topic: Self-Awareness
Subtopic: Understanding Self-Awareness
Q1. [Easy] [Remember] [CO2]
A first-year student regularly reflects on personal strengths and weaknesses after every class presentation. This practice BEST represents:
A. Emotional avoidance during evaluation
B. Self-awareness for personal improvement
C. Competitive comparison with classmates
D. Passive participation in classroom activities
✔ Correct Answer: B. Self-awareness for personal improvement
📌 Explanation:
Self-awareness involves understanding one’s abilities, behavior, and areas needing improvement.
Competitive comparison does not necessarily lead to meaningful self-understanding.
[CONCEPTS TESTED: self-awareness | reflection | personal-growth]
///
Q2. [Easy] [Understand] [CO2]
During a group activity, a student realizes that nervousness affects communication clarity. The student is demonstrating:
A. Technical expertise in communication
B. Academic memorization ability
C. Awareness of personal behavior patterns
D. Dependence on team members for support
✔ Correct Answer: C. Awareness of personal behavior patterns
📌 Explanation:
Recognizing emotional and behavioral patterns is a core element of self-awareness.
Technical expertise relates to skill proficiency rather than self-observation.
[CONCEPTS TESTED: behavior-awareness | emotional-recognition | communication]
///
"""


def test_parse_year1_mcqs_preserves_metadata():
    mcqs, source_issues = parse_raw_mcqs(SAMPLE_YEAR1_MCQS)

    assert [mcq.number for mcq in mcqs] == [1, 2]
    assert mcqs[0].unit == "UNIT 1: Self & Mindset"
    assert mcqs[0].topic == "Self-Awareness"
    assert mcqs[0].subtopic == "Understanding Self-Awareness"
    assert mcqs[0].difficulty == "Easy"
    assert mcqs[0].bloom == "Remember"
    assert mcqs[0].co == "CO2"
    assert mcqs[0].correct_index == 1
    assert mcqs[0].concepts == ["self-awareness", "reflection", "personal-growth"]
    assert not source_issues

    audit = build_unit_audit(mcqs, source_issues)
    assert "Total MCQs: 2" in audit
    assert "Formatting Errors: None" in audit


def test_seed_year1_mcqs_creates_records(db_session):
    created = seed(db_session, raw_text=SAMPLE_YEAR1_MCQS)

    assert created is True
    module = db_session.query(Module).filter(Module.title == COURSE["title"], Module.year == 1).one()
    assert module.order == 1
    assert len(module.lessons) == 2  # Unit lesson + Topic lesson

    quizzes = db_session.query(Quiz).filter(Quiz.module_id == module.module_id).all()
    assert len(quizzes) == 1
    assert db_session.query(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 2
    assert db_session.query(Option).join(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 8

    first_quiz = quizzes[0]
    first_question = sorted(first_quiz.questions, key=lambda question: question.order)[0]
    assert first_question.difficulty_level == "Easy"
    assert "CO2" in first_question.placement_relevance
    assert sum(1 for option in first_question.options if option.is_correct) == 1
