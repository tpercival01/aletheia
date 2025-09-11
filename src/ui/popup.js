const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

function updateUI(data) {
  statusMessage.innerHTML = `Status: ${data.status}`;
}

scanAgainButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SCAN_AGAIN",
      source: "popup",
    });
    console.log("SCANNED AGAIN")
    updateUI(response);
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }

  checkPopupState();
});

resetPageButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "RESET_PAGE_POPUP",
      source: "popup",
    });
    updateUI(response);
  } catch (error) {
    console.error("Error sending RESET_PAGE message: ", error);
    updateUI({ status: "Error" });
  }

  checkPopupState();
});

function checkPopupState(stateObj) {
  updateUI(stateObj);
  scanAgainButton.className = "";
  resetPageButton.className = "";
}

window.addEventListener("DOMContentLoaded", async () => {
  const {state} = await chrome.storage.local.get("state");
  checkPopupState(state);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
   checkPopupState(changes.state.newValue);
  }
});