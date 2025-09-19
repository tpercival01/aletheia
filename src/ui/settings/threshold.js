document.getElementById("return_button").addEventListener("click", () => {
    window.location.href = chrome.runtime.getURL("src/ui/settings/settings.html");
});

// Controls the threshold sliders

const slider1 = document.getElementById("threshold1");
const slider2 = document.getElementById("threshold2");

const value1 = document.getElementById("threshold1_value");
const value2 = document.getElementById("threshold2_value");

const green = document.querySelector("#threshold_preview .green");
const yellow = document.querySelector("#threshold_preview .yellow");
const red = document.querySelector("#threshold_preview .red");

function updatePreview() {
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

updatePreview();

slider1.addEventListener("input", updatePreview);
slider2.addEventListener("input", updatePreview)

