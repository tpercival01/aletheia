const statusMessage = document.getElementById("status_message");
const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");
const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

const updateUI = (data) => {
  statusMessage.textContent = `Status: ${data.status || "Idle"}`;
  statusMessage.className = "status";
  switch (data.status) {
    case "Processing":
      break;
    case "Scanning...":
      statusMessage.classList.add("status--processing");
      break;
    case "Complete: 0 issues":
      statusMessage.classList.add("status--success");
      break;
    case "Complete: Multiple issues found":
      statusMessage.classList.add("status--warning");
      break;
    default:
      statusMessage.classList.add("status--idle");
      break;
  }

  if (data.results && data.results.length > 0) {
    resultsList.innerHTML = "";
    data.results.forEach((item) => {
      const li = document.createElement("li");
      li.className = "result-item";
      li.dataset.severity = item.severity; 

      const textSpan = document.createElement("span");
      textSpan.className = "result-text";
      textSpan.textContent = item.text;

      const confidenceSpan = document.createElement("span");
      confidenceSpan.className = "result-confidence";
      confidenceSpan.textContent = `${item.confidence}% AI`;

      li.appendChild(textSpan);
      li.appendChild(confidenceSpan);
      resultsList.appendChild(li);
    });
    resultsBreakdown.classList.remove("hidden");
  } else {
    resultsBreakdown.classList.add("hidden");
  }
};

scanAgainButton.addEventListener("click", async () => {
  updateUI({ status: "Processing" });
  try {
    await chrome.runtime.sendMessage({ type: "SCAN_AGAIN", source: "popup" });
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }
});

resetPageButton.addEventListener("click", async () => {
  updateUI({ status: "Resetting..." });
  try {
    await chrome.runtime.sendMessage({ type: "RESET_PAGE", source: "popup" });
  } catch (error) {
    console.error("Error sending RESET_PAGE message: ", error);
    updateUI({ status: "Error" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.source === "background" && message.data) {
    updateUI(message.data);
  }
});

const initializePopup = async () => {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_POPUP_STATE",
      source: "popup",
    });
    if (response && response.data) {
      updateUI(response.data);
    }
  } catch (error) {
    console.error("Could not get initial state from background.", error);
    updateUI({ status: "Error connecting to service" });
  }
};

initializePopup();