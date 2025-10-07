import os
import random
import json
import csv
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
OUTPUT_FILENAME_CSV = "ai_text_dataset_openai.csv"

PRICES = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-5-mini": {"input": 0.125, "output": 1.00}, 
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-5-nano": {"input": 0.025, "output": 0.20}, 
    "gpt-4.1-nano": {"input": 0.10, "output": 0.40}, 
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
}

GENERATION_PLAN = [
    {"model": "gpt-4o-mini", "count": 1000},
    {"model": "gpt-5-mini", "count": 1000},
    {"model": "gpt-4.1", "count": 1000},
    {"model": "gpt-5-nano", "count": 1000},
    {"model": "gpt-4.1-nano", "count": 1000},
    {"model": "gpt-3.5-turbo", "count": 2000},
]

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
"""

# --- Helper Functions ---
def estimate_costs():
    """Estimates the total cost of the generation plan."""
    total_cost = 0
    avg_input_tokens = 250
    avg_output_tokens = 200

    print("--- Pre-run Cost Estimation ---")
    for task in GENERATION_PLAN:
        model = task["model"]
        count = task["count"]
        prices = PRICES.get(model)
        if not prices:
            print(f"Warning: No price info for {model}. Skipping its cost.")
            continue

        input_cost = (count * avg_input_tokens / 1_000_000) * prices["input"]
        output_cost = (count * avg_output_tokens / 1_000_000) * prices["output"]
        task_cost = input_cost + output_cost
        total_cost += task_cost
        print(f"- {model}: {count:,} samples ≈ ${task_cost:.2f}")

    print(f"\nTotal Estimated Cost: ${total_cost:.2f}")
    print("---------------------------------")
    return total_cost

def append_to_csv(data_dict, filename):
    """Appends a single row to a CSV file, creating it if it doesn't exist."""
    file_exists = os.path.isfile(filename)
    with open(filename, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=data_dict.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(data_dict)

def get_completed_counts(filename):
    """Counts completed samples for each model from the output file."""
    counts = {}
    if not os.path.isfile(filename):
        return counts
    with open(filename, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            model = row.get('source_model')
            if model:
                counts[model] = counts.get(model, 0) + 1
    return counts

# --- Main Generation Loop ---
def generate_dataset():
    """Executes the full generation plan and saves progress incrementally."""
    total_cost_so_far = 0
    
    completed_counts = get_completed_counts(OUTPUT_FILENAME_CSV)
    print("Resuming job. Completed counts:", completed_counts)

    for task in GENERATION_PLAN:
        model = task["model"]
        target_count = task["count"]
        
        start_count = completed_counts.get(model, 0)
        if start_count >= target_count:
            print(f"Skipping {model}: Already have {start_count}/{target_count} samples.")
            continue

        print(f"\n--- Starting job for model: {model} ---")
        print(f"Target: {target_count} samples. Already completed: {start_count}.")

        for i in range(start_count, target_count):
            params = {
                "topic": random.choice(topics), "format": random.choice(formats),
                "tone": random.choice(tones), "length": random.choice(lengths),
                "persona": random.choice(personas), "style_modifier": random.choice(style_modifiers)
            }
            final_prompt = prompt_template.format(**params)

            try:
                input_cost = (250 / 1_000_000) * PRICES[model]["input"]
                output_cost = (200 / 1_000_000) * PRICES[model]["output"]
                call_cost = input_cost + output_cost

                print(
                    f"Generating sample {i + 1}/{target_count} for {model}..."
                    f" (Est. Total Cost: ${total_cost_so_far:.2f})"
                )
                
                api_args = {
                    "model": model,
                    "messages": [{"role": "user", "content": final_prompt}],
                }

                if model.startswith("gpt-5"):
                    api_args["max_completion_tokens"] = 1024
                    api_args["temperature"] = 1
                else:
                    api_args["max_tokens"] = 1024
                    api_args["temperature"] = 0.9
                
                response = client.chat.completions.create(**api_args)

                generated_text = response.choices[0].message.content.strip()

                if generated_text:
                    result = {
                        "text": generated_text, "label": "ai",
                        "source_model": model, **params
                    }
                    append_to_csv(result, OUTPUT_FILENAME_CSV)
                    total_cost_so_far += call_cost
                else:
                    print("Warning: Received empty response from API.")

            except Exception as e:
                print(f"An error occurred: {e}")
                print("Waiting 20 seconds before retrying...")
                time.sleep(20)

if __name__ == "__main__":
    if not os.environ.get("OPENAI_API_KEY"):
        print("FATAL: OPENAI_API_KEY environment variable not set.")
    else:
        estimate_costs()
        confirm = input("Does this plan and cost look correct? (y/n): ")
        if confirm.lower() == 'y':
            generate_dataset()
        else:
            print("Generation cancelled.")