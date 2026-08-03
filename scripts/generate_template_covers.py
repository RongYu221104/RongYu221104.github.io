from generate_lecture_covers import generate


DOCUMENTS = [
    {
        "subject": "maths",
        "kind": "Guide",
        "fileName": "rynotes_v2-usage.pdf",
        "titleZh": "rynotes_v2 使用指南",
        "titleEn": "rynotes_v2 Usage Guide",
        "pages": 25,
    },
    {
        "subject": "physics",
        "kind": "Demo",
        "fileName": "rynotes_v2-demo.pdf",
        "titleZh": "rynotes_v2 样式总览",
        "titleEn": "rynotes_v2 Style Demo",
        "pages": 13,
    },
]


if __name__ == "__main__":
    for document in DOCUMENTS:
        generate(document)
    print(f"Generated {len(DOCUMENTS)} rynotes_v2 resource covers.")
