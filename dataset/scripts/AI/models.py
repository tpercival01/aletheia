import google.generativeai as genai
import csv
import time
import random
import dotenv
import os
dotenv.load_dotenv()

# Use your original API key from Google AI Studio
API_KEY = os.environ.get("GOOGLE_API_KEY")  # Your original API key
genai.configure(api_key=API_KEY)

def test_google_ai():
    """Test Google AI Studio API"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Write one sentence about cloud computing.")
        print(f"✓ Google AI Studio working: {response.text}")
        return True
    except Exception as e:
        print(f"✗ Google AI Studio failed: {e}")
        return False

def generate_with_google_ai():
    """Generate samples using Google AI Studio API"""
    
    # Available models in Google AI Studio
    models = {
        'gemini-1.5-flash': 15000,
        'gemini-1.5-pro': 8000, 
        'gemini-1.0-pro': 2000
    }
    
    all_results = []
    
    for model_name, count in models.items():
        print(f"\nGenerating {count} samples with {model_name}")
        
        try:
            model = genai.GenerativeModel(model_name)
            batch_results = []
            
            for i in range(count):
                try:
                    # Simple parameters
                    topics = ["cloud computing", "databases", "networking", "security", "programming"]
                    formats = ["explanation", "tutorial", "guide", "overview"]
                    
                    topic = random.choice(topics)
                    format_type = random.choice(formats)
                    
                    prompt = f"Write a technical {format_type} about {topic}. Write 2-3 sentences in a professional tone."
                    
                    response = model.generate_content(
                        prompt,
                        generation_config=genai.types.GenerationConfig(
                            max_output_tokens=500,
                            temperature=0.9
                        )
                    )
                    
                    if response.text:
                        result = {
                            "text": response.text.strip(),
                            "label": "ai",
                            "source_model": model_name,
                            "topic": topic,
                            "format": format_type,
                            "sample_number": len(all_results) + len(batch_results) + 1
                        }
                        batch_results.append(result)
                        
                        if (i + 1) % 500 == 0:
                            print(f"  Progress: {i + 1}/{count}")
                    
                    # Rate limiting
                    time.sleep(0.05)  # Small delay
                    
                except Exception as e:
                    print(f"Error on sample {i}: {e}")
                    time.sleep(1)
                    continue
            
            all_results.extend(batch_results)
            print(f"✓ Generated {len(batch_results)} samples with {model_name}")
            
        except Exception as e:
            print(f"✗ Failed with {model_name}: {e}")
            continue
    
    return all_results

def save_results(results, filename="google_ai_dataset.csv"):
    if results:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        print(f"✓ Saved {len(results)} samples to {filename}")

def main():
    print("Google AI Studio Dataset Generator")
    
    if test_google_ai():
        results = generate_with_google_ai()
        save_results(results)
        print(f"\nFinal count: {len(results)} samples")
    else:
        print("Google AI Studio API not working. Check your API key.")

if __name__ == "__main__":
    main()