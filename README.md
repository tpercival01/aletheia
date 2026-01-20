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

## Technology Stack

- Model: Fine-tuned distilbert-base-uncased (Quantized to INT8).

- Frontend: Chrome Manifest V3, JavaScript (ES6+), HTML/CSS.

- Inference Engine: @xenova/transformers (WASM).

- Training: PyTorch, Hugging Face optimum for ONNX conversion.

## Installation
TO RUN ALETHEIA, YOU WILL NEED TO SET YOUR CHROME EXTENSIONS TO DEVELOPER MODE

1. Open Chrome Extensions management page.
2. Turn on "Developer Mode".
3. Clone this repo into a safe location.
4. Open the root folder and run the commands: "npm install" then "npm run build".
5. Once done, you should see a "Build" folder.
6. Now go back to chrome, click "Load unpacked" and select that build folder.

## Contributing

This repository primarily serves as the codebase for an MSc dissertation project. While formal contributions are not expected, feedback or suggestions are welcome.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
