document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/popup/popup.html");
});

document.getElementById("threshold_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/threshold.html");
});

document.getElementById("colours_labels_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/colours_labels.html");
});

document.getElementById("result_style_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/result_style.html");
});

document.getElementById("content_types_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/content_types.html");
});

document.getElementById("page_overview_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/page_overview.html");
});

document.getElementById("speed_accuracy_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/speed_accuracy.html");
});

document.getElementById("site_control_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/site_control.html");
});

const default_settings = {
    thresholds: [0.35, 0.85],
    colours: {
        human: "green",
        uncertain: "yellow",
        ai: "red",
    },
    resultStyle: "badge",
    contentTypes: {
        text: true,
        images: false,
        video: false,
        audio: false
    },
    pageOverview: true,
    performance: "balanced",
    siteControl: {
        whitelist: [],
        blacklist: [],
    },
};

chrome.storage.local.get("settings", (result) => {
    if (!result.settings){
        chrome.storage.local.set({settings: default_settings}, () => {
            console.log(default_settings);
        });
    } else {
        console.log(result.settings);
    }
});

document.querySelector(".reset_default").addEventListener("click", () => {
    console.log("All settings reset to default");
    chrome.storage.local.set({settings: default_settings});
})

document.getElementById("off_button_container").addEventListener("click", () => {
    console.log("Off button clicked");
    chrome.storage.local.get("state", (result) => {
        // need to fix
        
        // result["state"]["MASTER_SWITCH"] = "OFF";
        // chrome.storage.local.set({state: result});
    });
});