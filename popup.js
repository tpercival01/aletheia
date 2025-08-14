const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

function updateUI(data) {
  statusMessage.innerHTML = `Status: ${data.status || "Idle"}`;
};

scanAgainButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";

  try {
    const response = await chrome.runtime.sendMessage({ type: "SCAN_AGAIN", source: "popup" });
    updateUI(response);
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }
});

resetPageButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";

  try {
    const response = await chrome.runtime.sendMessage({ type: "RESET_PAGE_POPUP", source: "popup" });
    updateUI(response);
  } catch (error) {
    console.error("Error sending RESET_PAGE message: ", error);
    updateUI({ status: "Error" });
  }
});

function checkPopupState() {
  chrome.runtime.sendMessage({
      type: "GET_POPUP_STATE",
      source: "popup",
  },
    (response) => {
      if (chrome.runtime.lastError){
        console.error("Could not get initial state from background",chrome.runtime.lastError);
        updateUI({status: "Error connecting to background"});
        return;
      }
      console.log(response);

      if (response) {
        switch(response.status){

          case "Completed":
            updateUI(response);
            scanAgainButton.className = "";
            resetPageButton.className = "";
            break;
            
          case "Processing":
            updateUI(response);
            break;
          
          case "Idle":
            updateUI(response);
            scanAgainButton.className = "";
            resetPageButton.className = "";
            break;
        }
      }
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  checkPopupState();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message){
    if (message.status == "Completed"){
      checkPopupState();
    }
    else if (message.status == "Idle"){
      checkPopupState();
    }
  }
});