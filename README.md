# Aletheia

## Introduction

As Generative AI (GAI) becomes increasingly sophisticated, distinguishing between human and synthetic text has become a critical challenge for digital literacy. Aletheia is a privacy-preserving Chrome Extension and educational framework designed to detect AI-generated text in real-time.

Unlike traditional detectors that require data to be sent to a remote server, Aletheia runs entirely within the browser. It utilizes a quantized DistilBERT model executed via WebAssembly (WASM) to perform zero-latency inference without user data ever leaving the local device.

## Features

- Client-Side Inference: Powered by Transformers.js and ONNX Runtime, ensuring 100% data privacy. No API keys, no servers, no data leakage.

- Real-Time DOM Analysis: Utilizes an optimized MutationObserver to scan dynamic content (e.g., Reddit, Twitter/X) without impacting browser performance.

- Explainable AI (XAI): Provides granular confidence scores via interactive tooltips, moving beyond binary "True/False" flags to help users understand probabilistic uncertainty.

- Educational Ecosystem: Integrated with a companion pedagogical platform hosted on GitHub Pages, featuring interactive quizzes and modules to improve the user's biological detection capabilities.

- Optimized Performance: Features a 12.3ms average inference latency using 8-bit quantized models for minimal cognitive drag.

## Technologies Used

*   **Backend & AI Inference:**
    *   Python 3.9+
    *   TensorFlow 2.x
    *   Flask / FastAPI (for backend API development)
    *   NumPy, Pandas, Scikit-learn (for data processing and evaluation)
*   **Browser Extension (Frontend):**
    *   JavaScript (ES6+)
    *   HTML5, CSS3
    *   Web browser APIs (Chrome/Firefox extensions API)
*   **Development & Version Control:**
    *   Git
    *   GitHub
    *   `pyenv` / `venv` (for Python environment management)
    *   Homebrew (macOS package manager)

## Installation


## Usage


## Project Structure

## Contributing

This repository primarily serves as the codebase for an MSc dissertation project. While formal contributions are not expected, feedback or suggestions are welcome.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
