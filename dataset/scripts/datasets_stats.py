import pandas as pd
from pathlib import Path

CSV_FILES = [
    "train-balanced-sarcasm.csv",
]
TEXT_COLUMN = "comment"
OUTPUT_SUMMARY_CSV = "reddit_comments.csv"

def compute_text_stats(df: pd.DataFrame, text_column: str):
    """Compute char_count, word_count, sentence_count, avg_word_len for a text column."""
    df[text_column] = df[text_column].astype(str)

    df["char_count"] = df[text_column].str.len()
    df["word_count"] = df[text_column].apply(lambda x: len(x.split()))
    df["sentence_count"] = df[text_column].str.count(r"[.!?]+").clip(lower=1)
    df["avg_word_len"] = df.apply(
        lambda r: r["char_count"] / (r["word_count"] + 1e-9)
        if r["word_count"] > 0
        else 0,
        axis=1,
    )
    return df


def analyze_file(csv_path: str):
    """Read CSV, compute metrics, and return aggregated stats as dict."""
    name = Path(csv_path).stem
    print(f"\n--- Analyzing: {csv_path} ---")

    df = pd.read_csv(csv_path)
    if TEXT_COLUMN not in df.columns:
        raise ValueError(f"Missing column '{TEXT_COLUMN}' in {csv_path}")

    df = compute_text_stats(df, TEXT_COLUMN)

    total_rows = len(df)
    unique_models = df["model"].nunique() if "model" in df.columns else 0
    model_counts = (
        df["model"].value_counts().to_dict() if "model" in df.columns else {}
    )

    summary = df[["char_count", "word_count", "sentence_count", "avg_word_len"]].describe()
    mean_char = summary.loc["mean", "char_count"]
    mean_word = summary.loc["mean", "word_count"]
    mean_sentence = summary.loc["mean", "sentence_count"]
    mean_word_len = summary.loc["mean", "avg_word_len"]

    print(f"Total rows: {total_rows}")
    print(f"Unique 'model' values: {unique_models}")
    if model_counts:
        print("Model distribution:")
        for k, v in model_counts.items():
            print(f"  {k}: {v}")
    else:
        print("No 'model' column found.")

    print("\nText Metric Means:")
    print(
        f"  Avg char_count: {mean_char:.2f}\n"
        f"  Avg word_count: {mean_word:.2f}\n"
        f"  Avg sentence_count: {mean_sentence:.2f}\n"
        f"  Avg word_length: {mean_word_len:.3f}"
    )

    return {
        "dataset": name,
        "rows": total_rows,
        "unique_model_count": unique_models,
        "avg_char_count": mean_char,
        "avg_word_count": mean_word,
        "avg_sentence_count": mean_sentence,
        "avg_word_length": mean_word_len,
        "model_distribution": model_counts,
    }

def main():
    all_results = []

    for csv_path in CSV_FILES:
        try:
            result = analyze_file(csv_path)
            all_results.append(result)
        except Exception as e:
            print(f"Error on {csv_path}: {e}")

    summary_df = pd.DataFrame([
        {
            "Dataset": r["dataset"],
            "Rows": r["rows"],
            "Unique Models": r["unique_model_count"],
            "Avg Char Count": round(r["avg_char_count"], 2),
            "Avg Word Count": round(r["avg_word_count"], 2),
            "Avg Sentence Count": round(r["avg_sentence_count"], 2),
            "Avg Word Length": round(r["avg_word_length"], 3),
            "Model Distribution": str(r["model_distribution"]),
        }
        for r in all_results
    ])

    print("\n=== OVERALL DATASET SUMMARY ===")
    print(summary_df.to_string(index=False))

    summary_df.to_csv(OUTPUT_SUMMARY_CSV, index=False, encoding="utf-8")
    print(f"\nSaved summary to '{OUTPUT_SUMMARY_CSV}'")


if __name__ == "__main__":
    main()