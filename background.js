let processingInterval = null;
function startProcessingIndicator() {
  const frames = [
    {16: "icons/indicator_16_a.png", 32: "icons/indicator_32_a.png"},
    {16: "icons/indicator_16_b.png", 32: "icons/indicator_32_b.png"}
  ];

  let idx = 0;

  processingInterval = setInterval(() => {
    chrome.action.setIcon({path: frames[idx]});
    idx = (idx + 1) % frames.length;
  }, 500);
}

function stopProcessingIndicator() {
  if (processingInterval){
    clearInterval(processingInterval);
    processingInterval = null;
  }

  chrome.action.setIcon({
    path: {16: "icons/default16.png", 32: "icons/default32.png"}
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCRAPED_PAYLOAD") {
    console.log("Received ", message);
  }
});

chrome.action.onClicked.addListener(() => {
  startProcessingIndicator();
  console.log("started")
  setTimeout(() => {
    stopProcessingIndicator();
    console.log("Stopped")
  }, 5000);
})