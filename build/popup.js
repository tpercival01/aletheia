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
  window.location.href = chrome.runtime.getURL("ui/settings/settings.html");
};

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAuanMiLCJtYXBwaW5ncyI6Ijs7VUFBQTtVQUNBOzs7OztXQ0RBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7Ozs7Ozs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVUsUUFBUTtBQUNsQjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNILENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQSx1Q0FBdUMsWUFBWTtBQUNuRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBLGVBQWUsaUJBQWlCO0FBQ2hDO0FBQ0EsQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJO0FBQ0o7QUFDQSxlQUFlLGlCQUFpQjtBQUNoQztBQUNBLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsK0JBQStCLG1DQUFtQztBQUNsRTtBQUNBLCtCQUErQixvQ0FBb0M7QUFDbkU7QUFDQSxpQ0FBaUMsbUNBQW1DO0FBQ3BFO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hbGV0aGVpYS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9hbGV0aGVpYS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL2FsZXRoZWlhLy4vc3JjL3VpL3BvcHVwL3BvcHVwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJjb25zdCBzdGF0dXNNZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGF0dXNfbWVzc2FnZVwiKTtcclxuXHJcbmNvbnN0IHNjYW5BZ2FpbkJ1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2Nhbl9hZ2FpblwiKTtcclxuY29uc3QgcmVzZXRQYWdlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNldF9idXR0b25cIik7XHJcblxyXG5jb25zdCByZXN1bHRzQnJlYWtkb3duID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXN1bHRzX2JyZWFrZG93blwiKTtcclxuY29uc3QgcmVzdWx0c0xpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3VsdHNfbGlzdFwiKTtcclxuXHJcbmNvbnN0IGRyb3Bkb3duID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5kcm9wZG93blwiKTtcclxuY29uc3QgdG9nZ2xlID0gZHJvcGRvd24ucXVlcnlTZWxlY3RvcihcIi5kcm9wZG93bl90b2dnbGVcIik7XHJcbmNvbnN0IG1lbnUgPSBkcm9wZG93bi5xdWVyeVNlbGVjdG9yKFwiLmRyb3Bkb3duX21lbnVcIik7XHJcblxyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgYXN5bmMgKCkgPT4ge1xyXG4gIGNvbnN0IHsgc3RhdGUgfSA9IGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcInN0YXRlXCIpO1xyXG4gIGNoZWNrUG9wdXBTdGF0ZShzdGF0ZSk7XHJcblxyXG4gIC8vIEhhbmRsZSBleHBvcnQgbWVudVxyXG4gIHRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IHtcclxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICBjb25zdCBpc09wZW4gPSBkcm9wZG93bi5jbGFzc0xpc3QudG9nZ2xlKFwib3BlblwiKTtcclxuICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWV4cGFuZGVkXCIsIGlzT3Blbik7XHJcbiAgfSk7XHJcblxyXG4gIG1lbnUuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIChlKSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpKTtcclxuXHJcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgIGlmIChkcm9wZG93bi5jbGFzc0xpc3QuY29udGFpbnMoXCJvcGVuXCIpKSB7XHJcbiAgICAgIGRyb3Bkb3duLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpO1xyXG4gICAgICB0b2dnbGUuc2V0QXR0cmlidXRlKFwiYXJpYS1leHBhbmRlZFwiLCBcImZhbHNlXCIpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICAvLyBIYW5kbGUgZG93bmxvYWQgcmVwb3J0XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkb3dubG9hZF9yZXBvcnRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgIGRvd25sb2FkX3JlcG9ydCgpO1xyXG4gIH0pO1xyXG5cclxuICAvLyBIYW5kbGUgc2VuZCByZXBvcnQgdG8gd2Vic2l0ZVxyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2VuZF9yZXBvcnRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgIHNlbmRfcmVwb3J0X3dlYnNpdGUoKTtcclxuICB9KTtcclxufSk7XHJcblxyXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIGFyZWEpID0+IHtcclxuICBpZiAoYXJlYSA9PT0gXCJsb2NhbFwiKSB7XHJcbiAgICBjaGVja1BvcHVwU3RhdGUoY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZSk7XHJcbiAgICBpZiAoY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5zdGF0dXMgPT0gXCJDb21wbGV0ZWRcIikge1xyXG4gICAgICByZXN1bHRzTGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG4gICAgICB1cGRhdGVfcmVzdWx0cyhjaGFuZ2VzKTtcclxuICAgICAgZHJvcGRvd24uY2xhc3NMaXN0LnJlbW92ZShcImhpZGRlblwiKTtcclxuICAgICAgcmVzdWx0c0JyZWFrZG93bi5jbGFzc0xpc3QucmVtb3ZlKFwiaGlkZGVuXCIpO1xyXG4gICAgfVxyXG4gIH1cclxufSk7XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVVSShkYXRhKSB7XHJcbiAgc3RhdHVzTWVzc2FnZS5pbm5lckhUTUwgPSBgU3RhdHVzOiAke2RhdGEuc3RhdHVzfWA7XHJcbn1cclxuXHJcbnNjYW5BZ2FpbkJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xyXG4gIHNjYW5BZ2FpbkJ1dHRvbi5jbGFzc05hbWUgPSBcImhpZGRlblwiO1xyXG4gIHJlc2V0UGFnZUJ1dHRvbi5jbGFzc05hbWUgPSBcImhpZGRlblwiO1xyXG4gIHJlc3VsdHNCcmVha2Rvd24uY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuICBkcm9wZG93bi5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XHJcbiAgICAgIHR5cGU6IFwiU0NBTl9BR0FJTlwiLFxyXG4gICAgICBzb3VyY2U6IFwicG9wdXBcIixcclxuICAgIH0pO1xyXG4gICAgY29uc29sZS5sb2coXCJTQ0FOTkVEIEFHQUlOXCIpO1xyXG4gICAgdXBkYXRlVUkocmVzcG9uc2UpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiRXJyb3Igc2VuZGluZyBTQ0FOX0FHQUlOIG1lc3NhZ2U6IFwiLCBlcnJvcik7XHJcbiAgICB1cGRhdGVVSSh7IHN0YXR1czogXCJFcnJvclwiIH0pO1xyXG4gIH1cclxufSk7XHJcblxyXG5yZXNldFBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcclxuICBzY2FuQWdhaW5CdXR0b24uY2xhc3NOYW1lID0gXCJoaWRkZW5cIjtcclxuICByZXNldFBhZ2VCdXR0b24uY2xhc3NOYW1lID0gXCJoaWRkZW5cIjtcclxuICByZXN1bHRzQnJlYWtkb3duLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XHJcbiAgZHJvcGRvd24uY2xhc3NMaXN0LmFkZChcImhpZGRlblwiKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2Uoe1xyXG4gICAgICB0eXBlOiBcIlJFU0VUX1BBR0VfUE9QVVBcIixcclxuICAgICAgc291cmNlOiBcInBvcHVwXCIsXHJcbiAgICB9KTtcclxuICAgIHVwZGF0ZVVJKHJlc3BvbnNlKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHNlbmRpbmcgUkVTRVRfUEFHRSBtZXNzYWdlOiBcIiwgZXJyb3IpO1xyXG4gICAgdXBkYXRlVUkoeyBzdGF0dXM6IFwiRXJyb3JcIiB9KTtcclxuICB9XHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gY2hlY2tQb3B1cFN0YXRlKHN0YXRlT2JqKSB7XHJcbiAgdXBkYXRlVUkoc3RhdGVPYmopO1xyXG4gIHNjYW5BZ2FpbkJ1dHRvbi5jbGFzc05hbWUgPSBcIlwiO1xyXG4gIHJlc2V0UGFnZUJ1dHRvbi5jbGFzc05hbWUgPSBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVfcmVzdWx0cyhjaGFuZ2VzKSB7XHJcbiAgaWYgKFxyXG4gICAgY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5haVBvc0NvdW50IHx8XHJcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmFpU29tZUNvdW50IHx8XHJcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmh1bWFuQ291bnRcclxuICApIHtcclxuICAgIGNvbnN0IGxpc3RJdGVtT25lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xyXG4gICAgbGlzdEl0ZW1PbmUuaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5haVBvc0NvdW50fSBlbGVtZW50cyBhcmUgbGlrZWx5IHRvIGJlIEFJYDtcclxuICAgIGNvbnN0IGxpc3RJdGVtVHdvID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xyXG4gICAgbGlzdEl0ZW1Ud28uaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5haVNvbWVDb3VudH0gZWxlbWVudHMgYXJlIHBvdGVudGlhbGx5IEFJYDtcclxuICAgIGNvbnN0IGxpc3RJdGVtVGhyZWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XHJcbiAgICBsaXN0SXRlbVRocmVlLmlubmVySFRNTCA9IGAke2NoYW5nZXMuc3RhdGUubmV3VmFsdWUuaHVtYW5Db3VudH0gZWxlbWVudHMgYXJlIHVubGlrZWx5IHRvIGJlIEFJYDtcclxuICAgIHJlc3VsdHNMaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtT25lKTtcclxuICAgIHJlc3VsdHNMaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtVHdvKTtcclxuICAgIHJlc3VsdHNMaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtVGhyZWUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzZW5kX3JlcG9ydF93ZWJzaXRlKCkge1xyXG4gIGNvbnNvbGUubG9nKFwiU2VuZGluZyByZXBvcnQgdG8gd2Vic2l0ZS5cIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRvd25sb2FkX3JlcG9ydCgpIHtcclxuICAvLyBOZWVkIHRvIGRlY2lkZSB3aGF0IHRoZSByZXBvcnQgd2lsbCBsb29rIGxpa2UsIGNvbnRhaW4sIGV0Yy5cclxuICAvLyBQcm9iYWJseSBqdXN0IGEgYmlnZ2VyIHN1bW1hcnksIG1heWJlIHNvbWUgZXhhbXBsZXMuXHJcblxyXG4gIGNvbnNvbGUubG9nKFwiRG93bmxvYWRpbmcgZnVsbCByZXBvcnQuXCIpO1xyXG59XHJcblxyXG4vLyBPcGVuIHNldHRpbmdzIHBhZ2VcclxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZXR0aW5nc19idXR0b25cIikub25jbGljayA9IChlKSA9PiB7XHJcbiAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJ1aS9zZXR0aW5ncy9zZXR0aW5ncy5odG1sXCIpO1xyXG59O1xyXG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=