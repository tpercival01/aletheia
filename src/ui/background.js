let tabState = {
  tabID: null,
  status: "Idle",
  startedAt: null,
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
      };
      chrome.storage.local.set({state: tabState});

      (async function runProcess() {
        try {
          const payload = await process_payload(message.payload);
          sendResponse(payload);

          tabState.status = "Completed";
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
    images: {...payload.images, data: ""}
  }
}

async function analyzeText(textItem){
  return Math.random();
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
    startedAt: null,
  };
  chrome.storage.local.set({state: tabState});


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

    const popup_response = await chrome.runtime.sendMessage({status: "Completed"});

    tabState = {
      tabID: tab.id,
      status: "Completed",
      startedAt: null,
    };
    chrome.storage.local.set({state: tabState});

  }
}