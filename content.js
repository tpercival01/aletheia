const webpage_html = document.documentElement.innerHTML;

chrome.runtime.sendMessage({ type: "PAGE_LOADED_HTML", html: webpage_html });