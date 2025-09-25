document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/settings.html");
});