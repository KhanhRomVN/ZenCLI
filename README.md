[SessionManager] 📝 Generated prompt: Generate 10 diverse English learning questions based on the provided vocabulary and grammar items.

**Vocabulary IDs:** vocab_1762334792269
**Grammar IDs:** 

**Requirements:**
- Difficulty range: 3-7/10 (mixed)
- Question types: Mix of all 10 types (lexical_fix, grammar_transformation, translate, gap_fill, choice_one, choice_multi, sentence_puzzle, matching, true_false, reverse_translation)
- Use the provided vocabulary and grammar items as the basis for questions
- Each question MUST be unique and high quality
- STRICTLY follow the structure for each question type


**QUESTION TYPE STRUCTURES:**

1. LEXICAL_FIX:
{
  "question_type": "lexical_fix",
  "incorrect_sentence": "I am very interesting in learning English.",
  "incorrect_word": "interesting",
  "word_position": 3,
  "correct_word": "interested",
  "correct_sentence": "I am very interested in learning English.",
  "context": "Tìm từ sai trong câu và sửa lại cho đúng",
  "hint": "Think about adjectives ending in -ed vs -ing",
  "explanation": "Use 'interested' for feelings, 'interesting' for things.",
  "error_type": "wrong_form",
  "difficulty_level": 3
}

2. GRAMMAR_TRANSFORMATION:
{
  "question_type": "grammar_transformation",
  "original_sentence": "They built this house in 1990.",
  "context": "Change to passive voice",
  "grammar_focus": "passive",
  "correct_answer": "This house was built in 1990.",
  "alternative_answers": ["This house was built by them in 1990."],
  "hint": "Move the object to the subject position",
  "explanation": "In passive voice, the object becomes the subject.",
  "difficulty_level": 5
}

3. SENTENCE_PUZZLE:
{
  "question_type": "sentence_puzzle",
  "scrambled_items": ["always", "early", "wakes", "she", "up"],
  "correct_sentence": "She always wakes up early.",
  "correct_order": [3, 0, 2, 4, 1],
  "context": "Sắp xếp các từ sau để tạo thành câu hoàn chỉnh",
  "hint": "Adverbs of frequency go before the main verb",
  "language_code": "en",
  "difficulty_level": 4
}

4. TRANSLATE:
{
  "question_type": "translate",
  "source_sentence": "Tôi đang học tiếng Anh.",
  "source_language": "vi",
  "correct_translation": "I am learning English.",
  "alternative_translations": ["I am studying English.", "I'm learning English."],
  "context": "Dịch câu tiếng Việt sang tiếng Anh",
  "hint": "Use present continuous for ongoing actions",
  "difficulty_level": 3
}

5. REVERSE_TRANSLATION:
{
  "question_type": "reverse_translation",
  "english_sentence": "I have been living here for five years.",
  "target_language": "vi",
  "correct_translation": "Tôi đã sống ở đây được năm năm.",
  "alternative_translations": ["Tôi đã ở đây được 5 năm.", "Tôi sống ở đây được năm năm rồi."],
  "context": "Dịch câu tiếng Anh sang tiếng Việt",
  "hint": "Focus on the duration aspect",
  "key_grammar_points": ["present_perfect_continuous"],
  "difficulty_level": 6
}

6. GAP_FILL:
{
  "question_type": "gap_fill",
  "sentence_with_gaps": "She _____ to the market every Sunday and _____ fresh vegetables.",
  "gaps": [
    {
      "position": 0,
      "correct_answer": "goes",
      "alternative_answers": []
    },
    {
      "position": 1,
      "correct_answer": "buys",
      "alternative_answers": ["purchases"]
    }
  ],
  "context": "Điền động từ thích hợp vào chỗ trống",
  "hint": "Use simple present tense",
  "word_bank": ["go", "goes", "buy", "buys", "went", "bought"],
  "difficulty_level": 3
}

7. CHOICE_ONE:
{
  "question_type": "choice_one",
  "question_text": "Which word means 'very tired'?",
  "options": [
    { "id": "opt_001", "text": "exhausted" },
    { "id": "opt_002", "text": "excited" },
    { "id": "opt_003", "text": "energetic" },
    { "id": "opt_004", "text": "relaxed" }
  ],
  "correct_option_id": "opt_001",
  "context": "Chọn từ đồng nghĩa với 'very tired'",
  "hint": "Think about extreme tiredness",
  "explanation": "'Exhausted' means extremely tired or worn out.",
  "difficulty_level": 4
}

8. CHOICE_MULTI:
{
  "question_type": "choice_multi",
  "question_text": "Which of the following are modal verbs?",
  "options": [
    { "id": "opt_m01", "text": "can" },
    { "id": "opt_m02", "text": "should" },
    { "id": "opt_m03", "text": "want" },
    { "id": "opt_m04", "text": "must" },
    { "id": "opt_m05", "text": "like" }
  ],
  "correct_option_ids": ["opt_m01", "opt_m02", "opt_m04"],
  "min_selections": 2,
  "max_selections": 4,
  "context": "Chọn tất cả các modal verbs từ danh sách",
  "hint": "Modal verbs express possibility, necessity, or permission",
  "explanation": "Modal verbs include can, could, may, might, must, shall, should, will, would.",
  "difficulty_level": 5
}

9. MATCHING:
{
  "question_type": "matching",
  "instruction": "Match each word with its definition",
  "left_items": [
    { "id": "left_01", "text": "enormous" },
    { "id": "left_02", "text": "tiny" },
    { "id": "left_03", "text": "ancient" },
    { "id": "left_04", "text": "modern" }
  ],
  "right_items": [
    { "id": "right_01", "text": "very small" },
    { "id": "right_02", "text": "very large" },
    { "id": "right_03", "text": "very old" },
    { "id": "right_04", "text": "recent or new" }
  ],
  "correct_matches": [
    { "left_id": "left_01", "right_id": "right_02" },
    { "left_id": "left_02", "right_id": "right_01" },
    { "left_id": "left_03", "right_id": "right_03" },
    { "left_id": "left_04", "right_id": "right_04" }
  ],
  "context": "Nối mỗi từ với định nghĩa của nó",
  "hint": "Think about size and time-related adjectives",
  "match_type": "word_definition",
  "difficulty_level": 4
}

10. TRUE_FALSE:
{
  "question_type": "true_false",
  "statement": "The present perfect tense is formed with 'have/has + past participle'.",
  "correct_answer": true,
  "context": "Đánh giá câu phát biểu về ngữ pháp present perfect",
  "hint": "Think about the structure of present perfect",
  "explanation": "The present perfect is indeed formed using have/has followed by the past participle.",
  "grammar_focus": "present_perfect",
  "difficulty_level": 3
}


**Output Format:**
Return ONLY a valid JSON object with this structure:
```json
{
  "questions": [
    ... array of 10 questions following the structures above ...
  ]
}
```

Generate NOW with diverse question types. Return ONLY valid JSON, no explanation.