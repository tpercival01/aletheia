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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9wdXAuanMiLCJtYXBwaW5ncyI6Ijs7VUFBQTtVQUNBOzs7OztXQ0RBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7Ozs7Ozs7QUNOQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0EsVUFBVSxRQUFRO0FBQ2xCOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNILENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0EsdUNBQXVDLFlBQVk7QUFDbkQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0EsZUFBZSxpQkFBaUI7QUFDaEM7QUFDQSxDQUFDOztBQUVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJO0FBQ0o7QUFDQSxlQUFlLGlCQUFpQjtBQUNoQztBQUNBLENBQUM7O0FBRUQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLCtCQUErQixtQ0FBbUM7QUFDbEU7QUFDQSwrQkFBK0Isb0NBQW9DO0FBQ25FO0FBQ0EsaUNBQWlDLG1DQUFtQztBQUNwRTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9hbGV0aGVpYS93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9hbGV0aGVpYS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL2FsZXRoZWlhLy4vc3JjL3VpL3BvcHVwL3BvcHVwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIFRoZSByZXF1aXJlIHNjb3BlXG52YXIgX193ZWJwYWNrX3JlcXVpcmVfXyA9IHt9O1xuXG4iLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJjb25zdCBzdGF0dXNNZXNzYWdlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzdGF0dXNfbWVzc2FnZVwiKTtcblxuY29uc3Qgc2NhbkFnYWluQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzY2FuX2FnYWluXCIpO1xuY29uc3QgcmVzZXRQYWdlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXNldF9idXR0b25cIik7XG5cbmNvbnN0IHJlc3VsdHNCcmVha2Rvd24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3VsdHNfYnJlYWtkb3duXCIpO1xuY29uc3QgcmVzdWx0c0xpc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJlc3VsdHNfbGlzdFwiKTtcblxuY29uc3QgZHJvcGRvd24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmRyb3Bkb3duXCIpO1xuY29uc3QgdG9nZ2xlID0gZHJvcGRvd24ucXVlcnlTZWxlY3RvcihcIi5kcm9wZG93bl90b2dnbGVcIik7XG5jb25zdCBtZW51ID0gZHJvcGRvd24ucXVlcnlTZWxlY3RvcihcIi5kcm9wZG93bl9tZW51XCIpO1xuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCB7IHN0YXRlIH0gPSBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXCJzdGF0ZVwiKTtcbiAgY2hlY2tQb3B1cFN0YXRlKHN0YXRlKTtcblxuICAvLyBIYW5kbGUgZXhwb3J0IG1lbnVcbiAgdG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoZSkgPT4ge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgY29uc3QgaXNPcGVuID0gZHJvcGRvd24uY2xhc3NMaXN0LnRvZ2dsZShcIm9wZW5cIik7XG4gICAgdG9nZ2xlLnNldEF0dHJpYnV0ZShcImFyaWEtZXhwYW5kZWRcIiwgaXNPcGVuKTtcbiAgfSk7XG5cbiAgbWVudS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGUpID0+IGUuc3RvcFByb3BhZ2F0aW9uKCkpO1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgaWYgKGRyb3Bkb3duLmNsYXNzTGlzdC5jb250YWlucyhcIm9wZW5cIikpIHtcbiAgICAgIGRyb3Bkb3duLmNsYXNzTGlzdC5yZW1vdmUoXCJvcGVuXCIpO1xuICAgICAgdG9nZ2xlLnNldEF0dHJpYnV0ZShcImFyaWEtZXhwYW5kZWRcIiwgXCJmYWxzZVwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEhhbmRsZSBkb3dubG9hZCByZXBvcnRcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkb3dubG9hZF9yZXBvcnRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICBkb3dubG9hZF9yZXBvcnQoKTtcbiAgfSk7XG5cbiAgLy8gSGFuZGxlIHNlbmQgcmVwb3J0IHRvIHdlYnNpdGVcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzZW5kX3JlcG9ydFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIHNlbmRfcmVwb3J0X3dlYnNpdGUoKTtcbiAgfSk7XG59KTtcblxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBhcmVhKSA9PiB7XG4gIGlmIChhcmVhID09PSBcImxvY2FsXCIpIHtcbiAgICBjaGVja1BvcHVwU3RhdGUoY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZSk7XG4gICAgaWYgKGNoYW5nZXMuc3RhdGUubmV3VmFsdWUuc3RhdHVzID09IFwiQ29tcGxldGVkXCIpIHtcbiAgICAgIHJlc3VsdHNMaXN0LmlubmVySFRNTCA9IFwiXCI7XG4gICAgICB1cGRhdGVfcmVzdWx0cyhjaGFuZ2VzKTtcbiAgICAgIGRyb3Bkb3duLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRkZW5cIik7XG4gICAgICByZXN1bHRzQnJlYWtkb3duLmNsYXNzTGlzdC5yZW1vdmUoXCJoaWRkZW5cIik7XG4gICAgfVxuICB9XG59KTtcblxuZnVuY3Rpb24gdXBkYXRlVUkoZGF0YSkge1xuICBzdGF0dXNNZXNzYWdlLmlubmVySFRNTCA9IGBTdGF0dXM6ICR7ZGF0YS5zdGF0dXN9YDtcbn1cblxuc2NhbkFnYWluQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoKSA9PiB7XG4gIHNjYW5BZ2FpbkJ1dHRvbi5jbGFzc05hbWUgPSBcImhpZGRlblwiO1xuICByZXNldFBhZ2VCdXR0b24uY2xhc3NOYW1lID0gXCJoaWRkZW5cIjtcbiAgcmVzdWx0c0JyZWFrZG93bi5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xuICBkcm9wZG93bi5jbGFzc0xpc3QuYWRkKFwiaGlkZGVuXCIpO1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7XG4gICAgICB0eXBlOiBcIlNDQU5fQUdBSU5cIixcbiAgICAgIHNvdXJjZTogXCJwb3B1cFwiLFxuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKFwiU0NBTk5FRCBBR0FJTlwiKTtcbiAgICB1cGRhdGVVSShyZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkVycm9yIHNlbmRpbmcgU0NBTl9BR0FJTiBtZXNzYWdlOiBcIiwgZXJyb3IpO1xuICAgIHVwZGF0ZVVJKHsgc3RhdHVzOiBcIkVycm9yXCIgfSk7XG4gIH1cbn0pO1xuXG5yZXNldFBhZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jICgpID0+IHtcbiAgc2NhbkFnYWluQnV0dG9uLmNsYXNzTmFtZSA9IFwiaGlkZGVuXCI7XG4gIHJlc2V0UGFnZUJ1dHRvbi5jbGFzc05hbWUgPSBcImhpZGRlblwiO1xuICByZXN1bHRzQnJlYWtkb3duLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XG4gIGRyb3Bkb3duLmNsYXNzTGlzdC5hZGQoXCJoaWRkZW5cIik7XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHtcbiAgICAgIHR5cGU6IFwiUkVTRVRfUEFHRV9QT1BVUFwiLFxuICAgICAgc291cmNlOiBcInBvcHVwXCIsXG4gICAgfSk7XG4gICAgdXBkYXRlVUkocmVzcG9uc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBzZW5kaW5nIFJFU0VUX1BBR0UgbWVzc2FnZTogXCIsIGVycm9yKTtcbiAgICB1cGRhdGVVSSh7IHN0YXR1czogXCJFcnJvclwiIH0pO1xuICB9XG59KTtcblxuZnVuY3Rpb24gY2hlY2tQb3B1cFN0YXRlKHN0YXRlT2JqKSB7XG4gIHVwZGF0ZVVJKHN0YXRlT2JqKTtcbiAgc2NhbkFnYWluQnV0dG9uLmNsYXNzTmFtZSA9IFwiXCI7XG4gIHJlc2V0UGFnZUJ1dHRvbi5jbGFzc05hbWUgPSBcIlwiO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVfcmVzdWx0cyhjaGFuZ2VzKSB7XG4gIGlmIChcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmFpUG9zQ291bnQgfHxcbiAgICBjaGFuZ2VzLnN0YXRlLm5ld1ZhbHVlLmFpU29tZUNvdW50IHx8XG4gICAgY2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5odW1hbkNvdW50XG4gICkge1xuICAgIGNvbnN0IGxpc3RJdGVtT25lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgIGxpc3RJdGVtT25lLmlubmVySFRNTCA9IGAke2NoYW5nZXMuc3RhdGUubmV3VmFsdWUuYWlQb3NDb3VudH0gZWxlbWVudHMgYXJlIGxpa2VseSB0byBiZSBBSWA7XG4gICAgY29uc3QgbGlzdEl0ZW1Ud28gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG4gICAgbGlzdEl0ZW1Ud28uaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5haVNvbWVDb3VudH0gZWxlbWVudHMgYXJlIHBvdGVudGlhbGx5IEFJYDtcbiAgICBjb25zdCBsaXN0SXRlbVRocmVlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImxpXCIpO1xuICAgIGxpc3RJdGVtVGhyZWUuaW5uZXJIVE1MID0gYCR7Y2hhbmdlcy5zdGF0ZS5uZXdWYWx1ZS5odW1hbkNvdW50fSBlbGVtZW50cyBhcmUgdW5saWtlbHkgdG8gYmUgQUlgO1xuICAgIHJlc3VsdHNMaXN0LmFwcGVuZENoaWxkKGxpc3RJdGVtT25lKTtcbiAgICByZXN1bHRzTGlzdC5hcHBlbmRDaGlsZChsaXN0SXRlbVR3byk7XG4gICAgcmVzdWx0c0xpc3QuYXBwZW5kQ2hpbGQobGlzdEl0ZW1UaHJlZSk7XG4gIH0gZWxzZSB7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2VuZF9yZXBvcnRfd2Vic2l0ZSgpIHtcbiAgY29uc29sZS5sb2coXCJTZW5kaW5nIHJlcG9ydCB0byB3ZWJzaXRlLlwiKTtcbn1cblxuZnVuY3Rpb24gZG93bmxvYWRfcmVwb3J0KCkge1xuICAvLyBOZWVkIHRvIGRlY2lkZSB3aGF0IHRoZSByZXBvcnQgd2lsbCBsb29rIGxpa2UsIGNvbnRhaW4sIGV0Yy5cbiAgLy8gUHJvYmFibHkganVzdCBhIGJpZ2dlciBzdW1tYXJ5LCBtYXliZSBzb21lIGV4YW1wbGVzLlxuXG4gIGNvbnNvbGUubG9nKFwiRG93bmxvYWRpbmcgZnVsbCByZXBvcnQuXCIpO1xufVxuXG4vLyBPcGVuIHNldHRpbmdzIHBhZ2VcbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2V0dGluZ3NfYnV0dG9uXCIpLm9uY2xpY2sgPSAoZSkgPT4ge1xuICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGNocm9tZS5ydW50aW1lLmdldFVSTChcInVpL3NldHRpbmdzL3NldHRpbmdzLmh0bWxcIik7XG59O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9