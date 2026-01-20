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
/*!*************************************!*\
  !*** ./src/ui/settings/settings.js ***!
  \*************************************/
__webpack_require__.r(__webpack_exports__);
document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("popup.html");
});

document.getElementById("threshold_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/threshold.html");
});

document.getElementById("colours_labels_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/colours_labels.html");
});

document.getElementById("result_style_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/result_style.html");
});

document.getElementById("content_types_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/content_types.html");
});

document.getElementById("page_overview_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/page_overview.html");
});

document.getElementById("speed_accuracy_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/speed_accuracy.html");
});

document.getElementById("site_control_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/site_control.html");
});


const master_switch = document.getElementById("master_switch_button");
const master_switch_button = master_switch.querySelector("button");
const reset_default = document.getElementById("reset_default_button");

reset_default.addEventListener("click", () => {
    chrome.storage.local.set({settings: default_settings});
})

master_switch.addEventListener("click", () => {
    chrome.storage.local.get("enabled", ({enabled = true}) => {
        const newEnabled = !enabled;
        chrome.storage.local.set({enabled: newEnabled}, () => {
            master_switch.classList.toggle("on_button_container", !newEnabled);
            master_switch.classList.toggle("off_button_container", newEnabled);
            master_switch_button.textContent = newEnabled ? "Turn off Aletheia!" : "Turn on Aletheia!";
        });
    });
});
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3MuanMiLCJtYXBwaW5ncyI6Ijs7VUFBQTtVQUNBOzs7OztXQ0RBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RCxFOzs7Ozs7Ozs7QUNOQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBO0FBQ0EsQ0FBQzs7O0FBR0Q7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOEJBQThCLDJCQUEyQjtBQUN6RCxDQUFDOztBQUVEO0FBQ0EsMENBQTBDLGVBQWU7QUFDekQ7QUFDQSxrQ0FBa0Msb0JBQW9CO0FBQ3REO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxLQUFLO0FBQ0wsQ0FBQyxFIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vYWxldGhlaWEvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vYWxldGhlaWEvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9hbGV0aGVpYS8uL3NyYy91aS9zZXR0aW5ncy9zZXR0aW5ncy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBUaGUgcmVxdWlyZSBzY29wZVxudmFyIF9fd2VicGFja19yZXF1aXJlX18gPSB7fTtcblxuIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXR1cm5fYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJwb3B1cC5odG1sXCIpO1xufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidGhyZXNob2xkX2J1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwidWkvc2V0dGluZ3MvdGhyZXNob2xkLmh0bWxcIik7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb2xvdXJzX2xhYmVsc19idXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGNocm9tZS5ydW50aW1lLmdldFVSTChcInVpL3NldHRpbmdzL2NvbG91cnNfbGFiZWxzLmh0bWxcIik7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJyZXN1bHRfc3R5bGVfYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJ1aS9zZXR0aW5ncy9yZXN1bHRfc3R5bGUuaHRtbFwiKTtcbn0pO1xuXG5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvbnRlbnRfdHlwZXNfYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJ1aS9zZXR0aW5ncy9jb250ZW50X3R5cGVzLmh0bWxcIik7XG59KTtcblxuZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwYWdlX292ZXJ2aWV3X2J1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwidWkvc2V0dGluZ3MvcGFnZV9vdmVydmlldy5odG1sXCIpO1xufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic3BlZWRfYWNjdXJhY3lfYnV0dG9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBjaHJvbWUucnVudGltZS5nZXRVUkwoXCJ1aS9zZXR0aW5ncy9zcGVlZF9hY2N1cmFjeS5odG1sXCIpO1xufSk7XG5cbmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2l0ZV9jb250cm9sX2J1dHRvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gY2hyb21lLnJ1bnRpbWUuZ2V0VVJMKFwidWkvc2V0dGluZ3Mvc2l0ZV9jb250cm9sLmh0bWxcIik7XG59KTtcblxuXG5jb25zdCBtYXN0ZXJfc3dpdGNoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtYXN0ZXJfc3dpdGNoX2J1dHRvblwiKTtcbmNvbnN0IG1hc3Rlcl9zd2l0Y2hfYnV0dG9uID0gbWFzdGVyX3N3aXRjaC5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uXCIpO1xuY29uc3QgcmVzZXRfZGVmYXVsdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicmVzZXRfZGVmYXVsdF9idXR0b25cIik7XG5cbnJlc2V0X2RlZmF1bHQuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoe3NldHRpbmdzOiBkZWZhdWx0X3NldHRpbmdzfSk7XG59KVxuXG5tYXN0ZXJfc3dpdGNoLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFwiZW5hYmxlZFwiLCAoe2VuYWJsZWQgPSB0cnVlfSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdFbmFibGVkID0gIWVuYWJsZWQ7XG4gICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7ZW5hYmxlZDogbmV3RW5hYmxlZH0sICgpID0+IHtcbiAgICAgICAgICAgIG1hc3Rlcl9zd2l0Y2guY2xhc3NMaXN0LnRvZ2dsZShcIm9uX2J1dHRvbl9jb250YWluZXJcIiwgIW5ld0VuYWJsZWQpO1xuICAgICAgICAgICAgbWFzdGVyX3N3aXRjaC5jbGFzc0xpc3QudG9nZ2xlKFwib2ZmX2J1dHRvbl9jb250YWluZXJcIiwgbmV3RW5hYmxlZCk7XG4gICAgICAgICAgICBtYXN0ZXJfc3dpdGNoX2J1dHRvbi50ZXh0Q29udGVudCA9IG5ld0VuYWJsZWQgPyBcIlR1cm4gb2ZmIEFsZXRoZWlhIVwiIDogXCJUdXJuIG9uIEFsZXRoZWlhIVwiO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn0pOyJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==