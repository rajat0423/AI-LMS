from app.models.module import Module
from app.models.quiz import Option, Question, Quiz
from seed_course3 import COURSE, build_unit_audit, parse_raw_mcqs, seed


SAMPLE_YEAR3_MCQS = """COURSE NAME: Employability & Interview Readiness
══════════════════════════════════════
UNIT 1: Resume & Branding
══════════════════════════════════════
Topic: Resume Development
Subtopic: ATS Resumes
Q1. [Easy] [Remember] [CO1]
A placement applicant wants an ATS-friendly resume for a software internship. Which formatting choice MOST improves ATS readability?
A. Using text inside infographic icons
B. Adding keywords in standard headings
C. Inserting skills through text boxes
D. Designing the resume in two columns
✔ Correct Answer: B. Adding keywords in standard headings
📌 Explanation:
ATS software scans resumes efficiently when standard headings and keywords are used clearly.
Text boxes and infographic elements may not be parsed correctly by many ATS systems.
[CONCEPTS TESTED: ATS-keywords | standard-headings | resume-formatting]
///
Q2. [Easy] [Understand] [CO1]
A recruiter rejects a resume because the software could not extract the candidate’s academic details properly. The MOST likely reason is:
A. Excessive use of tables and graphics
B. Mentioning CGPA in decimal form
C. Including internship duration clearly
D. Listing technical skills separately
✔ Correct Answer: A. Excessive use of tables and graphics
📌 Explanation:
ATS systems often struggle to parse complex tables, images, and graphic-heavy layouts.
Clear skill and education sections usually improve ATS compatibility rather than reduce it.
[CONCEPTS TESTED: ATS-parsing | resume-structure | formatting-errors]
///
"""


def test_parse_year3_mcqs_preserves_metadata():
    mcqs, source_issues = parse_raw_mcqs(SAMPLE_YEAR3_MCQS)

    assert [mcq.number for mcq in mcqs] == [1, 2]
    assert mcqs[0].unit == "UNIT 1: Resume & Branding"
    assert mcqs[0].topic == "Resume Development"
    assert mcqs[0].subtopic == "ATS Resumes"
    assert mcqs[0].difficulty == "Easy"
    assert mcqs[0].bloom == "Remember"
    assert mcqs[0].co == "CO1"
    assert mcqs[0].correct_index == 1
    assert mcqs[0].concepts == ["ATS-keywords", "standard-headings", "resume-formatting"]
    assert not source_issues

    audit = build_unit_audit(mcqs, source_issues)
    assert "Total MCQs: 2" in audit
    assert "Formatting Errors: None" in audit


def test_seed_year3_mcqs_creates_records(db_session):
    created = seed(db_session, raw_text=SAMPLE_YEAR3_MCQS)

    assert created is True
    module = db_session.query(Module).filter(Module.title == COURSE["title"], Module.year == 3).one()
    assert module.order == 3
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
