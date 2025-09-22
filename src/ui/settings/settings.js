document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/popup/popup.html");
});

document.getElementById("threshold_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/threshold.html");
});

