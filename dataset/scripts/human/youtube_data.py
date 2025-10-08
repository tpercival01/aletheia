from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import csv
import time

SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"]

flow = InstalledAppFlow.from_client_secrets_file("google_client_secret.json", SCOPES)
creds = flow.run_local_server(port=0)

youtube = build("youtube", "v3", credentials=creds)

def get_videos_for_query(query, max_videos=2):
    request = youtube.search().list(
        q=query,
        part="snippet",
        type="video",
        maxResults=max_videos
    )
    response = request.execute()
    videos = []

    for item in response.get("items", []):
        vid = {
            "id": item["id"]["videoId"],
            "title": item["snippet"]["title"],
            "link": f"https://www.youtube.com/watch?v={item['id']['videoId']}"
        }
        videos.append(vid)
    return videos

def fetch_comments(video_id, comment_cap):
    comments = []
    next_page_token = None

    while len(comments) < comment_cap:
        request = youtube.commentThreads().list(
            part="snippet",
            videoId=video_id,
            maxResults=100,
            textFormat="plainText",
            pageToken=next_page_token
        )
        response = request.execute()
        items = response.get("items", [])

        for item in items:
            c = item["snippet"]["topLevelComment"]["snippet"]
            comments.append(c["textDisplay"])
            if len(comments) >= comment_cap:
                break

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

        time.sleep(0.5)

    return comments

def main():
    queries = [
        "funny fails compilation",          
        "gaming rage moments",             
        "celebrity drama 2025",             
        "political debate highlights",     
        "ai news and updates",             
        "music video trending right now",  
        "reddit stories compilation",      
        "movie trailer reaction",          
        "fitness motivation 2025",
        "climate change discussion",
    ]

    output_file = "youtube_comments.csv"
    total_limit = 10
    collected = 0

    with open(output_file, "a", encoding="utf-8", newline="") as csvfile:
        writer = csv.writer(csvfile)
        csvfile.seek(0, 2)
        if csvfile.tell() == 0:
            writer.writerow(["comment_text", "label", "video_title", "link"])

        for query in queries:
            print(f"Searching for query: {query}")
            videos = get_videos_for_query(query)

            if not videos:
                print(f"No videos found for '{query}'. Skipping.")
                continue

            for vid in videos:
                if collected >= total_limit:
                    print("Reached overall comment limit.")
                    return

                print(f"Fetching comments from: {vid['title']}")
                comments = fetch_comments(vid["id"], comment_cap=total_limit - collected)

                for comment_text in comments:
                    writer.writerow([
                        comment_text.strip().replace("\n", " "),
                        "human",
                        vid["title"],
                        vid["link"],
                    ])
                collected += len(comments)
                print(f"Added {len(comments)} comments ({collected} total so far).")

                time.sleep(1)

            print(f"Finished query '{query}'. Moving on...")

    print(f"Done. Wrote {collected} comments to {output_file}.")

if __name__ == "__main__":
    main()