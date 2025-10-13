import pandas as pd
import re

INPUT_FILE  = "youtube_comments.csv"
OUTPUT_FILE = "youtube_comments_cleaned_two.csv"
TEXT_COL    = "comment_text"
MIN_WORDS   = 10
MAX_WORDS   = 150

df = pd.read_csv(INPUT_FILE)
print(f"Loaded {len(df):,} rows")

def clean_comment(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = re.sub(r"\b\d{1,2}:\d{2}\b", " ", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[^;\s]+;", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

df[TEXT_COL] = df[TEXT_COL].astype(str).apply(clean_comment)

before = len(df)
df = df.drop_duplicates(subset=[TEXT_COL])
after = len(df)
print(f"Removed {before - after:,} duplicate comments (exact text matches)")

df["word_count"] = df[TEXT_COL].apply(lambda x: len(x.split()))
filtered = df.query(f"{MIN_WORDS} <= word_count <= {MAX_WORDS}").copy()

print(f"After filtering: {len(filtered):,} rows between {MIN_WORDS}-{MAX_WORDS} words")

filtered.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
print(f"✅ Saved cleaned dataset to '{OUTPUT_FILE}'")
print(filtered.head())