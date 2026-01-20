/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/*!*******************************!*\
  !*** ./src/ui/popup/popup.js ***!
  \*******************************/
__webpack_require__.r(__webpack_exports__);
const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

const dropdown = document.querySelector(".dropdown");
const toggle = dropdown.querySelector(".dropdown_toggle");
const menu = dropdown.querySelector(".dropdown_menu");

window.addEventListener("DOMContentLoaded", async () => {
  const { state } = await chrome.storage.local.get("state");
  checkPopupState(state);

  // Handle export menu
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    toggle.setAttribute("aria-expanded", isOpen);
  });

  menu.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    if (dropdown.classList.contains("open")) {
      dropdown.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
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
    if (changes.state.newValue.status == "Completed") {
      resultsList.innerHTML = "";
      update_results(changes);
      dropdown.classList.remove("hidden");
      resultsBreakdown.classList.remove("hidden");
    }
  }
});

function updateUI(data) {
  statusMessage.innerHTML = `Status: ${data.status}`;
}

scanAgainButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";
  resultsBreakdown.classList.add("hidden");
  dropdown.classList.add("hidden");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SCAN_AGAIN",
      source: "popup",
    });
    console.log("SCANNED AGAIN");
    updateUI(response);
  } catch (error) {
    console.error("Error sending SCAN_AGAIN message: ", error);
    updateUI({ status: "Error" });
  }
});

resetPageButton.addEventListener("click", async () => {
  scanAgainButton.className = "hidden";
  resetPageButton.className = "hidden";
  resultsBreakdown.classList.add("hidden");
  dropdown.classList.add("hidden");

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
});

function checkPopupState(stateObj) {
  updateUI(stateObj);
  scanAgainButton.className = "";
  resetPageButton.className = "";
}

function update_results(changes) {
  console.log(changes);
  if (
    changes.state.newValue.aiPosCount ||
    changes.state.newValue.aiSomeCount ||
    changes.state.newValue.humanCount
  ) {
    const listItemOne = document.createElement("li");
    listItemOne.innerHTML = `${changes.state.newValue.aiPosCount} elements are likely to be AI`;
    const listItemTwo = document.createElement("li");
    listItemTwo.innerHTML = `${changes.state.newValue.aiSomeCount} elements are potentially AI`;
    const listItemThree = document.createElement("li");
    listItemThree.innerHTML = `${changes.state.newValue.humanCount} elements are unlikely to be AI`;
    resultsList.appendChild(listItemOne);
    resultsList.appendChild(listItemTwo);
    resultsList.appendChild(listItemThree);
  } else {
  }
}

function send_report_website() {
  console.log("Sending report to website.");
}

function download_report() {
  // Need to decide what the report will look like, contain, etc.
  // Probably just a bigger summary, maybe some examples.

  console.log("Downloading full report.");
}

// Open settings page
document.getElementById("settings_button").onclick = (e) => {
  window.location.href = chrome.runtime.getURL("settings.html");
};

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAuanMiLCJtYXBwaW5ncyI6Ijs7VUFBQTtVQUNBOzs7OztXQ0RBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7Ozs7Ozs7QUNOQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0EsVUFBVSxRQUFRO0FBQ2xCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNILENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0EsdUNBQXVDLFlBQVk7QUFDbkQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0EsZUFBZSxpQkFBaUI7QUFDaEM7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJO0FBQ0o7QUFDQSxlQUFlLGlCQUFpQjtBQUNoQztBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLG1DQUFtQztBQUNsRTtBQUNBLCtCQUErQixvQ0FBb0M7QUFDbkU7QUFDQSxpQ0FBaUMsbUNBQW1DO0FBQ3BFO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2FsZXRoZWlhL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL2FsZXRoZWlhL3dlYnBhY2svcnVudGltZS9tYWtlIG5hbWVzcGFjZSBvYmplY3QiLCJ3ZWJwYWNrOi8vYWxldGhlaWEvLi9zcmMvdWkvcG9wdXAvcG9wdXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gVGhlIHJlcXVpcmUgc2NvcGVcbnZhciBfX3dlYnBhY2tfcmVxdWlyZV9fID0ge307XG5cbiIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImNvbnN0IHN0YXR1c01lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInN0YXR1c19tZXNzYWdlXCIpO1xuXG5jb25zdCBzY2FuQWdhaW5CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNjYW5fYWdhaW5cIik7XG5jb25zdCByZXNldFBhZ2VCdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc2V0X2J1dHRvblwiKTtcblxuY29uc3QgcmVzdWx0c0JyZWFrZG93biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzdWx0c19icmVha2Rvd25cIik7XG5jb25zdCByZXN1bHRzTGlzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzdWx0c19saXN0XCIpO1xuXG5jb25zdCBkcm9wZG93biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZHJvcGRvd25cIik7XG5jb25zdCB0b2dnbGUgPSBkcm9wZG93bi5xdWVyeVNlbGVjdG9yKFwiLmRyb3Bkb3duX3RvZ2dsZVwiKTtcbmNvbnN0IG1lbnUgPSBkcm9wZG93bi5xdWVyeVNlbGVjdG9yKFwiLmRyb3Bkb3duX21lbnVcIik7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiRE9NQ29udGVudExvYWRlZFwiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IHsgc3RhdGUgfSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInN0YXRlXCIpO1xuICBjaGVja1BvcHVwU3RhdGUoc3RhdGUpO1xuXG4gIC8vIEhhbmRsZSBleHBvcnQgbWVudVxuICB0b2dnbGUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBjb25zdCBpc09wZW4gPSBkcm9wZG93bi5jbGFzc0xpc3QudG9nZ2xlKFwib3BlblwiKTtcbiAgICB0b2dnbGUuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBpc09wZW4pO1xuICB9KTtcblxuICBtZW51LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKSk7XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICBpZiAoZHJvcGRvd24uY2xhc3NMaXN0LmNvbnRhaW5zKFwib3BlblwiKSkge1xuICAgICAgZHJvcGRvd24uY2xhc3NMaXN0LnJlbW92ZShcIm9wZW5cIik7XG4gICAgICB0b2dnbGUuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gSGFuZGxlIGRvd25sb2FkIHJlcG9ydFxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRvd25sb2FkX3JlcG9ydFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIGRvd25sb2FkX3JlcG9ydCgpO1xuICB9KTtcblxuICAvLyBIYW5kbGUgc2VuZCByZXBvcnQgdG8gd2Vic2l0ZVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNlbmRfcmVwb3J0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgc2VuZF9yZXBvcnRfd2Vic2l0ZSgpO1xuICB9KTtcbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIGFyZWEpID0+IHtcbiAgaWYgKGFyZWEgPT09IFwibG9jYWxcIikge1xuICAgIGNoZWNrUG9wdXBTdGF0ZShjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlKTtcbiAgICBpZiAoY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5zdGF0dXMgPT0gXCJDb21wbGV0ZWRcIikge1xuICAgICAgcmVzdWx0c0xpc3QuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgIHVwZGF0ZV9yZXN1bHRzKGNoYW5nZXMpO1xuICAgICAgZHJvcGRvd24uY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcbiAgICAgIHJlc3VsdHNCcmVha2Rvd24uY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiB1cGRhdGVVSShkYXRhKSB7XG4gIHN0YXR1c01lc3NhZ2UuaW5uZXJIVE1MID0gYFN0YXR1czogJHtkYXRhLnN0YXR1c31gO1xufVxuXG5zY2FuQWdhaW5CdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgc2NhbkFnYWluQnV0dG9uLmNsYXNzTmFtZSA9IFwiaGlkZGVuXCI7XG4gIHJlc2V0UGFnZUJ1dHRvbi5jbGFzc05hbWUgPSBcImhpZGRlblwiO1xuICByZXN1bHRzQnJlYWtkb3duLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XG4gIGRyb3Bkb3duLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgIHR5cGU6IFwiU0NBTl9BR0FJTlwiLFxuICAgICAgc291cmNlOiBcInBvcHVwXCIsXG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coXCJTQ0FOTkVEIEFHQUlOXCIpO1xuICAgIHVwZGF0ZVVJKHJlc3BvbnNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3Igc2VuZGluZyBTQ0FOX0FHQUlOIG1lc3NhZ2U6IFwiLCBlcnJvcik7XG4gICAgdXBkYXRlVUkoeyBzdGF0dXM6IFwiRXJyb3JcIiB9KTtcbiAgfVxufSk7XG5cbnJlc2V0UGFnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICBzY2FuQWdhaW5CdXR0b24uY2xhc3NOYW1lID0gXCJoaWRkZW5cIjtcbiAgcmVzZXRQYWdlQnV0dG9uLmNsYXNzTmFtZSA9IFwiaGlkZGVuXCI7XG4gIHJlc3VsdHNCcmVha2Rvd24uY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcbiAgZHJvcGRvd24uY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xuICAgICAgdHlwZTogXCJSRVNFVF9QQUdFX1BPUFVQXCIsXG4gICAgICBzb3VyY2U6IFwicG9wdXBcIixcbiAgICB9KTtcbiAgICB1cGRhdGVVSShyZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHNlbmRpbmcgUkVTRVRfUEFHRSBtZXNzYWdlOiBcIiwgZXJyb3IpO1xuICAgIHVwZGF0ZVVJKHsgc3RhdHVzOiBcIkVycm9yXCIgfSk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBjaGVja1BvcHVwU3RhdGUoc3RhdGVPYmopIHtcbiAgdXBkYXRlVUkoc3RhdGVPYmopO1xuICBzY2FuQWdhaW5CdXR0b24uY2xhc3NOYW1lID0gXCJcIjtcbiAgcmVzZXRQYWdlQnV0dG9uLmNsYXNzTmFtZSA9IFwiXCI7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZV9yZXN1bHRzKGNoYW5nZXMpIHtcbiAgY29uc29sZS5sb2coY2hhbmdlcyk7XG4gIGlmIChcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmFpUG9zQ291bnQgfHxcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmFpU29tZUNvdW50IHx8XG4gICAgY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5odW1hbkNvdW50XG4gICkge1xuICAgIGNvbnN0IGxpc3RJdGVtT25lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgIGxpc3RJdGVtT25lLmlubmVySFRNTCA9IGAke2NoYW5nZXMuc3RhdGUubmV3VmFsdWUuYWlQb3NDb3VudH0gZWxlbWVudHMgYXJlIGxpa2VseSB0byBiZSBBSWA7XG4gICAgY29uc3QgbGlzdEl0ZW1Ud28gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG4gICAgbGlzdEl0ZW1Ud28uaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5haVNvbWVDb3VudH0gZWxlbWVudHMgYXJlIHBvdGVudGlhbGx5IEFJYDtcbiAgICBjb25zdCBsaXN0SXRlbVRocmVlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgIGxpc3RJdGVtVGhyZWUuaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5odW1hbkNvdW50fSBlbGVtZW50cyBhcmUgdW5saWtlbHkgdG8gYmUgQUlgO1xuICAgIHJlc3VsdHNMaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtT25lKTtcbiAgICByZXN1bHRzTGlzdC5hcHBlbmRDaGlsZChsaXN0SXRlbVR3byk7XG4gICAgcmVzdWx0c0xpc3QuYXBwZW5kQ2hpbGQobGlzdEl0ZW1UaHJlZSk7XG4gIH0gZWxzZSB7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2VuZF9yZXBvcnRfd2Vic2l0ZSgpIHtcbiAgY29uc29sZS5sb2coXCJTZW5kaW5nIHJlcG9ydCB0byB3ZWJzaXRlLlwiKTtcbn1cblxuZnVuY3Rpb24gZG93bmxvYWRfcmVwb3J0KCkge1xuICAvLyBOZWVkIHRvIGRlY2lkZSB3aGF0IHRoZSByZXBvcnQgd2lsbCBsb29rIGxpa2UsIGNvbnRhaW4sIGV0Yy5cbiAgLy8gUHJvYmFibHkganVzdCBhIGJpZ2dlciBzdW1tYXJ5LCBtYXliZSBzb21lIGV4YW1wbGVzLlxuXG4gIGNvbnNvbGUubG9nKFwiRG93bmxvYWRpbmcgZnVsbCByZXBvcnQuXCIpO1xufVxuXG4vLyBPcGVuIHNldHRpbmdzIHBhZ2VcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2V0dGluZ3NfYnV0dG9uXCIpLm9uY2xpY2sgPSAoZSkgPT4ge1xuICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGNocm9tZS5ydW50aW1lLmdldFVSTChcInNldHRpbmdzLmh0bWxcIik7XG59O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9