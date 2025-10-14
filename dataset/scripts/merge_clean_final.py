import pandas as pd
import re

# Paths to your cleaned datasets
HUMAN_FILE = "dataset/data/finished/final.csv"
AI_FILE = "dataset/data/ai/final_ai.csv"
OUTPUT_FILE = "dataset_merged_cleaned.csv"

TEXT_COLUMN = "text"
LABEL_COLUMN = "label"
SOURCE_COLUMN = "source"

def clean_text(text: str) -> str:
    """Normalize whitespace, strip junk, and remove control characters."""
    if pd.isna(text):
        return ""
    text = str(text)
    # Remove stray control chars and normalize whitespace
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]+", " ", text)
    text = re.sub(r"\s+", " ", text.strip())
    return text


def merge_and_clean(human_path, ai_path):
    print("Reading datasets...")
    human_df = pd.read_csv(human_path)
    ai_df = pd.read_csv(ai_path)

    # Ensure standard columns exist
    for df, name in [(human_df, "human"), (ai_df, "ai")]:
        if TEXT_COLUMN not in df.columns:
            raise ValueError(f"{name} dataset missing '{TEXT_COLUMN}' column")
        if LABEL_COLUMN not in df.columns:
            df[LABEL_COLUMN] = name
        if SOURCE_COLUMN not in df.columns:
            df[SOURCE_COLUMN] = "unknown"

    print("Merging datasets...")
    combined = pd.concat([human_df, ai_df], ignore_index=True)
    print(f"Initial size: {len(combined)} rows")

    # Drop NaN/empty text rows
    combined = combined.dropna(subset=[TEXT_COLUMN])
    combined[TEXT_COLUMN] = combined[TEXT_COLUMN].astype(str)
    combined = combined[combined[TEXT_COLUMN].str.strip() != ""]

    # Clean text
    print("Cleaning text fields...")
    combined[TEXT_COLUMN] = combined[TEXT_COLUMN].apply(clean_text)

    # Drop duplicates
    dup_count = combined.duplicated(subset=[TEXT_COLUMN]).sum()
    if dup_count > 0:
        print(f"Dropping {dup_count} duplicate texts...")
        combined = combined.drop_duplicates(subset=[TEXT_COLUMN], keep="first")

    # Drop extremely short entries (e.g., 1–4 words)
    combined["word_count"] = combined[TEXT_COLUMN].apply(lambda x: len(x.split()))
    short_count = (combined["word_count"] < 5).sum()
    if short_count > 0:
        print(f"Removing {short_count} very short samples (< 5 words)...")
        combined = combined[combined["word_count"] >= 5]

    combined = combined.drop(columns=["word_count"])

    # Reset and save
    combined = combined.reset_index(drop=True)
    print(f"Final cleaned dataset size: {len(combined)} rows")

    combined.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"Saved merged dataset to {OUTPUT_FILE}")

    # Quick summary
    print("\nLabel distribution:")
    print(combined[LABEL_COLUMN].value_counts())
    print(f"\nUnique sources: {combined[SOURCE_COLUMN].nunique()}")
    print(f"Average text length (words): {combined[TEXT_COLUMN].apply(lambda x: len(x.split())).mean():.2f}")

if __name__ == "__main__":
    merge_and_clean(HUMAN_FILE, AI_FILE)