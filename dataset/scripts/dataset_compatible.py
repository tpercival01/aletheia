import pandas as pd
import numpy as np
from pathlib import Path
from collections import Counter

CSV_FILES = ["FINAL_FINAL.csv"]
TEXT_COLUMN = "text"
LABEL_COLUMN = "label"
SOURCE_COLUMN = "source"


def compute_text_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Compute text metrics useful for model preparation."""
    df[TEXT_COLUMN] = df[TEXT_COLUMN].astype(str).fillna("")
    df["char_count"] = df[TEXT_COLUMN].str.len()
    df["word_count"] = df[TEXT_COLUMN].apply(lambda x: len(x.split()))
    df["sentence_count"] = df[TEXT_COLUMN].str.count(r"[.!?]+").clip(lower=1)
    df["avg_word_len"] = np.where(
        df["word_count"] > 0, df["char_count"] / df["word_count"], 0
    )
    df["avg_sentence_len_words"] = np.where(
        df["sentence_count"] > 0, df["word_count"] / df["sentence_count"], 0
    )
    return df


def validate_for_training(df: pd.DataFrame):
    """Perform sanity checks and cleaning for ML training."""
    print("\n--- Data Validation ---")

    # Normalize column types
    df[TEXT_COLUMN] = df[TEXT_COLUMN].astype(str)
    df[LABEL_COLUMN] = df[LABEL_COLUMN].astype(str)
    if SOURCE_COLUMN in df.columns:
        df[SOURCE_COLUMN] = df[SOURCE_COLUMN].astype(str)
    else:
        df[SOURCE_COLUMN] = "unknown"

    # Identify missing values
    missing_counts = df.replace("nan", pd.NA).isna().sum()
    print("Missing values per column:")
    print(missing_counts)

    # Drop rows with missing or empty text
    df = df.dropna(subset=[TEXT_COLUMN])
    df = df[df[TEXT_COLUMN].str.strip() != ""]
    print(f"Dropped rows with empty or null text. Remaining: {len(df)}")

    # Drop rows with missing labels if any slip through
    df = df.dropna(subset=[LABEL_COLUMN])

    # Handle duplicates
    dup_count = df.duplicated(subset=[TEXT_COLUMN]).sum()
    if dup_count > 0:
        print(f"⚠️  Found {dup_count} duplicate texts — dropping duplicates.")
        df = df.drop_duplicates(subset=[TEXT_COLUMN], keep="first")

    # Recheck NaNs after cleaning
    df = df.replace("nan", pd.NA)
    df = df.fillna({"source": "unknown"})

    # Report label distribution
    label_counts = df[LABEL_COLUMN].value_counts()
    print("\nLabel distribution:")
    print(label_counts)

    if len(label_counts) > 1:
        imbalance = label_counts.max() / label_counts.min()
        if imbalance > 5:
            print(f"⚠️  Label imbalance detected: Largest/smallest class ratio = {imbalance:.2f}")

    # Check for control chars or corrupt text
    bad_mask = df[TEXT_COLUMN].str.contains(
        r"[\x00-\x08\x0B\x0C\x0E-\x1F]", na=False, regex=True
    )
    if bad_mask.any():
        count_bad = bad_mask.sum()
        print(f"⚠️  Found {count_bad} rows with control characters — cleaning text.")
        df.loc[bad_mask, TEXT_COLUMN] = (
            df.loc[bad_mask, TEXT_COLUMN].str.replace(
                r"[\x00-\x08\x0B\x0C\x0E-\x1F]", " ", regex=True
            )
        )

    print(f"Final cleaned dataset size: {len(df)}")
    return df.reset_index(drop=True)


def analyze_file(csv_path: str):
    """Analyze CSV structure and content for model-readiness."""
    print(f"\n--- Analyzing: {csv_path} ---")

    # Read safely
    df = pd.read_csv(csv_path, on_bad_lines="skip", encoding_errors="ignore")

    expected_columns = {TEXT_COLUMN, LABEL_COLUMN, SOURCE_COLUMN}
    if not expected_columns.issubset(df.columns):
        raise ValueError(f"CSV must contain columns: {expected_columns}")

    # Basic cleaning / validation
    df = validate_for_training(df)
    df = compute_text_stats(df)

    # Show dataset-level info
    total_rows = len(df)
    totals = df[["char_count", "word_count", "sentence_count"]].sum()
    averages = df[
        ["char_count", "word_count", "sentence_count", "avg_word_len", "avg_sentence_len_words"]
    ].mean()

    print(f"\nTotal rows: {total_rows}")
    print(f"Unique sources: {df[SOURCE_COLUMN].nunique()}")
    print("\nAverage metrics:")
    for key, val in averages.items():
        print(f"  {key}: {val:.2f}")

    # Estimate token count (roughly, for transformer cost)
    avg_tokens = averages["word_count"] * 1.3  # Rough factor for subword tokenization
    total_tokens = total_rows * avg_tokens
    print(f"\nEstimated total tokens (~1.3× words): {total_tokens:,.0f}")
    print(f"→ Equivalent to ~{total_tokens/1_000_000:.2f}M tokens")

    # Text length quantiles
    print("\nText length distribution (words):")
    print(df["word_count"].describe(percentiles=[0.5, 0.9, 0.95, 0.99]))

    # Optional: show longest and shortest examples
    print("\nExamples:")
    print("Shortest text:\n", df.loc[df["word_count"].idxmin(), TEXT_COLUMN][:300])
    print("\nLongest text:\n", df.loc[df["word_count"].idxmax(), TEXT_COLUMN][:300])

    return df


def main():
    for csv_path in CSV_FILES:
        try:
            analyze_file(csv_path)
        except Exception as e:
            print(f"Error analyzing {csv_path}: {e}")


if __name__ == "__main__":
    main()