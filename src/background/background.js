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

async function runBatchPrediction(data) {
  const tokenizer = await tokenizerP;
  const model = await modelP;

  const results = [];
  const sentences = data.text.data.slice(0,20);
  console.log("PAYLOAD BEFORE PREDICTION: ",sentences);

  for (const text of sentences) {
    try {
      let text_str = text.text;

      // tokenize
      const encIds = await tokenizer.encode(text_str);
      const maskArr = new Array(encIds.length).fill(1);
      const idsT = tf.tensor2d([encIds], [1, encIds.length], "int32");
      const maskT = tf.tensor2d([maskArr], [1, encIds.length], "int32");

      // predict
      const out = model.execute({
        input_ids: idsT,
        attention_mask: maskT,
      });
      
      const logits = Array.isArray(out) ? out[0] : out;
      const probs = tf.softmax(logits, -1);
      const [, ai] = await probs.data();

      results.push({ text_str, aiScore: ai});
    } catch (err) {
      console.error("Prediction error:", err);
      results.push({ text_str, error: err.message });
    }
  }

  return results;
}

let isEnabled;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("enabled", ({enabled}) => {
    if (typeof enabled === "undefined"){
      chrome.storage.local.set({enabled: true});
      isEnabled = true;
    } else {
      isEnabled = enabled;
    }
  })
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("enabled").then(({enabled}) => {
    isEnabled = enabled ?? true;
  });
});

// Need to rewrite below function to add checks to see if enabled ^

let tabState = {
  tabID: null,
  status: "Ready to scan!",
  startedAt: null,
  aiPosCount: 0,
  aiSomeCount: 0
};

chrome.storage.local.set({state: tabState});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "PROCESS":
      change_popup("Processing");
      tabState = {
        tabID: tabState.tabID,
        status: "Processing",
        startedAt: Date.now(),
        aiCount: 0
      };
      chrome.storage.local.set({state: tabState});

      (async function runProcess() {
        try {
          let payload;
          runBatchPrediction(message.payload).then((res) => {
            payload = res;
            console.log("PAYLOAD AFTER PREDICTION: ", payload);
            sendResponse(payload);
          });

          tabState.status = "Completed";
          // tabState.aiPosCount = payload.aiPosCount;
          // tabState.aiSomeCount = payload.aiSomeCount;
          chrome.storage.local.set({state: tabState});
          change_popup("Completed");
        } catch (err) {
          console.error("error ", err);
        }
      })();

      return true;

    case "SCAN_AGAIN":
      console.log("Asking content to scan again");

      tabState = {
        tabID: tabState.tabID,
        status: "Processing",
        startedAt: Date.now(),
      };
      chrome.storage.local.set({state: tabState});

      sendResponse(tabState);
      call_to_scan_again();
      return true;

    case "RESET_PAGE_POPUP":
      console.log("Resetting page and all contents.");
      tabState = {
        tabID: tabState.tabID,
        status: "Resetting",
        startedAt: Date.now(),
      };
      chrome.storage.local.set({state: tabState});

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
  console.log(payload)

  // TEXT

  const processedTexts = await Promise.all(
    payload.text.data.map(async (textItem) => ({
      ...textItem,
      confidence: await analyzeText(textItem)
    }))
  )

  let positive_AI = 0;
  let somewhat_AI = 0;
  processedTexts.forEach((item) => {
    if (item.confidence > 0.9){
      positive_AI += 1;
    } else if (item.confidence > 0.5){
      somewhat_AI += 1;
    }
  })

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
    text: {...payload.text, data: processedTexts},
    images: {...payload.images, data: ""},
    aiPosCount: positive_AI,
    aiSomeCount: somewhat_AI
  }
}

async function analyzeText(textItem){
  return 0.99;
}

async function analyzeImage(imageItem){
  return Math.random();
}

async function analyzeVideo(videoItem){}
async function analyzeAudio(audioItem){}

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

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "RESET_PAGE_CONTENT",
      source: "background",
    });
  }

  tabState = {
    tabID: tab.id,
    status: "Ready to scan!",
    startedAt: null,
  };
  chrome.storage.local.set({state: tabState});

  chrome.action.setBadgeText({ text: "" });
}

async function call_to_scan_again() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_AGAIN",
      source: "background",
    });

    tabState = {
      tabID: tab.id,
      status: "Completed",
      startedAt: null,
    };
    chrome.storage.local.set({state: tabState});

  }
}