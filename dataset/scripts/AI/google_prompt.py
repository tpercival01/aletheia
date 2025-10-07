import csv
import os
import random
import google.auth
import google.auth.transport.requests
from openai import OpenAI

# -----------------------------
# CONFIGURATION
# -----------------------------
PROJECT_ID = "aletheia-7f337"
LOCATION = "us-central1"
MODEL_ID = "google/gemini-2.0-flash-lite-001"

CSV_FILE_NAME = "gemini_flash_lite_outputs.csv"
NUM_ITERATIONS = 5000  # adjust as needed

# -----------------------------
# RANDOM PARAMETER POOLS
# -----------------------------
topics = [
    # Technical & IT (Your Domain)
    "Explaining API rate limiting to a junior dev", "Kubernetes vs Docker Swarm",
    "The pros and cons of microservices architecture", "How to prevent SQL injection",
    "Why is my Wi-Fi so slow?", "Setting up a home NAS server", "Thoughts on Rust for web development",
    
    # Pop Culture & Entertainment
    "A review of a recent popular movie", "Explaining the plot of a hit TV series",
    "A theory about a video game's lore", "Arguing why a specific actor was miscast",
    "Ranking the albums of a famous musician", "The impact of streaming services on cinema",
    
    # Everyday Life & Hobbies
    "Tips for training a new puppy", "How to choose the best coffee beans",
    "A recipe for homemade sourdough bread", "Beginner mistakes in photography",
    "Advice for a first-time home buyer", "Planning a budget-friendly vacation",
    
    # Opinion & Debate (Crucial for tone variation)
    "The case for or against universal basic income", "Are electric cars truly green?",
    "Should social media platforms be regulated more heavily?", "Is remote work the future?",
    "The ethics of AI in art and writing", "A strong opinion on pineapple on pizza"
]

formats = [
    # Social Media & Forums
    "A Reddit comment disagreeing with a post",
    "A short, punchy tweet (under 280 characters)",
    "A Facebook post sharing a personal anecdote",
    "A script for a 30-second TikTok or YouTube Shorts video",
    "An answer on a Q&A site like Quora or Stack Exchange",
    "A post on a specialized forum asking for technical help",
    "A YouTube comment praising a video",
    
    # Reviews & Commerce
    "A 1-star product review for a broken item",
    "A 5-star product review for a life-changing gadget",
    "A Steam review for a video game after 100 hours of playtime",
    
    # Longer Form
    "A short, personal blog post about a recent experience",
    "A technical explanation for a company's internal wiki",
    "A few paragraphs of a fanfiction story",
    "A marketing email announcing a new product feature"
]

tones = [
    # Standard Tones
    "Formal and academic", "Informal and conversational", "Persuasive and confident",
    "Neutral and objective", "Enthusiastic and upbeat", "Skeptical and critical", "Humorous",
    
    # Internet-Specific Tones
    "Angry and ranting", "Sarcastic and witty",
    "Pedantic and condescending (a 'well, actually...' tone)",
    "Genuinely helpful and encouraging", "Confused and asking for help",
    "Clickbait and sensationalized", "Corporate and full of buzzwords"
]

lengths = [
    "A short paragraph, between 50 and 80 words.",
    "Two paragraphs, approximately 150 words total.",
    "A medium-length article, between 300 and 400 words."
]

personas = [
    # Standard Personas
    "a university professor", "a skeptical IT administrator", "an excited marketing intern",
    "a disgruntled customer", "a helpful online community member", "a high school student",

    # Internet Archetypes
    "A 'well, actually...' type of person on a tech forum",
    "An overly enthusiastic fan of a specific movie franchise",
    "A busy parent asking for advice on a community board",
    "A cynical senior software developer with 20 years of experience",
    "A conspiracy theorist explaining their views on a topic",
    "A non-native English speaker asking for clarification",
    "A burned-out corporate middle manager writing an email"
]

style_modifiers = [
    "Write normally and cleanly.",
    "Include one or two common typos (e.g., 'teh', 'wierd', 'becuase').",
    "Use a common grammatical error, like mixing up 'your' and 'you're' once.",
    "Use some common internet slang and abbreviations (e.g., lol, tbh, smh).",
    "Write in a slightly disjointed, stream-of-consciousness style.",
    "Use one or two relevant emojis.",
    "Write as a non-native English speaker might, with slightly awkward phrasing."
]



csv_headers = ["Response", "Model"]

# -----------------------------
# AUTHENTICATION & CLIENT
# -----------------------------
credentials, _ = google.auth.default(
    scopes=["https://www.googleapis.com/auth/cloud-platform"]
)
credentials.refresh(google.auth.transport.requests.Request())

client = OpenAI(
    base_url=f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/"
    f"{PROJECT_ID}/locations/{LOCATION}/endpoints/openapi",
    api_key=credentials.token,
)

# -----------------------------
# MAIN LOOP
# -----------------------------

system_message = {
    "role": "system",
    "content": (
        "You generate short text samples based on parameters. "
        "Only produce the text content itself. "
        "Do NOT repeat or restate the parameters. "
        "Do NOT include introductions, Markdown, labels, or titles. "
        "Always write naturally, like a human post."
    ),
}

def get_client():
    import google.auth
    import google.auth.transport.requests
    from openai import OpenAI

    credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    credentials.refresh(google.auth.transport.requests.Request())

    return OpenAI(
        base_url=f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/endpoints/openapi",
        api_key=credentials.token,
    )

file_exists = os.path.isfile(CSV_FILE_NAME)
with open(CSV_FILE_NAME, "a", newline="", encoding="utf-8") as csvfile:
    writer = csv.writer(csvfile)
    if not file_exists or os.path.getsize(CSV_FILE_NAME) == 0:
        writer.writerow(csv_headers)
        print(f"Created {CSV_FILE_NAME} with headers.")

    print(f"Starting {NUM_ITERATIONS} iterations...\n")

    for i in range(1, NUM_ITERATIONS + 1):
        try:

            topic = random.choice(topics)
            format_ = random.choice(formats)
            tone = random.choice(tones)
            length = random.choice(lengths)
            persona = random.choice(personas)
            style = random.choice(style_modifiers)

            user_prompt = (
                f"Topic: {topic}\n"
                f"Format: {format_}\n"
                f"Tone: {tone}\n"
                f"Length: {length}\n"
                f"Persona: {persona}\n"
                f"Style: {style}\n"
            )

            client = get_client() 

            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[system_message, {"role": "user", "content": user_prompt}],
                temperature=0.8,
                max_tokens=1024,
            )

            output_text = response.choices[0].message.content.strip()
            writer.writerow([output_text, MODEL_ID])
            print(f"Iteration {i}: success")

        except Exception as e:
            error_text = f"Error: {e}"
            writer.writerow([error_text, MODEL_ID])
            print(f"Iteration {i} failed: {e}")

    print(f"\nFinished {NUM_ITERATIONS} iterations.")
    print(f"All outputs saved to {CSV_FILE_NAME}.\n")