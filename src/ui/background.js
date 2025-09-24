import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-converter";
import "@tensorflow/tfjs-backend-cpu";
import "@tensorflow/tfjs-backend-webgl";
import { AutoTokenizer } from "@xenova/transformers";

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

const testSentences = [
  "This is a test message written by a human.",
  "The quantum fluctuations of spacetime imply a non-trivial causal structure.",
  "Click here to win a FREE iPhone right now!!!",
  "AI will revolutionize every industry, from healthcare to finance.",
  "bro wtf 💀🔥😂😂😂",
  "Yesterday I went to the park with my dog. It was sunny and calm.",
];

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
