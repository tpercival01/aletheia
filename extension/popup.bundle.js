/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 56:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;
  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}
module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ 72:
/***/ ((module) => {



var stylesInDOM = [];
function getIndexByIdentifier(identifier) {
  var result = -1;
  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }
  return result;
}
function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };
    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }
    identifiers.push(identifier);
  }
  return identifiers;
}
function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);
  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }
      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };
  return updater;
}
module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];
    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }
    var newLastIdentifiers = modulesToDom(newList, options);
    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];
      var _index = getIndexByIdentifier(_identifier);
      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();
        stylesInDOM.splice(_index, 1);
      }
    }
    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ 113:
/***/ ((module) => {



/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }
    styleElement.appendChild(document.createTextNode(css));
  }
}
module.exports = styleTagTransform;

/***/ }),

/***/ 314:
/***/ ((module) => {



/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = [];

  // return the list of modules as css string
  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";
      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }
      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }
      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }
      content += cssWithMappingToString(item);
      if (needLayer) {
        content += "}";
      }
      if (item[2]) {
        content += "}";
      }
      if (item[4]) {
        content += "}";
      }
      return content;
    }).join("");
  };

  // import a list of modules into the list
  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }
    var alreadyImportedModules = {};
    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];
        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }
    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);
      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }
      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }
      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }
      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }
      list.push(item);
    }
  };
  return list;
};

/***/ }),

/***/ 354:
/***/ ((module) => {



module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];
  if (!cssMapping) {
    return content;
  }
  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    return [content].concat([sourceMapping]).join("\n");
  }
  return [content].join("\n");
};

/***/ }),

/***/ 540:
/***/ ((module) => {



/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}
module.exports = insertStyleElement;

/***/ }),

/***/ 629:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(354);
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `:root {
  --bg-primary: #1a1b26;
  --bg-secondary: #2a2c3a;
  --font-primary: #c0caf5;
  --font-secondary: #787c99;
  --border-color: #3b4261;

  /* Brand Colours */
  --brand-royal-blue: #4a69bd;
  --brand-royal-blue-hover: #5b7cdb;
  --brand-gold: #e0af68; 
  --brand-gold-hover: #d99e46;
  --brand-gold-active: #c78f36;
  --brand-red: #ce0808;

  --font-family-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  --border-radius-medium: 8px;
  --popup-width: 350px;

  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-slow: 0.4s ease;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  font-family: var(--font-family-sans);
  background-color: var(--bg-primary);
  color: var(--font-primary);
  width: var(--popup-width);
  font-size: 1rem;
}

.container {
  padding: 15px;
}

.bright {
  color: var(--font-primary);
}

.main_header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
}

.logo {
  width: 32px;
  height: 32px;
}

h1 {
  font-size: 1.25rem;
  font-weight: 600;
}

#status_message {
  padding: 12px 16px;
  border-radius: var(--border-radius-medium);
  margin-bottom: 16px;
  font-size: 0.9rem;
  text-align: center;
  border: 1px solid var(--border-color);
  border-left-width: 4px;
  border-right-width: 4px;
  transition: all 0.3s ease;
}

#button_group_one {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 25px;
  border-top: 1px dotted var(--border-color);
  border-bottom: 1px dotted var(--border-color);
  padding-top: 30px;
}

button {
  font-family: var(--font-family-sans);
  font-size: 0.9rem;
  font-weight: 600;
  padding: 12px;
  border-radius: var(--border-radius-medium);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

#scan_again {
  background-color: var(--brand-royal-blue);
  color: #ffffff;
}

#scan_again:hover {
  background-color: var(--brand-royal-blue-hover);
}

#reset_button {
  background: transparent;
  border: 1px solid var(--brand-royal-blue);
  color: var(--font-primary);
}

#reset_button:hover {
  background-color: var(--brand-royal-blue-hover);
}

/* Results Breakdown */
#results_breakdown {
  margin-top: 24px;
  border-top: 1px dotted var(--border-color);
  padding-top: 16px;
}

#results_list {
  margin-top: 10px;
  position: relative;
  left: 30px;
}

/* Export */

.dropdown {
  position: relative;
  display: flex;
  justify-content: center;
  margin-top: 18px;
  padding-top: 16px;
}

.dropdown_toggle {
  background: transparent;
  border: 1px solid var(--brand-gold);
  color: var(--brand-gold);
  padding: 0.5rem 1rem;
  font-weight: 400;
  border-radius: 4px;
  cursor: pointer;
  transition: transform var(--transition-slow),
              background-color var(--transition-fast);
  z-index: 2;
}

.dropdown_toggle:hover {
  background-color: var(--brand-gold-hover);
  color: var(--bg-primary);
}

.dropdown_toggle:active {
  background-color: var(--brand-gold-active);
}

.dropdown.open > .dropdown_toggle {
  transform: translateX(-105px);
}

.dropdown_menu {
  position: absolute;
  top: -10%;
  left: 72%;
  transform-origin: left center;
  transform: translateY(-50%) scaleX(0);
  opacity: 0;
  transition: transform var(--transition-slow),
              opacity   var(--transition-slow);
  border-radius: var(--border-radius-medium);
  width: 190px;
  background-color: transparent;
  border: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  padding: 0 0;
  margin: 0;
  overflow: hidden;
}

.dropdown.open > .dropdown_menu {
  transform: translateX(-50%) scaleY(1);
  opacity: 1;
}

.dropdown_menu button {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0;
  background: transparent;
  color: var(--brand-gold);
  border: 1px solid var(--brand-gold);
  border-radius: 4px;
  font-weight: 400;
  text-align: center;
  cursor: pointer;
}

.dropdown_menu button:hover {
  background-color: var(--brand-gold-hover);
  color: var(--bg-primary);
}

.dropdown_menu button:active {
  background-color: var(--brand-gold-active);
  color: var(--bg-primary);
}

/* Website link */

.website_link_div {
  text-align: center;
  margin-top: 30px;
  border-top: 1px dotted var(--border-color);
  padding-top: 25px;
}

#website_link {
  display: inline-block;
  background: transparent;
  border: 1px solid var(--brand-royal-blue);
  padding: 6px 12px;
  border-radius: var(--border-radius-medium);
  color: var(--brand-royal-blue);
  font-weight: 400;
  text-decoration: none;
  transition: all 0.2s ease;
}

#website_link:hover {
  background: var(--brand-royal-blue);
  color: #fff;
}

.hidden {
  display: none !important;
}

#settings_button {
  background: transparent;
  color: #989898;
  font-size: 1.2rem;
  padding: 8px 12px;
  cursor: pointer;
  transition: transform var(--transition-slow), 
              background-color var(--transition-fast),
              color var(--transition-fast),
              box-shadow var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

#settings_button:hover {
  color: #d0d0d0;
  transform: rotate(60deg) scale(1.15);
}

#settings_button:active {
  transform: rotate(90deg) scale(0.95);
  color: #989898;
}
`, "",{"version":3,"sources":["webpack://./src/ui/popup/popup.css"],"names":[],"mappings":"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","sourcesContent":[":root {\n  --bg-primary: #1a1b26;\n  --bg-secondary: #2a2c3a;\n  --font-primary: #c0caf5;\n  --font-secondary: #787c99;\n  --border-color: #3b4261;\n\n  /* Brand Colours */\n  --brand-royal-blue: #4a69bd;\n  --brand-royal-blue-hover: #5b7cdb;\n  --brand-gold: #e0af68; \n  --brand-gold-hover: #d99e46;\n  --brand-gold-active: #c78f36;\n  --brand-red: #ce0808;\n\n  --font-family-sans: system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\",\n    Roboto, Oxygen, Ubuntu, Cantarell, \"Open Sans\", \"Helvetica Neue\", sans-serif;\n  --border-radius-medium: 8px;\n  --popup-width: 350px;\n\n  /* Transitions */\n  --transition-fast: 0.2s ease;\n  --transition-slow: 0.4s ease;\n}\n\n*,\n*::before,\n*::after {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nhtml,\nbody {\n  font-family: var(--font-family-sans);\n  background-color: var(--bg-primary);\n  color: var(--font-primary);\n  width: var(--popup-width);\n  font-size: 1rem;\n}\n\n.container {\n  padding: 15px;\n}\n\n.bright {\n  color: var(--font-primary);\n}\n\n.main_header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  margin-bottom: 24px;\n}\n\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.header-right {\n  display: flex;\n  align-items: center;\n}\n\n.logo {\n  width: 32px;\n  height: 32px;\n}\n\nh1 {\n  font-size: 1.25rem;\n  font-weight: 600;\n}\n\n#status_message {\n  padding: 12px 16px;\n  border-radius: var(--border-radius-medium);\n  margin-bottom: 16px;\n  font-size: 0.9rem;\n  text-align: center;\n  border: 1px solid var(--border-color);\n  border-left-width: 4px;\n  border-right-width: 4px;\n  transition: all 0.3s ease;\n}\n\n#button_group_one {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 10px;\n  margin-top: 25px;\n  border-top: 1px dotted var(--border-color);\n  border-bottom: 1px dotted var(--border-color);\n  padding-top: 30px;\n}\n\nbutton {\n  font-family: var(--font-family-sans);\n  font-size: 0.9rem;\n  font-weight: 600;\n  padding: 12px;\n  border-radius: var(--border-radius-medium);\n  border: none;\n  cursor: pointer;\n  transition: all 0.2s ease-in-out;\n}\n\nbutton:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);\n}\n\n#scan_again {\n  background-color: var(--brand-royal-blue);\n  color: #ffffff;\n}\n\n#scan_again:hover {\n  background-color: var(--brand-royal-blue-hover);\n}\n\n#reset_button {\n  background: transparent;\n  border: 1px solid var(--brand-royal-blue);\n  color: var(--font-primary);\n}\n\n#reset_button:hover {\n  background-color: var(--brand-royal-blue-hover);\n}\n\n/* Results Breakdown */\n#results_breakdown {\n  margin-top: 24px;\n  border-top: 1px dotted var(--border-color);\n  padding-top: 16px;\n}\n\n#results_list {\n  margin-top: 10px;\n  position: relative;\n  left: 30px;\n}\n\n/* Export */\n\n.dropdown {\n  position: relative;\n  display: flex;\n  justify-content: center;\n  margin-top: 18px;\n  padding-top: 16px;\n}\n\n.dropdown_toggle {\n  background: transparent;\n  border: 1px solid var(--brand-gold);\n  color: var(--brand-gold);\n  padding: 0.5rem 1rem;\n  font-weight: 400;\n  border-radius: 4px;\n  cursor: pointer;\n  transition: transform var(--transition-slow),\n              background-color var(--transition-fast);\n  z-index: 2;\n}\n\n.dropdown_toggle:hover {\n  background-color: var(--brand-gold-hover);\n  color: var(--bg-primary);\n}\n\n.dropdown_toggle:active {\n  background-color: var(--brand-gold-active);\n}\n\n.dropdown.open > .dropdown_toggle {\n  transform: translateX(-105px);\n}\n\n.dropdown_menu {\n  position: absolute;\n  top: -10%;\n  left: 72%;\n  transform-origin: left center;\n  transform: translateY(-50%) scaleX(0);\n  opacity: 0;\n  transition: transform var(--transition-slow),\n              opacity   var(--transition-slow);\n  border-radius: var(--border-radius-medium);\n  width: 190px;\n  background-color: transparent;\n  border: none;\n  box-shadow: 0 2px 8px rgba(0,0,0,0.4);\n  padding: 0 0;\n  margin: 0;\n  overflow: hidden;\n}\n\n.dropdown.open > .dropdown_menu {\n  transform: translateX(-50%) scaleY(1);\n  opacity: 1;\n}\n\n.dropdown_menu button {\n  display: block;\n  width: 100%;\n  padding: 0.5rem 1rem;\n  margin: 0.5rem 0;\n  background: transparent;\n  color: var(--brand-gold);\n  border: 1px solid var(--brand-gold);\n  border-radius: 4px;\n  font-weight: 400;\n  text-align: center;\n  cursor: pointer;\n}\n\n.dropdown_menu button:hover {\n  background-color: var(--brand-gold-hover);\n  color: var(--bg-primary);\n}\n\n.dropdown_menu button:active {\n  background-color: var(--brand-gold-active);\n  color: var(--bg-primary);\n}\n\n/* Website link */\n\n.website_link_div {\n  text-align: center;\n  margin-top: 30px;\n  border-top: 1px dotted var(--border-color);\n  padding-top: 25px;\n}\n\n#website_link {\n  display: inline-block;\n  background: transparent;\n  border: 1px solid var(--brand-royal-blue);\n  padding: 6px 12px;\n  border-radius: var(--border-radius-medium);\n  color: var(--brand-royal-blue);\n  font-weight: 400;\n  text-decoration: none;\n  transition: all 0.2s ease;\n}\n\n#website_link:hover {\n  background: var(--brand-royal-blue);\n  color: #fff;\n}\n\n.hidden {\n  display: none !important;\n}\n\n#settings_button {\n  background: transparent;\n  color: #989898;\n  font-size: 1.2rem;\n  padding: 8px 12px;\n  cursor: pointer;\n  transition: transform var(--transition-slow), \n              background-color var(--transition-fast),\n              color var(--transition-fast),\n              box-shadow var(--transition-fast);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n#settings_button:hover {\n  color: #d0d0d0;\n  transform: rotate(60deg) scale(1.15);\n}\n\n#settings_button:active {\n  transform: rotate(90deg) scale(0.95);\n  color: #989898;\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 659:
/***/ ((module) => {



var memo = {};

/* istanbul ignore next  */
function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target);

    // Special case to return head of iframe instead of iframe itself
    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }
    memo[target] = styleTarget;
  }
  return memo[target];
}

/* istanbul ignore next  */
function insertBySelector(insert, style) {
  var target = getTarget(insert);
  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }
  target.appendChild(style);
}
module.exports = insertBySelector;

/***/ }),

/***/ 825:
/***/ ((module) => {



/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";
  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }
  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }
  var needLayer = typeof obj.layer !== "undefined";
  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }
  css += obj.css;
  if (needLayer) {
    css += "}";
  }
  if (obj.media) {
    css += "}";
  }
  if (obj.supports) {
    css += "}";
  }
  var sourceMap = obj.sourceMap;
  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  }

  // For old IE
  /* istanbul ignore if  */
  options.styleTagTransform(css, styleElement, options.options);
}
function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }
  styleElement.parentNode.removeChild(styleElement);
}

/* istanbul ignore next  */
function domAPI(options) {
  if (typeof document === "undefined") {
    return {
      update: function update() {},
      remove: function remove() {}
    };
  }
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}
module.exports = domAPI;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js
var injectStylesIntoStyleTag = __webpack_require__(72);
var injectStylesIntoStyleTag_default = /*#__PURE__*/__webpack_require__.n(injectStylesIntoStyleTag);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleDomAPI.js
var styleDomAPI = __webpack_require__(825);
var styleDomAPI_default = /*#__PURE__*/__webpack_require__.n(styleDomAPI);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertBySelector.js
var insertBySelector = __webpack_require__(659);
var insertBySelector_default = /*#__PURE__*/__webpack_require__.n(insertBySelector);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js
var setAttributesWithoutAttributes = __webpack_require__(56);
var setAttributesWithoutAttributes_default = /*#__PURE__*/__webpack_require__.n(setAttributesWithoutAttributes);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/insertStyleElement.js
var insertStyleElement = __webpack_require__(540);
var insertStyleElement_default = /*#__PURE__*/__webpack_require__.n(insertStyleElement);
// EXTERNAL MODULE: ./node_modules/style-loader/dist/runtime/styleTagTransform.js
var styleTagTransform = __webpack_require__(113);
var styleTagTransform_default = /*#__PURE__*/__webpack_require__.n(styleTagTransform);
// EXTERNAL MODULE: ./node_modules/css-loader/dist/cjs.js!./src/ui/popup/popup.css
var popup = __webpack_require__(629);
;// ./src/ui/popup/popup.css

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (styleTagTransform_default());
options.setAttributes = (setAttributesWithoutAttributes_default());
options.insert = insertBySelector_default().bind(null, "head");
options.domAPI = (styleDomAPI_default());
options.insertStyleElement = (insertStyleElement_default());

var update = injectStylesIntoStyleTag_default()(popup/* default */.A, options);




       /* harmony default export */ const popup_popup = (popup/* default */.A && popup/* default */.A.locals ? popup/* default */.A.locals : undefined);

;// ./src/ui/popup/popup.js


const statusMessage = document.getElementById("status_message");

const scanAgainButton = document.getElementById("scan_again");
const resetPageButton = document.getElementById("reset_button");

const resultsBreakdown = document.getElementById("results_breakdown");
const resultsList = document.getElementById("results_list");

const dropdown = document.querySelector('.dropdown');
const toggle = dropdown.querySelector('.dropdown_toggle');
const menu = dropdown.querySelector('.dropdown_menu');


window.addEventListener("DOMContentLoaded", async () => {
  const {state} = await chrome.storage.local.get("state");
  checkPopupState(state);

  // Handle export menu
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  menu.addEventListener('click', e => e.stopPropagation());

  document.addEventListener('click', () => {
    if (dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
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
    if (changes.state.newValue.status == "Completed"){
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
    console.log("SCANNED AGAIN")
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

function update_results(changes){
  const listItemOne = document.createElement("li");
  listItemOne.innerHTML = `${changes.state.newValue.aiPosCount} elements are 90% likely to be AI`
  const listItemTwo = document.createElement("li");
  listItemTwo.innerHTML = `${changes.state.newValue.aiSomeCount} elements are 50% likely to be AI`
  resultsList.appendChild(listItemOne);
  resultsList.appendChild(listItemTwo);
}

function send_report_website(){
  console.log("Sending report to website.")
}

function download_report(){

  // Need to decide what the report will look like, contain, etc.
  // Probably just a bigger summary, maybe some examples.

  console.log("Downloading full report.")
}


// Open settings page
document.getElementById('settings_button').onclick = (e) => {
  window.location.href = chrome.runtime.getURL("ui/settings/settings.html");
}
/******/ })()
;
//# sourceMappingURL=popup.bundle.js.map