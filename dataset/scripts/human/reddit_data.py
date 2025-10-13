import praw
import os
import csv
from dotenv import load_dotenv

load_dotenv()

reddit = praw.Reddit(
    client_id=os.environ.get("REDDIT_CLIENT_ID"),
    client_secret=os.environ.get("REDDIT_CLIENT_SECRET"),
    user_agent=os.environ.get("REDDIT_USER_AGENT")
)

subreddits = [
    "AskReddit",
    "AskMen",
    "AskWomen",
    "TooAfraidToAsk",
    "NoStupidQuestions",
    "TIFU",
    "OffMyChest",
    "TrueOffMyChest",
    "confessions",
    "relationships",
    "relationship_advice",
    "AskDocs",
    "legaladvice",
    "changemyview",
    "career_guidance",
    "personalfinance",
    "WritingPrompts",
    "nosleep",
    "shortscarystories",
    "Poetry",
    "OutOfTheLoop",
    "ExplainLikeImFive",
    "TrueAskReddit",
    "LifeProTips",
    "tifu",
    "nosleep",
    "relationships",
    "legaladvice",
    "maliciouscompliance",
    "cooking",
    "fitness",
    "personalfinance",
    "fauxmoi",
    "TwoXChromosomes",
    "popculturechat"
]


def scrape_reddit_data(output_file, subreddits, collect_comments=False):
    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        
        if collect_comments:
            writer.writerow(["subreddit", "post_id", "comment_id", "content", "word_count", "score"])
        else:
            writer.writerow(["subreddit", "post_id", "content", "word_count"])

        for sub in subreddits:
            print(f"Scraping r/{sub}...")
            subreddit = reddit.subreddit(sub)
            content_count = 0
            
            if collect_comments:
                sorting_methods = [
                    ("hot", 25),   
                    ("top", 25)
                ]
                comments_per_post = 20
            else:
                sorting_methods = [
                    ("hot", 3000),
                    ("top", 3000), 
                    ("new", 3000)
                ]
            
            collected_ids = set() 
            
            for sort_method, limit in sorting_methods:
                try:
                    if sort_method == "hot":
                        posts = subreddit.hot(limit=limit)
                    elif sort_method == "top":
                        posts = subreddit.top(limit=limit, time_filter="all")
                    else:  # new
                        posts = subreddit.new(limit=limit)
                    
                    for submission in posts:
                        if submission.id in collected_ids:
                            continue
                            
                        collected_ids.add(submission.id)
                        post_id = submission.id
                        
                        if collect_comments:
                            try:
                                submission.comments.replace_more(limit=0)
                                for comment in submission.comments.list()[:comments_per_post]:
                                    if hasattr(comment, 'body') and comment.body != '[deleted]' and comment.body != '[removed]':
                                        content = comment.body.strip()
                                        word_count = len(content.split())
                                        
                                        if 10 <= word_count <= 150:
                                            writer.writerow([sub, post_id, comment.id, content, word_count, comment.score])
                                            content_count += 1
                            except Exception as e:
                                print(f"Error getting comments from post {post_id}: {e}")
                                continue
                                
                        else:
                            title = submission.title.strip()
                            selftext = submission.selftext.strip()
                            
                            if selftext:
                                content = f"{title}\n\n{selftext}"
                            else:
                                content = title
                            
                            word_count = len(content.split())
                            
                            if 10 <= word_count <= 150:
                                writer.writerow([sub, post_id, content, word_count])
                                content_count += 1
                                
                except Exception as e:
                    print(f"Error scraping {sort_method} from r/{sub}: {e}")
                    continue
                    
            content_type = "comments" if collect_comments else "posts"
            print(f"Collected {content_count} {content_type} from r/{sub}")

scrape_reddit_data("reddit_posts.csv", subreddits, collect_comments=False)
#scrape_reddit_data("reddit_comments.csv", subreddits, collect_comments=True)