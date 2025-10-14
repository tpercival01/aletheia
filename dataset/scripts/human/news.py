import os
import random
import dotenv
from eventregistry import *
import pandas as pd
import time

dotenv.load_dotenv()

API_KEY = os.environ.get("NEWS_AI_API_KEY")
eventReg = EventRegistry(apiKey=API_KEY)

OUTPUT_FILE = "newsapi_ai_dataset.csv"
LABEL = "human"
SOURCE = "newsapi.ai"

QUERIES = [
    "technology", "science", "finance",
    "art", "sports", "energy", "cybersecurity", 
    "movies", "space exploration", "politics"
]

def fetch_articles(query, max_items):
    """
    Queries full news articles from NewsAPI.ai (EventRegistry).
    Returns a list of dicts with article body, label, and source.
    """
    print(f"\nFetching: {query}")
    result = []

    q = QueryArticlesIter(
        keywords=query,
        lang="eng",
        dataType=["news"],
        isDuplicateFilter="skipDuplicates"
    )

    for article in q.execQuery(eventReg, maxItems=max_items):
        body = article.get("body", "").strip()
        if not body:
            continue
        body = " ".join(body.split())
        result.append({
            "text":  body,
            "label": LABEL,
            "source": SOURCE,
        })
    print(f"Collected {len(result)} articles for query: {query}")
    return result


def main():
    all_articles = []
    
    for query in random.sample(QUERIES, len(QUERIES)):  # random order
        try:
            articles = fetch_articles(query, max_items=500)
            all_articles.extend(articles)
        except Exception as e:
            print(f"Error with query '{query}': {e}")
        time.sleep(1)

    df = pd.DataFrame(all_articles)
    df.to_csv(OUTPUT_FILE, index=False, escapechar='\\')
    print(f"\nSaved {len(df)} articles to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()