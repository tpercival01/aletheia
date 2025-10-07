import pandas as pd

CSV_FILE_NAME = 'dataset/data/AI/ai_text_openai.csv'
# CSV_FILE_NAME = 'dataset/data/AI/ai_text_claude.csv'

df = pd.read_csv(CSV_FILE_NAME)

print(f"--- Statistics for {CSV_FILE_NAME} ---")

print("\n### 1. Basic DataFrame Metrics ###")
print(f"Number of rows (df.shape[0]): {df.shape[0]}")
print(f"Number of columns (df.shape[1]): {df.shape[1]}")

print("\nColumn Headings (list(df.columns)):")
print(list(df.columns))

print("\nData Types and Non-Null Counts (df.info()):")
df.info()

print("\nStatistical Summary of All Columns (df.describe(include='all')):")
print(df.describe(include='all').to_string())

print("\n### 2. Data Quality Checks ###")
print("\nMissing Values per Column (df.isnull().sum()):")
print(df.isnull().sum().to_string())

num_duplicates = df.duplicated().sum()
print(f"\nNumber of duplicate rows: {num_duplicates}")

print("\n### 3. Text-Specific Statistics (based on 'text' column) ###")

text_column = 'text'
df[text_column] = df[text_column].astype(str)

df['char_count'] = df[text_column].str.len()
df['word_count'] = df[text_column].apply(
    lambda x: len(x.split()) if isinstance(x, str) else 0
)
df['sentence_count'] = df[text_column].str.count(r'[.!?]+')
df['sentence_count'] = df.apply(
    lambda row: max(1, row['sentence_count'])
    if row[text_column] and row['word_count'] > 0
    else 0,
    axis=1,
)
df['avg_word_len'] = df.apply(
    lambda row: row['char_count'] / (row['word_count'] + 1e-9)
    if row['word_count'] > 0
    else 0,
    axis=1,
)

print(f"\nDataFrame head with new text statistics columns:")
print(df.head().to_string())

print(
    "\nStatistical Summary of Text-Specific Metrics "
    "(char_count, word_count, sentence_count, avg_word_len):"
)
print(
    df[['char_count', 'word_count', 'sentence_count', 'avg_word_len']].describe().to_string()
)

# -------------------------------------------------
# NEW SECTION — Count of "Model" column values
# -------------------------------------------------
if 'source_model' in df.columns:
    print("\n### 4. Model Distribution ###")
    print("Counts of each unique model value:")
    print(df['source_model'].value_counts().to_string())
else:
    print("\n### 4. Model Distribution ###")
    print("Column 'Model' not found in this dataset.")

print("\n--- Script Finished ---")