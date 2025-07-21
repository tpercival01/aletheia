chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PAGE_LOADED_HTML") {
    console.log("Received HTML from content script:", message.html);
  }
});