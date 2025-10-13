from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import csv
import time

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]

flow = InstalledAppFlow.from_client_secrets_file(
    "dataset/scripts/human/google_client_secret.json", SCOPES
)
creds = flow.run_local_server(port=0)
youtube = build("youtube", "v3", credentials=creds)

# ---------------------------------------------------
#  Helpers
# ---------------------------------------------------
def get_videos_for_query(query, max_videos=2):
    req = youtube.search().list(
        q=query, part="snippet", type="video", maxResults=max_videos
    )
    res = req.execute()
    vids = []
    for item in res.get("items", []):
        vids.append({
            "id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "link": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
        })
    return vids


def fetch_comments(video_id, comment_cap):
    """Fetch up to comment_cap top‑level comments for one video.
       Returns empty list if comments are disabled or video is protected."""
    comments, next_page = [], None

    while len(comments) < comment_cap:
        try:
            req = youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=100,
                textFormat="plainText",
                pageToken=next_page,
            )
            resp = req.execute()
        except HttpError as e:
            # Detect disabled or restricted comment sections
            if "commentsDisabled" in str(e) or "Forbidden" in str(e):
                print(f"    ⚠️  Comments disabled or restricted for video {video_id}. Skipping.")
                return []
            else:
                print(f"    ⚠️  API error on video {video_id}: {e}")
                return []

        for item in resp.get("items", []):
            c = item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
            comments.append(c)
            if len(comments) >= comment_cap:
                break

        next_page = resp.get("nextPageToken")
        if not next_page:
            break
        time.sleep(0.5)

    return comments

def main():
    queries = [
        "unexpected life hacks compilation",       
        "street interviews 2025",                
        "latest tech gadget review",              
        "relationship advice reddit stories",    
        "breaking news reactions 2025",   
        "viral meme compilation",            
        "music festival vlog 2025",       
        "ai tools for daily life",          
        "healthy eating and gym motivation", 
        "controversial podcast moments",
    ]

    output_file = "youtube_comments.csv"
    total_limit = 20000
    per_query_limit = total_limit // len(queries)
    per_video_limit = per_query_limit // 5
    collected = 0

    with open(output_file, "a", encoding="utf-8", newline="") as csvfile:
        writer = csv.writer(csvfile)
        csvfile.seek(0, 2)
        if csvfile.tell() == 0:
            writer.writerow(["comment_text", "label", "video_title", "link"])

        for query in queries:
            print(f"\n▶ Searching for query: {query}")
            videos = get_videos_for_query(query, max_videos=10)
            query_collected = 0

            if not videos:
                print(f"No videos found for '{query}'. Skipping.")
                continue

            for vid in videos:
                if query_collected >= per_query_limit or collected >= total_limit:
                    break

                print(f"  Fetching comments from: {vid['title']}")
                remaining_for_query = per_query_limit - query_collected
                comments_to_get = min(per_video_limit, remaining_for_query)

                comments = fetch_comments(vid["id"], comments_to_get)
                if not comments:
                    continue 

                for text in comments:
                    writer.writerow([
                        text.strip().replace("\n", " "),
                        "human",
                        vid["title"],
                        vid["link"],
                    ])
                n = len(comments)
                collected += n
                query_collected += n

                print(f"    Added {n} comments ({query_collected}/{per_query_limit} for this query, {collected} total).")
                time.sleep(1)

            print(f"✔ Finished query '{query}' with {query_collected} comments.")

            if collected >= total_limit:
                print("Reached overall 10 000‑comment limit.")
                break

    print(f"\n✅ Done. Wrote {collected} comments to '{output_file}'.\n")


if __name__ == "__main__":
    main()