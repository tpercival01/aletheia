// import * as tf from "@tensorflow/tfjs";
// import { pipeline } from "@xenova/transformers";
import { pipeline } from "@huggingface/transformers";

const REPO_ID = "tpercival/distilbert_social_media";
const MODEL_URL = `https://huggingface.co/${REPO_ID}/resolve/main/model.json`;

class PipelineSingleton {
  static task = "text-classification";
  static model = "tpercival/distilbert_social_media";
  static instance = null;

  static async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, { progress_callback });

    return this.instance;
  }
}

const runBatchPrediction = async (data) => {
  console.log("BEFORE PROCESSING: ", data);

  if (!data?.text?.data?.length) return [];
  let model = await PipelineSingleton.getInstance();
  const sentences = data.text.data;

  const results = [];
  for (const text of sentences) {
    let result = await model(text.text);
    console.log(result, result[0]);
    if (result[0].label == "human") {
      results.push({ ...text, HUMAN: result[0].score });
    } else {
      results.push({ ...text, AI: result[0].score });
    }
  }

  console.log("AFTER PROCESSING: ", results);
  return results;
};

// const tokenizerP = AutoTokenizer.from_pretrained(REPO_ID);
// const modelP = tf.loadGraphModel(MODEL_URL);

// async function runBatchPrediction(data) {
//   if (!data?.text?.data?.length) return [];

//   const tokenizer = await tokenizerP;
//   const model = await modelP;

//   const results = [];
//   const sentences = data.text.data;
//   console.log("PAYLOAD BEFORE PREDICTION: ", sentences);

//   for (const text of sentences) {
//     try {
//       let text_str = text.text;
//       let encIds;

//       try {
//         encIds = await tokenizer.encode(text_str);
//       } catch (err) {
//         console.log(text_str, " caused error: ", err);
//       }

//       const idsT = tf.tensor2d([encIds], [1, encIds.length], "int32");
//       const maskT = tf.onesLike(idsT);

//       const out = model.execute({
//         input_ids: idsT,
//         attention_mask: maskT,
//       });

//       const logits = Array.isArray(out) ? out[0] : out;
//       const probs = tf.softmax(logits, -1);
//       const [human, ai] = await probs.data();
//       results.push({
//         aiScore: ai * 100,
//         humanScore: human * 100,
//       });

//       idsT.dispose();
//       maskT.dispose();
//       logits.dispose();
//       probs.dispose();
//     } catch (err) {
//       console.error("Prediction error:", err);
//       results.push({ error: err.message });
//     }
//   }

//   return results;
// }

let isEnabled;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("enabled", ({ enabled }) => {
    if (typeof enabled === "undefined") {
      chrome.storage.local.set({ enabled: true });
      isEnabled = true;
    } else {
      isEnabled = enabled;
    }

    const default_settings = {
      thresholds: [35, 85],
      colours: {
        human: "green",
        uncertain: "yellow",
        ai: "red",
      },
      resultStyle: "badge",
      contentTypes: {
        text: true,
        images: false,
        video: false,
        audio: false,
      },
      pageOverview: true,
      performance: "balanced",
      siteControl: {
        whitelist: [],
        blacklist: [],
      },
    };

    chrome.storage.local.get("settings", (result) => {
      if (!result.settings) {
        chrome.storage.local.set({ settings: default_settings }, () => {
          console.log(default_settings);
        });
      } else {
        console.log(result.settings);
      }
    });
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("enabled").then(({ enabled }) => {
    isEnabled = enabled ?? true;
  });
});

let tabState = {
  tabID: null,
  status: "Ready to scan!",
  startedAt: null,
  aiPosCount: 0,
  aiSomeCount: 0,
  aiHumanCount: 0,
};

chrome.storage.local.set({ state: tabState });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "PROCESS":
      change_popup("Processing");
      tabState = {
        tabID: tabState.tabID,
        status: "Processing",
        startedAt: Date.now(),
        aiCount: 0,
      };
      chrome.storage.local.set({ state: tabState });

      (async function runProcess() {
        try {
          const response = await process_payload(message.payload);
          sendResponse(response);
          tabState.status = "Completed";
          chrome.storage.local.set({ state: tabState });
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
      chrome.storage.local.set({ state: tabState });

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
      chrome.storage.local.set({ state: tabState });

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
  // TEXT
  const processedTexts = await runBatchPrediction(payload);
  // const processedTexts = payload.text.data.map((obj, i) => ({
  //   ...obj,
  //   aiScore: results[i]["aiScore"],
  //   humanScore: results[i]["humanScore"],
  // }));

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
    text: processedTexts,
  };
}

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
  chrome.storage.local.set({ state: tabState });

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
      status: "Processing",
      startedAt: null,
    };
    chrome.storage.local.set({ state: tabState });
  }
}
