import os
import csv
import time
import json
import math
import random
from typing import List, Dict
import anthropic
import dotenv

dotenv.load_dotenv()

# Config
ANTHROPIC_API_KEY = os.environ.get("CLAUDE_API_KEY")
client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

OUTPUT_CSV = "anthropic_ai_text_dataset.csv"
BATCH_SIZE = 800  # keep well under API limits
POLL_SEC = 10
TEMPERATURE = 0.9
HARD_NEG_RATE = 0.05  # human emulation hard negatives
MEDIUM_RATE = 0.05    # medium-length share; rest short

# Model plan
MODEL_PLAN = {
    "claude-3-5-haiku-20241022": 18000,
    "claude-3-haiku-20240307": 6000,
    "claude-3-5-sonnet-20240620": 1000,  # short-only to control cost
}

# Parameter spaces (truncate here; expand in production)
TOPICS = [
    "network subnetting basics",
    "container vs VM isolation",
    "caching strategies for web APIs",
    "event-driven architectures",
    "zero trust networking",
    "DevOps incident postmortems",
    "SQL vs NoSQL trade-offs",
    "distributed tracing overview",
]
FORMATS = [
    "short blog blurb",
    "professional email",
    "product review",
    "YouTube comment",
    "single fiction paragraph",
    "encyclopedia entry",
    "technical explanation",
    "website marketing copy",
    "casual text message",
]
TONES = [
    "formal and academic",
    "informal and conversational",
    "persuasive and confident",
    "neutral and objective",
    "enthusiastic and upbeat",
    "skeptical and critical",
    "humorous and dry",
    "technical and precise",
]
PERSONAS = [
    "university professor",
    "skeptical IT admin",
    "marketing intern",
    "disgruntled customer",
    "helpful community member",
    "high school student",
    "software developer",
]

SHORT_SPEC = {
    "desc": "short form; 1–3 sentences; 40–120 tokens",
    "max_tokens": 140,
}
MEDIUM_SPEC = {
    "desc": "medium form; 120–250 words; 180–320 tokens",
    "max_tokens": 320,
}

SYSTEM_BRIEF = (
    "Produce only the requested text. No preambles or explanations. "
    "Do not mention being an AI or model. Avoid markdown unless the "
    "format explicitly requires it."
)

def pick_length_spec() -> Dict:
    return MEDIUM_SPEC if random.random() < MEDIUM_RATE else SHORT_SPEC

def maybe_hard_negative() -> bool:
    return random.random() < HARD_NEG_RATE

def build_user_prompt(
    topic: str,
    fmt: str,
    tone: str,
    persona: str,
    spec: Dict,
    hard_negative: bool,
) -> str:
    hn = (
        "Emulate casual human writing: allow one minor grammatical error, "
        "use a colloquialism, and vary sentence length. "
        if hard_negative
        else ""
    )
    return (
        f"Topic: {topic}\n"
        f"Format: {fmt}\n"
        f"Tone: {tone}\n"
        f"Persona: {persona}\n"
        f"Length: {spec['desc']}\n"
        f"{hn}"
        "Only output the content."
    )

def rand_choice(a: List[str]) -> str:
    return a[random.randrange(len(a))]

def make_request(custom_id: str, model: str) -> Dict:
    spec = pick_length_spec()
    hard_neg = maybe_hard_negative()
    topic = rand_choice(TOPICS)
    fmt = rand_choice(FORMATS)
    tone = rand_choice(TONES)
    persona = rand_choice(PERSONAS)
    user_msg = build_user_prompt(topic, fmt, tone, persona, spec, hard_neg)
    params = {
        "model": model,
        "max_tokens": spec["max_tokens"],
        "temperature": TEMPERATURE,
        "system": SYSTEM_BRIEF,
        "messages": [{"role": "user", "content": user_msg}],
    }
    # Pack metadata into custom_id to recover later
    meta = {
        "topic": topic,
        "format": fmt,
        "tone": tone,
        "persona": persona,
        "length": "medium" if spec is MEDIUM_SPEC else "short",
        "hard_negative": hard_neg,
        "model": model,
    }
    return {"custom_id": custom_id, "params": params}

def chunked(seq: List, size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]

def submit_batches_for_model(model: str, count: int) -> List[str]:
    requests = [make_request(f"{model}-{i}", model) for i in range(count)]
    batch_ids = []
    for i, chunk in enumerate(chunked(requests, BATCH_SIZE)):
        print(f"Submitting batch chunk {i+1} for {model} with {len(chunk)} reqs")
        batch = client.messages.batches.create(requests=chunk)
        batch_ids.append(batch.id)
    return batch_ids

def poll_batch(batch_id: str) -> dict:
    while True:
        info = client.messages.batches.retrieve(batch_id)
        state = getattr(info, "processing_status", None) or getattr(
            info, "state", None
        )
        print(f"Batch {batch_id} status: {state}")
        if state in ("completed", "failed", "cancelled"):
            return info
        time.sleep(POLL_SEC)

def extract_text(message_obj: dict) -> str:
    # Message content is a list of blocks; join all text blocks
    content = message_obj.get("content", [])
    parts = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            parts.append(block.get("text", ""))
    return "".join(parts).strip()

def iter_batch_results(batch_id: str):
    # Preferred path if SDK provides results() with .data list
    try:
        res = client.messages.batches.results(batch_id)
        data = getattr(res, "data", None) or res
        for item in data:
            yield item
        return
    except Exception:
        pass
    # Fallback: some SDK versions expose result_file_id
    info = client.messages.batches.retrieve(batch_id)
    result_file_id = getattr(info, "result_file_id", None) or getattr(
        info, "results_file_id", None
    )
    if not result_file_id:
        raise RuntimeError(
            "Could not access batch results. Update anthropic SDK or "
            "download from console using the batch ID."
        )
    file_content = client.files.content(result_file_id)
    # file_content is bytes or iterator; assume bytes for simplicity
    text = file_content if isinstance(file_content, str) else file_content.read()
    for line in text.splitlines():
        if not line.strip():
            continue
        yield json.loads(line)

def write_csv_header(path: str):
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(
                [
                    "text",
                    "source_model",
                    "length",
                    "topic",
                    "format",
                    "tone",
                    "persona",
                    "hard_negative",
                    "input_tokens",
                    "output_tokens",
                    "custom_id",
                    "batch_id",
                ]
            )

def append_row(path: str, row: Dict):
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(
            [
                row.get("text", ""),
                row.get("source_model", ""),
                row.get("length", ""),
                row.get("topic", ""),
                row.get("format", ""),
                row.get("tone", ""),
                row.get("persona", ""),
                row.get("hard_negative", False),
                row.get("input_tokens", ""),
                row.get("output_tokens", ""),
                row.get("custom_id", ""),
                row.get("batch_id", ""),
            ]
        )

def main():
    write_csv_header(OUTPUT_CSV)
    all_batch_ids = []
    for model, count in MODEL_PLAN.items():
        ids = submit_batches_for_model(model, count)
        all_batch_ids.extend(ids)

    for b_id in all_batch_ids:
        info = poll_batch(b_id)
        state = getattr(info, "processing_status", None) or getattr(
            info, "state", None
        )
        if state != "completed":
            print(f"Batch {b_id} ended with state={state}; skipping")
            continue
        print(f"Fetching results for batch {b_id}")
        for item in iter_batch_results(b_id):
            # item may be {"custom_id": "...", "result": {...}, "error": ...}
            if item.get("error"):
                continue
            packed = item.get("custom_id")
            try:
                meta_pack = json.loads(packed)
                cid = meta_pack["cid"]
                meta = meta_pack["meta"]
            except Exception:
                cid = packed
                meta = {}
            result = item.get("result") or item.get("message") or {}
            text = extract_text(result)
            usage = result.get("usage", {}) or {}
            row = {
                "text": text,
                "source_model": meta.get("model", ""),
                "length": meta.get("length", ""),
                "topic": meta.get("topic", ""),
                "format": meta.get("format", ""),
                "tone": meta.get("tone", ""),
                "persona": meta.get("persona", ""),
                "hard_negative": meta.get("hard_negative", False),
                "input_tokens": usage.get("input_tokens", ""),
                "output_tokens": usage.get("output_tokens", ""),
                "custom_id": cid,
                "batch_id": b_id,
            }
            append_row(OUTPUT_CSV, row)

if __name__ == "__main__":
    main()