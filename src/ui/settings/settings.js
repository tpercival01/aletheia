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