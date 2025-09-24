import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import { AutoTokenizer } from "@xenova/transformers";

const REPO_ID = "tpercival/bert-uncased-social_media";
const MODEL_URL = `https://huggingface.co/${REPO_ID}/resolve/main/model.json`;

// Kicks off loading once
const tokenizerP = AutoTokenizer.from_pretrained(REPO_ID);
const modelP = tf.loadGraphModel(MODEL_URL);

async function runBatchPrediction(sentences) {
  const tokenizer = await tokenizerP;
  const model = await modelP;

  const results = [];

  for (const text of sentences) {
    try {
      // tokenize
      const encIds = await tokenizer.encode(text);
      const maskArr = new Array(encIds.length).fill(1);
      const idsT = tf.tensor2d([encIds], [1, encIds.length], "int32");
      const maskT = tf.tensor2d([maskArr], [1, encIds.length], "int32");

      // predict
      const out = await model.executeAsync({
        input_ids: idsT,
        attention_mask: maskT,
      });
      const logits = Array.isArray(out) ? out[0] : out;
      const probs = tf.softmax(logits, -1);
      const [h, a] = await probs.data();

      results.push({ text, human: h, ai: a });
    } catch (err) {
      console.error("Prediction error:", err);
      results.push({ text, error: err.message });
    }
  }

  return results;
}

const sentences = [
  "The quick brown fox jumps over the lazy dog.",
  "Artificial intelligence is transforming the world in unprecedented ways.",
  "The mitochondria is the powerhouse of the cell.",
];

runBatchPrediction(sentences).then((res) => {
  console.log("Predictions:", res);
});

class AI_MODEL {
  constructor() {
    this.model = null;
    this.inited = false;
  }

  async initialize() {
    if (this.inited) return;
    try {
      this.model = await pipeline("text-classification", "local/bert-uncased", {
        quantized: false,
      });
      this.inited = true;
      console.log("✅ AI_MODEL initialized");
    } catch (error) {
      console.error("Failed to initialize AI_MODEL:", error);
      throw error;
    }
  }

  async predict(text) {
    if (!this.model) {
      await this.initialize();
    }
    const output = await this.model(text);
    return output;
  }
}

let tabState = {
  tabID: null,
  status: "Idle",
  results: [],
  startedAt: null,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "PROCESS":
      change_popup("Processing");
      tabState = {
        tabID: tabState.tabID,
        status: "Processing",
        results: message.payload,
        startedAt: Date.now(),
      };

      // (async function runProcess() {
      //   try {
      //     const payload = await process_payload(message.payload);
      //     sendResponse(payload);

      //     tabState.status = "Completed";
      //     change_popup("Completed");
      //   } catch (err) {
      //     console.error("error ", err);
      //   }
      // })();

      return true;

    case "SCAN_AGAIN":
      console.log("Asking content to scan again");

      tabState = {
        tabID: tabState.tabID,
        status: "Processing",
        results: [],
        startedAt: Date.now(),
      };

      sendResponse(tabState);
      call_to_scan_again();
      return true;

    case "RESET_PAGE_POPUP":
      console.log("Resetting page and all contents.");
      tabState = {
        tabID: tabState.tabID,
        status: "Resetting",
        results: [],
        startedAt: Date.now(),
      };
      sendResponse(tabState);
      call_to_reset();
      return true;

    case "GET_POPUP_STATE":
      console.log("Getting current state");
      sendResponse(tabState);
      return true;
  }
});

async function process_payload(payload) {
  console.log(payload);

  // TEXT
  const samples = payload.text.data.map((item) => item.text);
  console.log("Samples: ", samples.slice(0, 10));
  const processedTexts = detector.processBatches(
    samples.slice(0, 10),
    samples.length
  );
  console.log("Processed texts: ", processedTexts);
  // IMAGES

  // const processedImages = await Promise.all(
  //   payload.images.data.map(async (imageItem) => ({
  //     ...imageItem,
  //     confidence: await analyzeImage(imageItem)
  //   }))
  // )

  // VIDEOS

  // AUDIO

  return {
    text: { ...payload.text, data: processedTexts },
    images: { ...payload.images, data: "" },
  };
}

async function analyzeText(textItem) {
  return Math.random();
}

async function analyzeImage(imageItem) {
  return Math.random();
}

async function analyzeVideo(videoItem) {}
async function analyzeAudio(audioItem) {}

function change_popup(process) {
  console.log(process);
  switch (process) {
    case "Processing":
      chrome.action.setBadgeText({ text: "..." });
      chrome.action.setBadgeBackgroundColor({ color: "#777777" });
      break;
    case "Completed":
      chrome.action.setBadgeText({ text: "" });
      break;
  }
}

async function call_to_reset() {
  await new Promise((r) => setTimeout(r, 2000));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const response = chrome.tabs.sendMessage(tab.id, {
      type: "RESET_PAGE_CONTENT",
      source: "background",
    });
    console.log(response);
  }

  tabState = {
    tabID: tab.id,
    status: "Idle",
    results: [],
    startedAt: null,
  };

  await chrome.runtime.sendMessage({ status: "Idle" });
  chrome.action.setBadgeText({ text: "" });
}

async function call_to_scan_again() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_AGAIN",
      source: "background",
    });

    console.log(response);

    const popup_response = await chrome.runtime.sendMessage({
      status: "Completed",
    });

    tabState = {
      tabID: tab.id,
      status: "Completed",
      results: [],
      startedAt: null,
    };
  }
}
