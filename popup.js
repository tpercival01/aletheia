const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

function updateUI(data) {
  statusMessage.innerHTML = `Status: ${data.status || "Idle"}`;
};

scanAgainButton.addEventListener("click", async () => {
  checkPopupState();
  scanAgainButton.classList.add("hidden");
  resetPageButton.classList.add("hidden");
  try {
    await chrome.runtime.sendMessage({ type: "SCAN_AGAIN", source: "popup" });
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }
});

resetPageButton.addEventListener("click", async () => {
  checkPopupState();
  scanAgainButton.classList.add("hidden");
  resetPageButton.classList.add("hidden");
  try {
    await chrome.runtime.sendMessage({ type: "RESET_PAGE", source: "popup" });
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
            scanAgainButton.classList.remove("hidden");
            resetPageButton.classList.remove("hidden");
            break;
            
          case "Processing":
            updateUI(response);
            break;
          
          case "Idle":
            updateUI(response);
            break;
        }
      }
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  checkPopupState();
});