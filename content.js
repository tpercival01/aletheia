// Await page to loaded fully before grabbing
const webpage_html = document.documentElement.innerHTML;

// Implement various data scraping techniques to get all large bodies of text, all images, all videos, and all audios.
// Implement mutations to check for dynamically loaded content.

chrome.runtime.sendMessage({ type: "PAGE_LOADED_HTML", html: webpage_html });

// Listen out for messages from background.js for various UI changes

// Listen for messages from popup.js for rescans