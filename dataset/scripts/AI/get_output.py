import csv
import json
import os
import argparse
import sys


def process_batch_file(jsonl_path, csv_writer):
    processed_count = 0
    skipped_count = 0

    with open(jsonl_path, "r", encoding="utf-8") as jsonl_file:
        for line_num, line in enumerate(jsonl_file, 1):
            try:
                data = json.loads(line)

                # Skip if the API call was not successful
                if data.get("result", {}).get("type") != "succeeded":
                    skipped_count += 1
                    continue

                message = data["result"]["message"]
                model = message["model"]
                text = message["content"][0]["text"]
                label = "ai"

                csv_writer.writerow(
                    {"model": model, "text": text, "label": label}
                )
                processed_count += 1

            except (json.JSONDecodeError, KeyError, IndexError) as e:
                print(
                    f"    - Skipping line {line_num} in {os.path.basename(jsonl_path)} due to error: {e}"
                )
                skipped_count += 1
                continue

    return processed_count, skipped_count


def main():
    """Main function to orchestrate the directory processing."""
    parser = argparse.ArgumentParser(
        description="Convert all Anthropic batch .jsonl files in a directory to a single CSV dataset."
    )
    parser.add_argument(
        "-d",
        "--input-dir",
        required=True,
        help="Path to the directory containing .jsonl files.",
    )
    parser.add_argument(
        "-o",
        "--output",
        required=True,
        help="Path to the output .csv file (will be created or appended).",
    )
    args = parser.parse_args()

    # --- Input Validation ---
    if not os.path.isdir(args.input_dir):
        print(f"Error: Input directory not found at '{args.input_dir}'")
        sys.exit(1)

    # Find all relevant files in the directory
    files_to_process = [
        f
        for f in os.listdir(args.input_dir)
        if f.endswith("_results.jsonl")
    ]

    if not files_to_process:
        print(f"No '*_results.jsonl' files found in '{args.input_dir}'.")
        sys.exit(0)

    print(f"Found {len(files_to_process)} files to process.")

    # --- CSV Handling ---
    file_exists = os.path.exists(args.output)
    total_processed = 0
    total_skipped = 0

    try:
        with open(
            args.output, "a", newline="", encoding="utf-8"
        ) as csv_file:
            fieldnames = ["text", "label", "model"]
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)

            if not file_exists:
                writer.writeheader()

            # --- File Processing Loop ---
            for filename in sorted(files_to_process):
                full_path = os.path.join(args.input_dir, filename)
                print(f"Processing '{filename}'...")

                processed, skipped = process_batch_file(full_path, writer)
                total_processed += processed
                total_skipped += skipped

    except IOError as e:
        print(f"Error writing to CSV file: {e}")
        sys.exit(1)

    # --- Final Summary ---
    print("\n--- All Files Processed ---")
    print(f"Total rows successfully appended: {total_processed}")
    print(f"Total rows skipped (errors or failures): {total_skipped}")
    print(f"Output saved to: {args.output}")


if __name__ == "__main__":
    main()