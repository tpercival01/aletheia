import os
import csv
import time
import random
import requests
from dotenv import load_dotenv
from together import Together

# ─── CONFIG ──────────────────────────────────────────────────────────────────
load_dotenv()
client = Together()  # auth via TOGETHER_API_KEY

MODEL_ID    = "deepseek-ai/DeepSeek-V3.1"  # change as desired
OUTPUT_CSV  = "together_ai_deepseek_texts.csv"
ITERATIONS  = 3000
TEMPERATURE = 0.8
SLEEP_SEC   = 0.2

# ─── PARAMETER POOLS ──────────────────────────────────────────────────────────
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
    
    # Opinion & Debate (Crucial for tone)
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
    "A single sentence, between 15 and 25 words.",
    "A short paragraph, between 50 and 80 words.",
    "A short paragraph, between 50 and 80 words.",
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
    "Write normally and cleanly.", "Write normally and cleanly.",
    "Write normally and cleanly.", "Write normally and cleanly.",
    "Write normally and cleanly.", "Write normally and cleanly.",
    "Include one or two common typos (e.g., 'teh', 'wierd', 'becuase').",
    "Use a common grammatical error, like mixing up 'your' and 'you're' once.",
    "Use some common internet slang and abbreviations (e.g., lol, tbh, smh).",
    "Write in a slightly disjointed, stream-of-consciousness style.",
    "Use one or two relevant emojis.",
    "Write as a non-native English speaker might, with slightly awkward phrasing."
]

prompt_template = """
You are a data generator. Produce a text sample based on these parameters.

**PARAMETERS:**
- Topic: {topic}
- Format: {format}
- Tone: {tone}
- Length: {length}
- Persona: {persona}
- Style Modifier: {style_modifier}

**CONSTRAINTS:**
1.  Generate only the requested text. No introductions or conclusions.
2.  Do not mention you are an AI.
3.  Do not use markdown unless the Format requires it.
4.  Follow all parameters precisely.

Begin generation.
""".strip()

# ─── HELPERS ───────────────────────────────────────────────────────────────────
def write_header(path: str):
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(["text", "label", "model"])

def append_row(path: str, text: str, model: str):
    with open(path, "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([text, "ai", model])

def build_prompt() -> str:
    return prompt_template.format(
        topic=random.choice(topics),
        format=random.choice(formats),
        tone=random.choice(tones),
        length=random.choice(lengths),
        persona=random.choice(personas),
        style_modifier=random.choice(style_modifiers),
    )

# ─── MAIN ─────────────────────────────────────────────────────────────────────
def main():
    write_header(OUTPUT_CSV)
    print(f"→ Generating {ITERATIONS} samples with model '{MODEL_ID}'\n")
    for i in range(1, ITERATIONS + 1):
        prompt = build_prompt()
        try:
            resp = client.chat.completions.create(
                model=MODEL_ID,
                messages=[{"role": "user", "content": prompt}],
                temperature=TEMPERATURE,
            )
            text = resp.choices[0].message.content.strip()
            append_row(OUTPUT_CSV, text, MODEL_ID)
            print(f"[{i}/{ITERATIONS}] ✔")
        except Exception as e:
            print(f"[{i}/{ITERATIONS}] ✘ {e}")
        time.sleep(SLEEP_SEC)

    print(f"\nDone. Outputs appended to {OUTPUT_CSV}")

if __name__ == "__main__":
    main()