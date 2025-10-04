import os
import random
import json
import csv
import time
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
OUTPUT_FILENAME_CSV = "ai_text_dataset_openai.csv"

# --- Pricing Data (per 1M tokens) ---
# Based on the user-provided chart
PRICES = {
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-5-mini": {"input": 0.125, "output": 1.00}, # Batch price
    "gpt-4.1": {"input": 2.00, "output": 8.00},
    "gpt-5-nano": {"input": 0.025, "output": 0.20}, # Batch price
}

# --- THE STRATEGIC GENERATION PLAN ---
GENERATION_PLAN = [
    {"model": "gpt-4o-mini", "count": 30000},
    {"model": "gpt-5-mini", "count": 12000},
    {"model": "gpt-4.1", "count": 1000},
    {"model": "gpt-5-nano", "count": 5000},
]

# --- Parameter Lists ---
# Expand these lists for better results
topics = [
    "The history of relational databases", "Quantum computing explained simply",
    "How to brew the perfect cup of coffee", "The impact of social media",
    "DIY home repair for a leaky faucet", "Network subnetting basics",
    "Comparing Python and Go for backend development", "The fall of the Roman Empire"
]
formats = [
    "a short blog post", "a professional email", "a product review",
    "a YouTube comment", "a paragraph of a fictional story",
    "a technical explanation", "marketing copy for a website"
]
tones = [
    "formal and academic", "informal and conversational",
    "persuasive and confident", "neutral and objective",
    "enthusiastic and upbeat", "skeptical and critical", "humorous"
]
# MODIFIED: Skewed towards shorter lengths to save money
lengths = [
    "A single sentence, between 15 and 25 words.",
    "A short paragraph, between 50 and 80 words.", # More frequent
    "A short paragraph, between 50 and 80 words.",
    "A short paragraph, between 50 and 80 words.",
    "Two paragraphs, approximately 150 words total.",
    "A medium-length article, between 300 and 400 words."
]
personas = [
    "a university professor", "a skeptical IT administrator",
    "an excited marketing intern", "a disgruntled customer",
    "a helpful online community member", "a high school student"
]

# --- Prompt Template ---
prompt_template = """
You are a data generator. Produce a text sample based on these parameters.

**PARAMETERS:**
- Topic: {topic}
- Format: {format}
- Tone: {tone}
- Length: {length}
- Persona: {persona}

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
                "persona": random.choice(personas)
            }
            final_prompt = prompt_template.format(**params)

            try:
                # Estimate cost for this single call
                # Note: This is an approximation using average token counts
                input_cost = (250 / 1_000_000) * PRICES[model]["input"]
                output_cost = (200 / 1_000_000) * PRICES[model]["output"]
                call_cost = input_cost + output_cost

                print(
                    f"Generating sample {i + 1}/{target_count} for {model}..."
                    f" (Est. Total Cost: ${total_cost_so_far:.2f})"
                )
                
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": final_prompt}],
                    max_tokens=1024, temperature=0.9
                )
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