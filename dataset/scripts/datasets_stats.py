import pandas as pd
from pathlib import Path

CSV_FILES = ["FINAL_FINAL.csv"]
TEXT_COLUMN = "text"
LABEL_COLUMN = "label"
SOURCE_COLUMN = "source"


def compute_text_stats(df: pd.DataFrame) -> pd.DataFrame:
    """Compute simple text metrics."""
    df[TEXT_COLUMN] = df[TEXT_COLUMN].astype(str)
    df["char_count"] = df[TEXT_COLUMN].str.len()
    df["word_count"] = df[TEXT_COLUMN].apply(lambda x: len(x.split()))
    df["sentence_count"] = df[TEXT_COLUMN].str.count(r"[.!?]+").clip(lower=1)
    df["avg_word_len"] = df.apply(
        lambda r: (r["char_count"] / r["word_count"]) if r["word_count"] > 0 else 0,
        axis=1,
    )
    df["avg_sentence_len_words"] = df.apply(
        lambda r: (r["word_count"] / r["sentence_count"])
        if r["sentence_count"] > 0
        else 0,
        axis=1,
    )
    return df


def analyze_file(csv_path: str, top_n_sources: int = 20):
    """Analyze a CSV and report stats including source counts."""
    print(f"\n--- Analyzing: {csv_path} ---")
    df = pd.read_csv(csv_path)

    expected_columns = {TEXT_COLUMN, LABEL_COLUMN, SOURCE_COLUMN}
    if not expected_columns.issubset(df.columns):
        raise ValueError(f"CSV must contain columns: {expected_columns}")

    df = compute_text_stats(df)

    total_rows = len(df)
    avg_stats = df[
        [
            "char_count",
            "word_count",
            "sentence_count",
            "avg_word_len",
            "avg_sentence_len_words",
        ]
    ].mean()

    # Basic info
    print(f"Total rows: {total_rows}")
    print(f"Unique labels: {df[LABEL_COLUMN].nunique()}")
    print(f"Unique sources: {df[SOURCE_COLUMN].nunique():,}")

    # Show top N sources
    print(f"\nTop {top_n_sources} sources by frequency:")
    source_counts = df[SOURCE_COLUMN].value_counts()
    print(source_counts.head(top_n_sources).to_string())

    # Average metrics
    print("\nAverage text metrics:")
    print(f"  Character count: {avg_stats['char_count']:.2f}")
    print(f"  Word count: {avg_stats['word_count']:.2f}")
    print(f"  Sentence count: {avg_stats['sentence_count']:.2f}")
    print(f"  Avg word length: {avg_stats['avg_word_len']:.3f}")
    print(f"  Avg sentence length (words): {avg_stats['avg_sentence_len_words']:.2f}")


def main():
    for csv_path in CSV_FILES:
        try:
            analyze_file(csv_path)
        except Exception as e:
            print(f"Error analyzing {csv_path}: {e}")


if __name__ == "__main__":
    main()