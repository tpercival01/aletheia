import pandas as pd
import re

INPUT_FILE = "train-balanced-sarcasm.csv"
OUTPUT_FILE = "reddit_cleaned.csv"
MIN_WORDS = 10
MAX_WORDS = 150

df = pd.read_csv(INPUT_FILE)
keep_cols = {
    "comment": "comment",
    "author": "author",
    "subreddit": "subreddit",
    "created_utc": "time_created",
    "parent_comment": "parent_comment",
}
present = [c for c in keep_cols if c in df.columns]
df = df[present].rename(columns=keep_cols)

def clean_comment(t: str) -> str:
    if not isinstance(t, str):
        return ""
    t = re.sub(r"\b\d{1,2}:\d{2}\b", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"&[^;\s]+;", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

df["comment"] = df["comment"].astype(str).apply(clean_comment)
df = df.drop_duplicates(subset=["comment"])
df["word_count"] = df["comment"].apply(lambda x: len(x.split()))
filtered = df.query(f"{MIN_WORDS} <= word_count <= {MAX_WORDS}").copy()
filtered.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
print(f"Saved {len(filtered)} rows to {OUTPUT_FILE}")