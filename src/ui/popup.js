const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");

window.addEventListener("DOMContentLoaded", async () => {
  const {state} = await chrome.storage.local.get("state");
  checkPopupState(state);

  // Handle export menu
  const dropdown = document.querySelector('.dropdown');
  const toggle = dropdown.querySelector('.dropdown_toggle');
  const menu = dropdown.querySelector('.dropdown_menu');

  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  menu.addEventListener('click', e => e.stopPropagation());

  document.addEventListener('click', () => {
    if (dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Handle download report
  document.getElementById("download_report").addEventListener("click", () => {
    download_report();
  });

  // Handle send report to website
  document.getElementById("send_report").addEventListener("click", () => {
    send_report_website();
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
   checkPopupState(changes.state.newValue);
  }
});

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

function send_report_website(){
  console.log("Sending report to website.")
}

function download_report(){

  // Need to decide what the report will look like, contain, etc.
  // Probably just a bigger summary, maybe some examples.

  console.log("Downloading full report.")
}