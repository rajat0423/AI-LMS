from app.models.module import Module
from app.models.quiz import Option, Question, Quiz
from seed_course4 import COURSE, build_unit_audit, parse_raw_mcqs, seed


SAMPLE_YEAR4_MCQS = """
Q1. [Easy] [Remember] [CO1]
A candidate preparing for a campus placement interview studies a company’s products, competitors, and recent achievements. This preparation activity primarily supports:
A. Casual networking before placement season
B. Industry and company analysis for interview readiness
C. Technical coding practice for aptitude rounds
D. Memorizing unrelated corporate terminology
✔ Correct Answer: B. Industry and company analysis for interview readiness
📌 Explanation:
Understanding a company’s business model, industry position, and recent developments helps candidates answer interview questions confidently.
Technical coding practice (C) improves technical ability but does not directly address company research.
[CONCEPTS TESTED: company-analysis | placement-preparation | industry-awareness]
///
Q16. [Moderate] [Analyze] [CO1]
A candidate notices that a project management role emphasizes stakeholder coordination more than coding expertise. What should the candidate infer?
A. Technical knowledge is completely unnecessary
B. Communication and coordination are critical for the role
C. The organization does not value teamwork
D. Coding skills automatically guarantee selection
✔ Correct Answer: B. Communication and coordination are critical for the role
📌 Explanation:
Project management positions require collaboration, planning, and stakeholder interaction abilities.
Assuming technical knowledge is unnecessary (A) is an extreme and inaccurate conclusion.
[CONCEPTS TESTED: project-management | stakeholder-coordination | role-analysis]
Q17. [Easy] [Understand] [CO1]
During an HR interview, a recruiter asks, “Describe a situation where you handled pressure effectively.”
This question is primarily intended to evaluate:
A. Memorization of technical definitions
B. Behavioral response and workplace adaptability
C. Ability to solve coding problems instantly
D. Knowledge of financial accounting standards
✔ Correct Answer: B. Behavioral response and workplace adaptability
📌 Explanation:
Behavioral questions assess interpersonal skills, attitude, and response to workplace situations.
Technical problem-solving (C) belongs mainly to technical interview rounds.
[CONCEPTS TESTED: behavioral-interview | workplace-adaptability | hr-evaluation]
///
COURSE NAME: Corporate Readiness & Career Excellence
══════════════════════════════════════
UNIT 2: Corporate Excellence
══════════════════════════════════════
Topic: Workplace Culture
Subtopic: Organizational Behavior and Professionalism
Q33. [Easy] [Remember] [CO2]
An employee consistently arriving on time, meeting deadlines, and communicating respectfully is primarily demonstrating:
A. Workplace professionalism and discipline
B. Informal social networking ability
C. Avoidance of organizational responsibilities
D. Technical specialization without collaboration
✔ Correct Answer: A. Workplace professionalism and discipline
📌 Explanation:
Professionalism includes punctuality, accountability, and respectful communication in the workplace.
Technical specialization alone (D) does not represent overall professional behavior.
[CONCEPTS TESTED: professionalism | workplace-discipline | organizational-behavior]
///
"""


def test_parse_year4_mcqs_preserves_metadata_and_reports_source_issues():
    mcqs, source_issues = parse_raw_mcqs(SAMPLE_YEAR4_MCQS)

    assert [mcq.number for mcq in mcqs] == [1, 16, 17, 33]
    assert mcqs[0].unit == "Unit 1: Placement Interview Readiness"
    assert mcqs[0].topic == "Company Research"
    assert mcqs[0].subtopic == "Industry and Company Analysis"
    assert mcqs[0].difficulty == "Easy"
    assert mcqs[0].bloom == "Remember"
    assert mcqs[0].co == "CO1"
    assert mcqs[0].correct_index == 1
    assert mcqs[0].concepts == ["company-analysis", "placement-preparation", "industry-awareness"]
    assert mcqs[-1].unit == "UNIT 2: Corporate Excellence"
    assert mcqs[-1].topic == "Workplace Culture"
    assert mcqs[-1].subtopic == "Organizational Behavior and Professionalism"
    assert any("Q16: missing /// separator before Q17" in issue for issue in source_issues)

    audit = build_unit_audit(mcqs, source_issues)
    assert "Total MCQs: 4" in audit
    assert "Formatting Errors:" in audit


def test_seed_year4_mcqs_creates_module_lessons_quizzes_and_options(db_session):
    created = seed(db_session, raw_text=SAMPLE_YEAR4_MCQS)

    assert created is True
    module = db_session.query(Module).filter(Module.title == COURSE["title"], Module.year == 4).one()
    assert module.order == 4
    assert len(module.lessons) == 6

    quizzes = db_session.query(Quiz).filter(Quiz.module_id == module.module_id).all()
    assert len(quizzes) == 4
    assert db_session.query(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 4
    assert db_session.query(Option).join(Question).join(Quiz).filter(Quiz.module_id == module.module_id).count() == 16

    first_quiz = sorted(quizzes, key=lambda quiz: quiz.title)[0]
    first_question = sorted(first_quiz.questions, key=lambda question: question.order)[0]
    assert first_question.difficulty_level in {"Easy", "Moderate"}
    assert "CO1" in first_question.placement_relevance
    assert sum(1 for option in first_question.options if option.is_correct) == 1
