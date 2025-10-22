document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("ui/settings/settings.html");
});

const presets = {
    low: [45, 90],
    medium: [30, 80],
    high: [20, 60]
}

const preset_low = document.getElementById("preset_low");
const preset_med = document.getElementById("preset_med");
const preset_high = document.getElementById("preset_high");

let preset_selected = null;

// Controls the threshold sliders

const slider1 = document.getElementById("threshold1");
const slider2 = document.getElementById("threshold2");

const value1 = document.getElementById("threshold1_value");
const value2 = document.getElementById("threshold2_value");

const green = document.querySelector("#threshold_preview .green");
const yellow = document.querySelector("#threshold_preview .yellow");
const red = document.querySelector("#threshold_preview .red");

function updatePreview() {
    if (preset_selected){
        let t1 = presets[preset_selected][0];
        let t2 = presets[preset_selected][1];

        slider1.value = t1;
        slider2.value = t2;

        if (t1 >= t2) {
            t1 = Math.min(t1, t2 - 0.01);
            slider1.value = t1.toFixed(2);
        }

        value1.textContent = t1.toFixed(2);
        value2.textContent = t2.toFixed(2);

        green.style.flexGrow = t1;
        yellow.style.flexGrow = t2 - t1;
        red.style.flexGrow = 1 - t2;
    }

    let t1 = parseFloat(slider1.value);
    let t2 = parseFloat(slider2.value);

    if (t1 >= t2) {
        t1 = Math.min(t1, t2 - 0.01);
        slider1.value = t1.toFixed(2);
    }

    value1.textContent = t1.toFixed(2);
    value2.textContent = t2.toFixed(2);

    green.style.flexGrow = t1;
    yellow.style.flexGrow = t2 - t1;
    red.style.flexGrow = 1 - t2;
}

function save_settings(){
    const save_value_1 = parseFloat(slider1.value);
    const save_value_2 = parseFloat(slider2.value);
    
    chrome.storage.local.get("settings", (result) => {
        let settings_object = result.settings || {};
        settings_object.thresholds = [save_value_1, save_value_2];
        chrome.storage.local.set({settings: settings_object});
    });

}

slider1.addEventListener("input", () => {
    preset_selected = null;
    save_settings();
    updatePreview();
});
slider2.addEventListener("input", () => {
    preset_selected = null;
    save_settings();
    updatePreview();
});

preset_low.addEventListener("click", () => {
    preset_selected = "low";
    updatePreview();
    save_settings();
});
preset_med.addEventListener("click", () => {
    preset_selected = "medium";
    updatePreview();
    save_settings();
});
preset_high.addEventListener("click", () => {
    preset_selected = "high";
    updatePreview();
    save_settings();
});