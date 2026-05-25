"""
Seed script: Year 4 - Corporate Readiness & Career Excellence

Usage:
1. Put the raw MCQ text into: content/year4_mcqs.txt
2. Run from the backend directory:
   python seed_course4.py

The parser preserves supplied question text, options, correct answers, explanations,
difficulty, Bloom level, CO mapping, and concept tags. It does not generate new MCQs.
"""
import re
import sys
import uuid
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import Base, SessionLocal, engine
from app.models.module import Lesson, Module
from app.models.quiz import Option, Question, Quiz


COURSE = {
    "title": "Corporate Readiness & Career Excellence",
    "description": "Advanced placement preparation, corporate excellence, leadership, decision making, and career planning for fourth-year learners.",
    "year": 4,
    "order": 4,
}

RAW_CONTENT_PATH = Path(__file__).resolve().parent / "content" / "year4_mcqs.txt"

QUESTION_RE = re.compile(
    r"Q(?P<number>\d+)\.\s*\[(?P<difficulty>[^\]]+)\]\s*\[(?P<bloom>[^\]]+)\]\s*\[(?P<co>[^\]]+)\]\s*"
    r"(?P<body>.*?)(?=\nQ\d+\.\s*\[|\Z)",
    re.DOTALL,
)
OPTION_RE = re.compile(r"^([A-D])\.\s*(.*)$")
CORRECT_RE = re.compile(r"^✔\s*Correct Answer:\s*([A-D])\.\s*(.*)$")
CONCEPT_RE = re.compile(r"\[CONCEPTS TESTED:\s*(.*?)\]")

HEADER_ASSUMPTIONS = [
    {
        "start": 1,
        "end": 8,
        "unit": "Unit 1: Placement Interview Readiness",
        "topic": "Company Research",
        "subtopic": "Industry and Company Analysis",
    },
    {
        "start": 9,
        "end": 16,
        "unit": "Unit 1: Placement Interview Readiness",
        "topic": "Company Research",
        "subtopic": "Role-Specific Preparation",
    },
    {
        "start": 17,
        "end": 24,
        "unit": "Unit 1: Placement Interview Readiness",
        "topic": "Advanced Interviews & Panel Handling",
        "subtopic": "Interview Types and Structured Responses",
    },
    {
        "start": 25,
        "end": 32,
        "unit": "Unit 1: Placement Interview Readiness",
        "topic": "Advanced Interviews & Panel Handling",
        "subtopic": "Panel Interview Handling and Professional Responses",
    },
]


@dataclass(frozen=True)
class ParsedMcq:
    number: int
    unit: str
    topic: str
    subtopic: str
    difficulty: str
    bloom: str
    co: str
    text: str
    options: list[str]
    correct_index: int
    explanation: str
    concepts: list[str]
    is_scenario_based: bool


def make_uuid():
    return uuid.uuid4()


def clean_header(line: str) -> str:
    return line.strip().strip("═").strip()


def assumed_hierarchy(question_number: int) -> tuple[str, str, str] | None:
    for assumption in HEADER_ASSUMPTIONS:
        if assumption["start"] <= question_number <= assumption["end"]:
            return assumption["unit"], assumption["topic"], assumption["subtopic"]
    return None


def parse_raw_mcqs(raw_text: str) -> tuple[list[ParsedMcq], list[str]]:
    current_unit = ""
    current_topic = ""
    current_subtopic = ""
    question_context: dict[int, tuple[str, str, str]] = {}
    source_issues: list[str] = []

    for line in raw_text.splitlines():
        stripped = line.strip()
        question_match = re.match(r"Q(\d+)\.", stripped)
        if question_match:
            question_number = int(question_match.group(1))
            if current_unit and current_topic and current_subtopic:
                question_context[question_number] = (current_unit, current_topic, current_subtopic)
            else:
                assumed = assumed_hierarchy(question_number)
                if assumed:
                    question_context[question_number] = assumed
                else:
                    question_context[question_number] = (current_unit, current_topic, current_subtopic)
            continue

        if stripped.startswith("UNIT "):
            current_unit = clean_header(stripped)
        elif stripped.startswith("Topic:"):
            current_topic = stripped.replace("Topic:", "", 1).strip()
        elif stripped.startswith("Subtopic:"):
            current_subtopic = stripped.replace("Subtopic:", "", 1).strip()

    mcqs: list[ParsedMcq] = []
    seen_numbers: set[int] = set()

    for match in QUESTION_RE.finditer(raw_text):
        number = int(match.group("number"))
        seen_numbers.add(number)
        body = match.group("body").strip()
        unit, topic, subtopic = question_context.get(number, ("", "", ""))

        if not unit or not topic or not subtopic:
            source_issues.append(f"Q{number}: missing Unit/Topic/Subtopic hierarchy.")

        lines = [line.rstrip() for line in body.splitlines() if line.strip()]
        question_lines: list[str] = []
        options_by_label: dict[str, str] = {}
        correct_label = ""
        correct_text = ""
        explanation_lines: list[str] = []
        concepts: list[str] = []
        in_explanation = False

        for line in lines:
            option_match = OPTION_RE.match(line)
            correct_match = CORRECT_RE.match(line)
            concept_match = CONCEPT_RE.search(line)

            if option_match:
                in_explanation = False
                options_by_label[option_match.group(1)] = option_match.group(2).strip()
            elif correct_match:
                in_explanation = False
                correct_label = correct_match.group(1)
                correct_text = correct_match.group(2).strip()
            elif line.startswith("📌 Explanation:"):
                in_explanation = True
                inline_explanation = line.replace("📌 Explanation:", "", 1).strip()
                if inline_explanation:
                    explanation_lines.append(inline_explanation)
            elif concept_match:
                in_explanation = False
                concepts = [tag.strip() for tag in concept_match.group(1).split("|") if tag.strip()]
            elif line.startswith("✔ Correct Answer:"):
                source_issues.append(f"Q{number}: correct answer line could not be parsed.")
            elif in_explanation:
                explanation_lines.append(line.strip())
            elif not options_by_label:
                question_lines.append(line.strip())

        options = [options_by_label.get(label, "") for label in ["A", "B", "C", "D"]]
        if any(not option for option in options):
            source_issues.append(f"Q{number}: expected options A-D.")
        if correct_label not in {"A", "B", "C", "D"}:
            source_issues.append(f"Q{number}: expected exactly one correct answer A-D.")
            correct_index = 0
        else:
            correct_index = ord(correct_label) - ord("A")
            if correct_text and options[correct_index] and correct_text != options[correct_index]:
                source_issues.append(f"Q{number}: correct answer text differs from option {correct_label}.")

        mcqs.append(
            ParsedMcq(
                number=number,
                unit=unit,
                topic=topic,
                subtopic=subtopic,
                difficulty=match.group("difficulty").strip(),
                bloom=match.group("bloom").strip(),
                co=match.group("co").strip(),
                text="\n".join(question_lines).strip(),
                options=options,
                correct_index=correct_index,
                explanation="\n".join(explanation_lines).strip(),
                concepts=concepts,
                is_scenario_based=bool(re.search(r"\b(Consider this situation|workplace scenario|Assertion:)", "\n".join(question_lines), re.IGNORECASE)),
            )
        )

    if seen_numbers:
        expected_numbers = set(range(min(seen_numbers), max(seen_numbers) + 1))
        missing_numbers = sorted(expected_numbers - seen_numbers)
        if missing_numbers:
            source_issues.append(f"Missing question numbers: {missing_numbers}")

    if "Q16." in raw_text and "Q17." in raw_text:
        q16_to_q17 = raw_text.split("Q16.", 1)[1].split("Q17.", 1)[0]
        if "///" not in q16_to_q17:
            source_issues.append("Q16: missing /// separator before Q17.")

    return sorted(mcqs, key=lambda item: item.number), source_issues


def build_unit_audit(mcqs: list[ParsedMcq], source_issues: list[str]) -> str:
    bloom = Counter(item.bloom for item in mcqs)
    difficulty = Counter(item.difficulty for item in mcqs)
    co = Counter(item.co for item in mcqs)
    concepts = sorted({concept for item in mcqs for concept in item.concepts})
    scenario_count = sum(1 for item in mcqs if item.is_scenario_based)

    return "\n".join(
        [
            "UNIT AUDIT:",
            f"- Total MCQs: {len(mcqs)}",
            f"- Bloom Distribution: {dict(sorted(bloom.items()))}",
            f"- Difficulty Distribution: {dict(sorted(difficulty.items()))}",
            f"- CO Coverage: {dict(sorted(co.items()))}",
            f"- Scenario-Based Count: {scenario_count}",
            f"- Concepts Tested: {' | '.join(concepts)}",
            f"- Formatting Errors: {'None' if not source_issues else '; '.join(source_issues)}",
        ]
    )


def topic_lesson_order(unit_order: int, topic_order: int) -> int:
    return unit_order * 10 + topic_order


def seed(db: Session | None = None, *, raw_text: str | None = None) -> bool:
    if raw_text is None:
        if not RAW_CONTENT_PATH.exists():
            raise FileNotFoundError(f"Missing raw MCQ file: {RAW_CONTENT_PATH}")
        raw_text = RAW_CONTENT_PATH.read_text(encoding="utf-8")

    mcqs, source_issues = parse_raw_mcqs(raw_text)
    if not mcqs:
        raise ValueError("No MCQs were parsed from the provided Year 4 content.")

    print(build_unit_audit(mcqs, source_issues))

    created_local_session = False
    Base.metadata.create_all(bind=engine)
    if db is None:
        db = SessionLocal()
        created_local_session = True

    existing = db.query(Module).filter(Module.title == COURSE["title"], Module.year == COURSE["year"]).first()
    if existing:
        print(f"Module '{COURSE['title']}' for Year 4 already exists (id={existing.module_id}). Skipping.")
        if created_local_session:
            db.close()
        return False

    try:
        module = Module(
            module_id=make_uuid(),
            title=COURSE["title"],
            description=COURSE["description"],
            year=COURSE["year"],
            order=COURSE["order"],
            is_premium=False,
        )
        db.add(module)
        db.flush()

        grouped: dict[str, dict[tuple[str, str], list[ParsedMcq]]] = defaultdict(lambda: defaultdict(list))
        for mcq in mcqs:
            grouped[mcq.unit][(mcq.topic, mcq.subtopic)].append(mcq)

        for unit_index, (unit_title, topic_groups) in enumerate(grouped.items(), start=1):
            unit_lesson = Lesson(
                lesson_id=make_uuid(),
                module_id=module.module_id,
                title=unit_title,
                content=f"{COURSE['title']} - {unit_title}",
                order=unit_index,
            )
            db.add(unit_lesson)
            db.flush()

            for topic_index, ((topic_title, subtopic_title), questions) in enumerate(topic_groups.items(), start=1):
                topic_lesson = Lesson(
                    lesson_id=make_uuid(),
                    module_id=module.module_id,
                    title=f"  → {topic_title} - {subtopic_title}",
                    content=f"Topic: {topic_title}\nSubtopic: {subtopic_title}",
                    order=topic_lesson_order(unit_index, topic_index),
                )
                db.add(topic_lesson)
                db.flush()

                quiz = Quiz(
                    quiz_id=make_uuid(),
                    module_id=module.module_id,
                    lesson_id=topic_lesson.lesson_id,
                    title=f"Quiz: {topic_title} - {subtopic_title}",
                    description=f"{len(questions)}-question assessment for {subtopic_title}",
                )
                db.add(quiz)
                db.flush()

                for order, mcq in enumerate(questions, start=1):
                    question = Question(
                        question_id=make_uuid(),
                        quiz_id=quiz.quiz_id,
                        text=mcq.text,
                        order=order,
                        difficulty_level=mcq.difficulty,
                        placement_relevance=f"{mcq.bloom} | {mcq.co} | {', '.join(mcq.concepts)}",
                    )
                    db.add(question)
                    db.flush()

                    for option_index, option_text in enumerate(mcq.options):
                        db.add(
                            Option(
                                option_id=make_uuid(),
                                question_id=question.question_id,
                                text=option_text,
                                is_correct=option_index == mcq.correct_index,
                                explanation=mcq.explanation if option_index == mcq.correct_index else None,
                            )
                        )

        db.commit()
        print(f"[DONE] Seeded Year 4 module with {len(mcqs)} MCQs.")
        return True
    except Exception:
        db.rollback()
        raise
    finally:
        if created_local_session:
            db.close()


if __name__ == "__main__":
    seed()
