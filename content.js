console.log("Super Screenshot Tool content script loaded.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlightElements") {
    console.log("Content script received 'highlightElements' message.");

    sendResponse({ status: "elements_highlighted", count: 0 });
    return true;
  }
});