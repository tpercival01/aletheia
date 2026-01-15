import { pipeline } from "@huggingface/transformers";

let DEBUG = true;
function log(...args) {
  if (!DEBUG) return;
  console.log("%c[Aletheia]", "color: #7d57ff; font-weight: bold;", ...args);
}

const TEXT_REPO_ID = "tpercival/distilbert_social_media";

class PipelineManager {
  constructor(task, model, dtype = "q8") {
    this.task = task;
    this.model = model;
    this.dtype = dtype;
    this.instance = null;
  }

  async getInstance(progress_callback = null) {
    this.instance ??= pipeline(this.task, this.model, { progress_callback, dtype: this.dtype, });

    return this.instance;
  }

  reset(task, model, dtype = "q8") {
    this.task = task;
    this.model = model;
    this.dtype = dtype;
    this.instance = null;
  }
}

const runTextPrediction = async (data) => {
  log("BEFORE PROCESSING: ", data);

  if (!data?.text?.data?.length) return [];
  const model = new PipelineManager("text-classification", TEXT_REPO_ID, "q8");
  const classifier = await model.getInstance();
  const sentences = data.text.data;

  const results = [];
  for (const text of sentences) {
    let result = await classifier(text.text);
    log(result, result[0]);

    if (result[0].label == "human") {
      results.push({ ...text, HUMAN: result[0].score, AI: (1 - result[0].score)});
    } else {
      results.push({ ...text, AI: result[0].score, HUMAN: (1 - result[0].score)});
    }
  }

  log("AFTER PROCESSING: ", results);
  return results;
};

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
          log(default_settings);
        });
      } else {
        log(result.settings);
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
          log("error ", err);
        }
      })();

      return true;

    case "SCAN_AGAIN":
      log("Asking content to scan again");

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
      log("Resetting page and all contents.");
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
      log("Getting current state");
      sendResponse(tabState);
      return true;
  }
});

async function process_payload(payload) {
  // TEXT
  const processedTexts = await runTextPrediction(payload);

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
  log(process);
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
