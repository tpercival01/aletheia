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

const statusMessage = document.getElementById("statusMessage");

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "SCRAPED_PAYLOAD") {
    console.log("Received ", message);
    statusMessage.innerHTML = "Successfully grabbed HTML on load.";
    statusMessage.classList.add("success");

    startProcessingIndicator();
  } else if (message.type === "STOP_PROCESSING"){
    stopProcessingIndicator();
  }
});