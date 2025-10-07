# batch_generate_openai_multi.py
import os
import json
import uuid
import time
import random
import csv
from typing import Dict, List, Tuple
from openai import OpenAI
import dotenv

dotenv.load_dotenv()

# Config
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise SystemExit("Set OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# New samples to add (you already have 18k gpt-4o + 1k gpt-5-mini)
MODEL_SCHEDULE = {
    "gpt-3.5-turbo": 5000,
    "o3-mini": 5000
}

BASE_DIR = "openai_batches"
os.makedirs(BASE_DIR, exist_ok=True)

TOPICS = [
    "The history of relational databases",
    "Quantum computing explained simply",
    "How to brew specialty coffee at home",
    "A summary of Shakespeare's Macbeth",
    "The impact of social media on elections",
    "DIY fix for a leaky faucet",
    "A beginner's guide to stock investing",
    "Monarch butterfly migration patterns",
    "Network subnetting basics",
    "Python vs Go for backend services",
    "Zero trust network architecture",
    "How CDNs cache and serve content",
    "CAP theorem tradeoffs in practice",
    "SQL indexing strategies",
    "Container security best practices",
]

FORMATS = [
    "a short blog post",
    "a professional email to a colleague",
    "a product review for a new smartphone",
    "a YouTube comment",
    "a single paragraph of a fictional story",
    "an encyclopedia entry",
    "a technical explanation of a concept",
    "marketing copy for a website",
    "a casual text message",
]

TONES = [
    "formal and academic",
    "informal and conversational",
    "persuasive and confident",
    "neutral and objective",
    "enthusiastic and upbeat",
    "skeptical and critical",
    "humorous and witty",
    "technical and precise",
]

PERSONAS = [
    "a university professor",
    "a skeptical IT administrator",
    "an excited marketing intern",
    "a disgruntled customer",
    "a helpful online community member",
    "a high school student",
    "a professional software developer",
]

LENGTHS_CHEAP = [
    ("A single sentence, between 15 and 25 words.", 64),
    ("A short paragraph, between 50 and 80 words.", 128),
    ("Two paragraphs, approximately 150 words total.", 256),
    ("A medium-length article, between 400 and 500 words.", 600),
]

CHEAP_MODELS = {
    "gpt-3.5-turbo": 5000,
    "o3-mini": 5000
}

PROMPT_TEMPLATE = (
    "You are a data generator. Your task is to produce a text sample based on "
    "the following parameters. Adhere to all constraints.\n\n"
    "---\n"
    "PARAMETERS:\n"
    "- Topic: {topic}\n"
    "- Format: {format}\n"
    "- Tone: {tone}\n"
    "- Length: {length_text}\n"
    "- Persona: {persona}\n"
    "---\n\n"
    "CONSTRAINTS:\n"
    "1. Primary Directive: Generate only the text requested. Do not include "
    'any introductory or concluding phrases like "Certainly, here is the '
    'text:" or "I hope this is helpful."\n'
    "2. Identity: Do not state, mention, or allude to the fact that you are "
    "an AI, language model, or computer program.\n"
    "3. Formatting: Do not use markdown unless the specified Format explicitly "
    'requires it. If a list is natural for the format, you may use simple "-" '
    "bullets.\n"
    "4. Adherence: Follow the specified Topic, Format, Tone, Length, and "
    "Persona precisely.\n"
    "---\n\n"
    "Begin generation now."
)

def choose_params(model: str) -> Tuple[Dict, int]:
    if model in CHEAP_MODELS:
        length_text, max_tokens = random.choice(LENGTHS_CHEAP)

    params = {
        "topic": random.choice(TOPICS),
        "format": random.choice(FORMATS),
        "tone": random.choice(TONES),
        "persona": random.choice(PERSONAS),
        "length_text": length_text,
    }
    return params, max_tokens

def build_request_line(model: str, custom_id: str) -> Tuple[Dict, Dict]:
    params, max_tokens = choose_params(model)
    final_prompt = PROMPT_TEMPLATE.format(**params)
    body = {
        "model": model,
        "messages": [{"role": "user", "content": final_prompt}],
        "temperature": 1.0,
        "max_completion_tokens": max_tokens,
    }
    line = {
        "custom_id": custom_id,
        "method": "POST",
        "url": "/v1/chat/completions",
        "body": body,
    }
    meta = {"custom_id": custom_id, "model": model}
    meta.update(params)
    return line, meta

def write_jsonl_and_manifest_for_model(
    model: str, count: int
) -> Tuple[str, str]:
    input_path = os.path.join(BASE_DIR, f"input_{model}.jsonl")
    manifest_path = os.path.join(BASE_DIR, f"manifest_{model}.json")
    manifest = {}
    with open(input_path, "w", encoding="utf-8") as f:
        for i in range(count):
            cid = f"{model}:{uuid.uuid4().hex[:12]}:{i}"
            line, meta = build_request_line(model, cid)
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
            manifest[cid] = meta
    with open(manifest_path, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2, ensure_ascii=False)
    return input_path, manifest_path

def create_batch(input_file_id: str):
    return client.batches.create(
        input_file_id=input_file_id,
        endpoint="/v1/chat/completions",
        completion_window="24h",
    )

def wait_for_batches(batch_ids: Dict[str, str]) -> Dict[str, str]:
    completed_files = {}
    pending = set(batch_ids.keys())
    while pending:
        for model in list(pending):
            b = client.batches.retrieve(batch_ids[model])
            status = b.status
            print(f"[{model}] status: {status}")
            if status in ("completed", "failed", "expired", "canceled"):
                if status != "completed":
                    raise RuntimeError(
                        f"Batch for {model} ended with status {status}"
                    )
                completed_files[model] = b.output_file_id
                pending.remove(model)
        if pending:
            time.sleep(15)
    return completed_files

def download_file(file_id: str, path: str) -> None:
    resp = client.files.content(file_id)
    with open(path, "wb") as f:
        f.write(resp.read())

def parse_batch_output(output_path: str, manifest: Dict[str, Dict]) -> List[Dict]:
    rows = []
    with open(output_path, "r", encoding="utf-8") as f:
        for line in f:
            obj = json.loads(line)
            cid = obj.get("custom_id")
            resp = obj.get("response") or {}
            body = resp.get("body") or {}
            choices = body.get("choices") or []
            if not cid or not choices:
                continue
            text = choices[0]["message"]["content"].strip()
            meta = manifest.get(cid, {})
            rows.append(
                {
                    "text": text,
                    "label": "ai",
                    "source_model": meta.get("model", ""),
                    "topic": meta.get("topic", ""),
                    "format": meta.get("format", ""),
                    "tone": meta.get("tone", ""),
                    "persona": meta.get("persona", ""),
                    "length_instruction": meta.get("length_text", ""),
                    "custom_id": cid,
                }
            )
    return rows

def save_csv(rows: List[Dict], path: str) -> None:
    if not rows:
        return
    headers = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)

def save_json(rows: List[Dict], path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    print("Preparing per-model inputs...")
    inputs = {}
    manifests = {}
    for model, count in MODEL_SCHEDULE.items():
        in_path, mf_path = write_jsonl_and_manifest_for_model(model, count)
        inputs[model] = in_path
        manifests[model] = mf_path
        print(f"{model}: wrote {count} requests -> {in_path}")

    print("Uploading files and creating batches...")
    batch_ids = {}
    for model, path in inputs.items():
        up = client.files.create(file=open(path, "rb"), purpose="batch")
        b = create_batch(up.id)
        batch_ids[model] = b.id
        print(f"{model}: batch id {b.id}")

    print("Waiting for all batches to complete...")
    out_file_ids = wait_for_batches(batch_ids)

    print("Downloading outputs...")
    per_model_rows = {}
    all_rows = []
    for model, file_id in out_file_ids.items():
        out_path = os.path.join(BASE_DIR, f"output_{model}.jsonl")
        download_file(file_id, out_path)
        with open(manifests[model], "r", encoding="utf-8") as mf:
            manifest = json.load(mf)
        rows = parse_batch_output(out_path, manifest)
        per_model_rows[model] = rows
        all_rows.extend(rows)
        save_csv(
            rows, os.path.join(BASE_DIR, f"ai_text_{model}.csv")
        )
        save_json(
            rows, os.path.join(BASE_DIR, f"ai_text_{model}.json")
        )
        print(f"{model}: parsed {len(rows)} rows")

    print(f"Merging {sum(len(v) for v in per_model_rows.values())} rows...")
    save_csv(all_rows, os.path.join(BASE_DIR, "ai_text_openai_batch_all.csv"))
    save_json(all_rows, os.path.join(BASE_DIR, "ai_text_openai_batch_all.json"))
    print("Done.")
