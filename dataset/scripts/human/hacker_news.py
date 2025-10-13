# 10000 comments
from google.cloud import bigquery
import pandas as pd
import random
import os
import dotenv

dotenv.load_dotenv()

path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

client = bigquery.Client()


TARGET_COUNT = 10000            
OVERSHOOT_FACTOR = 5
MIN_WORDS = 10
MAX_WORDS = 150
query_limit = TARGET_COUNT * OVERSHOOT_FACTOR

QUERY_LIMIT = TARGET_COUNT

query = f"""
SELECT id, `by`, text, parent, time
FROM `bigquery-public-data.hacker_news.full`
WHERE type = 'comment' AND text IS NOT NULL
ORDER BY RAND()
LIMIT {query_limit}
"""

print(f"Querying ~{query_limit:,} random Hacker News comments…")

df = client.query(query).to_dataframe()
df.to_csv("hackernews_comments.csv", index=False)
print("Pulled", len(df), "comments")
print(df.head())