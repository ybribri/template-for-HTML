//ver 1.7
'use strict';

const eTemplate = function () {
    this.htmlCode = [];
    this.htmlType = [];
    this.htmlSync = [];
    this.cssRules = [];
    this.cssCode = [];
    this.cssType = [];
    this.syncCnt = 0;
    this.titleCode = '';
    this.fileName = '';
    this.syncClass = 'et_sync';
    this.commentDelimiter = '<%%';
    this.openDelimiter = '<%';
    this.closeDelimiter = '%>';
};

eTemplate.prototype.render = async function ({ openDelimiter = "<%", closeDelimiter = "%>", syncUrl: fileName = "", scrollTo: scrollObj = {}, startUrl = "", syncClass = "et_sync", iScope = "" } = {}) {
    // initial setup
    this.syncCnt = 0; // reset sync count
    this.syncClass = syncClass; // class name to be refreshed when sync() is called
    this.openDelimiter = openDelimiter;
    this.closeDelimiter = closeDelimiter;
    this.commentDelimiter = openDelimiter + "%";
    let myUrl = this.currentUrl().host + this.currentUrl().filename;
    if (fileName == "" && startUrl != "") { fileName = startUrl; }
    if (fileName == "") { fileName = this.currentUrl().filename; }
    this.fileName = fileName;
    myUrl = this.currentUrl().host + fileName;
    //  read first layer HTML
    const RESPONSE = await fetch(myUrl);
    const CURRENTHTML = await RESPONSE.text();
    // change title
    this.getTitle(CURRENTHTML);
    this.changeTitle();
    // read second layer and proceed
    const RESULT = await this.readFurther(CURRENTHTML, iScope);
    this.removeAllChildNodes(document.querySelector('body'));
    document.body.insertAdjacentHTML('afterbegin', RESULT.htmlBlock.join(""));
    // scroll to element of ID
    if (scrollObj != {} && Object.keys(scrollObj).length != 0) {
        document.getElementById(scrollObj.id).scrollIntoView({ block: scrollObj.block });
    }
    // variables for sync()
    this.htmlCode = RESULT.codeList.code;
    this.htmlType = RESULT.codeList.type;

    if (typeof addListener === "function") addListener(fileName);
    document.body.style.display = "block";
    return new Promise((resolve, reject) => {
        resolve("done");
    });
};

// read further nested HTML and process
eTemplate.prototype.readFurther = async function (currentHTML, iScope) {
    // CSS change in HEAD
    if (iScope != 'body') { await this.changeCss(currentHTML); }
    let { finalHTML, codeList } = await this.insertNestedHTML(currentHTML);
    // categorize codes
    codeList = this.seperateCode(finalHTML, "second");
    // make code blocks like for, if...
    let sync = this.makeSyncBlock(codeList.type, codeList.code);
    // add "HTML" if first code="JS"
    if (codeList.type[0] == "JS") {
        codeList.type.unshift("HTML");
        codeList.code.unshift(" ");
        sync = sync.map(x => x + 1);
        sync.unshift(0);
    }
    // insert class or span tag for refreshing templates
    codeList = this.insertSync(codeList.type, codeList.code, sync);
    this.htmlSync = sync;
    this.syncCnt = codeList.syncCnt;
    // interprete template scripts
    let htmlBlock = this.interpret(codeList.type, codeList.code);
    return new Promise((resolve, reject) => {
        resolve({ htmlBlock, codeList });
    });
};

eTemplate.prototype.sync = function (iScope) {
    let temp = "";
    let eClass = this.syncClass;
    // check and change title
    this.changeTitle();
    // put values of input tags to related variables
    document.querySelectorAll(`.${eClass}`).forEach((cList) => {
        temp = "";
        if (cList.nodeName == "INPUT") {
            temp = cList.getAttribute("data-sync");
            if (cList.type == "number") {
                temp += "=" + (cList.value ? this.escapeHtml(cList.value) : '""');
            } else {
                temp += "=" + (cList.value ? `"${this.escapeHtml(cList.value)}"` : '""');
            }
            try { temp_code = this.controlCode(temp); }
            catch (error) { return error; }
        }
    });
    // interprete registered templates
    let htmlBlock = this.interpretPart(this.htmlType, this.htmlCode, eClass);
    // change current template to newly interpreted templates
    document.querySelectorAll(`.${eClass}`).forEach((cList) => {
        let classLists = cList.classList;
        let classAttr = '';
        let isTemplateInAttribute = false;
        let index = 0;
        // get attribute to change from class
        classLists.forEach((classList) => {
            if (classList.includes(`${eClass}_`)) {
                isTemplateInAttribute = true;
                classAttr = classList.split('_').pop();
            }
            if (classList.includes(`${eClass}Cnt`)) { index = parseInt(classList.replace(`${eClass}Cnt`, ''), 10); }
        });
        if (isTemplateInAttribute) {
            cList.setAttribute(classAttr, htmlBlock[index]);
        } else {
            this.removeAllChildNodes(cList);
            cList.insertAdjacentHTML('afterbegin', htmlBlock[index]);
        }
    });
    if (iScope != 'body') { this.syncCss(); }
};

eTemplate.prototype.syncCss = function () {
    // if there is no template to interpret, return
    if (this.cssType.length == 0 || !this.cssType.includes('JS')) { return true; }
    // interpret seperated Css and parse it
    let htmlBlock = this.interpret(this.cssType, this.cssCode);
    let cssRules = this.parseCSS(htmlBlock.join(""));
    // find combined style tag
    let sheetNo = 0;
    for (let i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i].href == null) {
            sheetNo = i;
            break;
        }
    }
    let cRules = this.cssRules; // current CSS 
    const emptySpace = /\s+|\\n/g;
    let modifiedCss = "";
    let toAdd = [];
    let updatedRules = [];
    // check CSS change
    cssRules.forEach((cssRule, i) => {
        let cssType = cssRule.type == undefined ? "" : cssRule.type;
        let currentIndex = -1;
        let typeNo = 0;
        let selector = '';
        switch (cssType) {
            case "keyframes":
                for (let ci = 0; ci < cRules.length; ci++) {
                    let cRule = cRules[ci];
                    let frameSelector = cssRule.styles.substring(0, cssRule.styles.indexOf('{')).trim();
                    let cframeSelector = cRule.styles.substring(0, cRule.styles.indexOf('{')).trim();
                    if (cRule.type == "keyframes" && frameSelector == cframeSelector) {
                        currentIndex = ci;
                        break;
                    }
                }
                if (currentIndex > -1) {
                    let oldText = cRules[currentIndex].styles;
                    let newText = cssRule.styles;
                    if (oldText.replace(emptySpace, '') != newText.replace(emptySpace, '')) {
                        document.styleSheets[sheetNo].deleteRule(currentIndex);
                        document.styleSheets[sheetNo].insertRule(newText, currentIndex);
                    }
                    updatedRules.push([currentIndex, -2, 0, 7]);
                } else {
                    toAdd.push(["rule", i, -1, -1, cssRule.styles]);
                }
                break;
            case "media":
            case "supports":
                if (cssType == "media") {
                    typeNo = 4;
                } else {
                    typeNo = 12;
                }
                for (let ci = 0; ci < cRules.length; ci++) {
                    let cRule = cRules[ci];
                    if (cRule.type == cssType && cssRule.selector == cRule.selector) {
                        currentIndex = ci;
                        break;
                    }
                }
                if (currentIndex > -1) {
                    cssRule.subStyles.forEach((subStyle, j) => {
                        selector = subStyle.selector;
                        let currentSubIndex = -1;
                        for (let cj = 0; cj < cRules[currentIndex].subStyles.length; cj++) {
                            if (cRules[currentIndex].subStyles[cj].selector == selector) {
                                currentSubIndex = cj;
                                break;
                            }
                        }
                        if (currentSubIndex > -1) {
                            subStyle.rules.forEach((rule, k) => {
                                let currentStyle = -1;
                                for (let ck = 0; ck < cRules[currentIndex].subStyles[currentSubIndex].rules.length; ck++) {
                                    let styleKey = cRules[currentIndex].subStyles[currentSubIndex].rules[ck].key;
                                    if (styleKey == rule.key) {
                                        currentStyle = ck;
                                        break;
                                    }
                                }
                                if (currentStyle > -1) {
                                    let key = cRules[currentIndex].subStyles[currentSubIndex].rules[currentStyle].key;
                                    let oldValue = cRules[currentIndex].subStyles[currentSubIndex].rules[currentStyle].value;
                                    let newValue = rule.value;
                                    if (oldValue != newValue) {
                                        document.styleSheets[sheetNo].cssRules[currentIndex].cssRules[currentSubIndex].style.setProperty(key, newValue);
                                    }
                                    updatedRules.push([currentIndex, currentSubIndex, currentStyle, typeNo]);
                                } else {
                                    toAdd.push(["style", i, j, k, rule.key, rule.value]);
                                }

                            });
                        } else {
                            modifiedCss = "    " + subStyle.selector + " {\n";
                            for (let k = 0; k < subStyle.rules.length; k++) {
                                modifiedCss = modifiedCss + `        ${subStyle.rules[k].key}: ${subStyle.rules[k].value};\n`;
                            }
                            modifiedCss = modifiedCss + "    }\n";
                            toAdd.push(["rule", i, j, -1, modifiedCss]);
                        }
                    });

                } else {
                    modifiedCss = cssRule.selector + " {\n";
                    for (let j = 0; j < cssRule.subStyles.length; j++) {
                        let subStyle = cssRule.subStyles[j];
                        modifiedCss = modifiedCss + "    " + subStyle.selector + " {\n";
                        for (let k = 0; k < subStyle.rules.length; k++) {
                            modifiedCss = modifiedCss + `        ${subStyle.rules[k].key}: ${subStyle.rules[k].value};\n`;
                        }
                        modifiedCss = modifiedCss + "    }\n";
                    }
                    modifiedCss = modifiedCss + "}\n";
                    toAdd.push(["rule", i, -1, -1, modifiedCss]);
                }

                break;
            case "":
            case "font-face":
                if (cssType == "font-face") {
                    typeNo = 5;
                } else {
                    typeNo = 1;
                }
                for (let ci = 0; ci < cRules.length; ci++) {
                    let cRule = cRules[ci];
                    if (cssRule.selector == cRule.selector) {
                        currentIndex = ci;
                        break;
                    }
                }
                if (currentIndex > -1) {
                    cssRule.rules.forEach((rule, j) => {
                        let currentStyle = -1;
                        for (let cj = 0; cj < cRules[currentIndex].rules.length; cj++) {
                            let styleKey = cRules[currentIndex].rules[cj].key;
                            if (styleKey == rule.key) {
                                currentStyle = cj;
                                break;
                            }
                        }
                        if (currentStyle > -1) {
                            let key = cRules[currentIndex].rules[currentStyle].key;
                            let oldValue = cRules[currentIndex].rules[currentStyle].value;
                            let newValue = rule.value;
                            if (oldValue != newValue) {
                                document.styleSheets[sheetNo].cssRules[currentIndex].style.setProperty(key, newValue);
                            }
                            updatedRules.push([currentIndex, -1, currentStyle, typeNo]);
                        } else {
                            modifiedCss = `    ${rule.key}: ${rule.value};\n`;
                            toAdd.push(["style", i, -1, j, rule.key, rule.value]);
                        }
                    });
                } else {
                    modifiedCss = cssRule.selector + " {\n";
                    for (let j = 0; j < cssRule.rules.length; j++) {
                        modifiedCss = modifiedCss + `    ${cssRule.rules[j].key}: ${cssRule.rules[j].value};\n`;
                    }
                    modifiedCss = modifiedCss + "}\n";
                    toAdd.push(["rule", i, -1, -1, modifiedCss]);
                }
                break;
        }
    });

    // delete css
    let cssLength = cRules.length;
    let ruleLength = 0;
    let styleLength = 0;
    for (let i = cssLength - 1; i >= 0; i--) {
        let typeNo = 0;
        let cRule = cRules[i];
        switch (cRule.type) {
            case "media":
            case "supports":
                if (cRule.type == "media") {
                    typeNo = 4;
                } else {
                    typeNo = 12;
                }
                ruleLength = cRule.subStyles.length;
                for (let j = ruleLength - 1; j >= 0; j--) {
                    styleLength = cRule.subStyles[j].rules.length;
                    for (let k = styleLength - 1; k >= 0; k--) {
                        let isUpdated = this.arrayFind(updatedRules, [i, j, k, typeNo]);
                        if (isUpdated < 0) {
                            let targetProp = cRule.subStyles[j].rules[k].key;
                            document.styleSheets[sheetNo].cssRules[i].cssRules[j].style.removeProperty(targetProp);
                        }
                    }
                    if (document.styleSheets[sheetNo].cssRules[i].cssRules[j].style.length == 0) {
                        document.styleSheets[sheetNo].cssRules[i].deleteRule(j);
                    }
                }
                if (document.styleSheets[sheetNo].cssRules[i].cssRules.length == 0) {
                    document.styleSheets[sheetNo].deleteRule(i);
                }
                break;
            case "":
            case "font-face":
                if (cRule.type == "") {
                    typeNo = 1;
                } else {
                    typeNo = 5;
                }
                styleLength = cRule.rules.length;
                for (let j = styleLength - 1; j >= 0; j--) {
                    let isUpdated = this.arrayFind(updatedRules, [i, -1, j, typeNo]);
                    if (isUpdated < 0) {
                        let targetProp = cRule.rules[j].key;
                        document.styleSheets[sheetNo].cssRules[i].style.removeProperty(targetProp);
                    }
                }

                if (document.styleSheets[sheetNo].cssRules[i].style.length == 0) {
                    document.styleSheets[sheetNo].deleteRule(i);
                }
                break;
            case 7:
                let isUpdated = this.arrayFind(updatedRules, [i, -2, 0, 7]);
                if (isUpdated < 0) {
                    document.styleSheets[sheetNo].deleteRule(i);
                }
                break;
        }
    }
    // add css
    for (let i = 0; i < toAdd.length; i++) {
        let [addType, rule1, rule2, style1, prop, value = ""] = toAdd[i];

        if (addType == "style") {
            if (rule2 == -1) {
                document.styleSheets[sheetNo].cssRules[rule1].style.setProperty(prop, value);
            } else {
                document.styleSheets[sheetNo].cssRules[rule1].cssRules[rule2].style.setProperty(prop, value);
            }
        } else {
            if (rule2 == -1) {
                document.styleSheets[sheetNo].insertRule(prop, rule1);
            } else {
                document.styleSheets[sheetNo].cssRules[rule1].insertRule(prop, rule2);
            }
        }
    }
    // replace this.cssRules
    this.cssRules = JSON.parse(JSON.stringify(cssRules));
};

eTemplate.prototype.findInclude = function (currentHTML) {
    // declare variables
    let includeArray = []; // only JS script in body
    let urls = []; // url for inclusion
    let order = []; // index of include script out of code array
    let tempString = "";
    let cnt = 0;
    let currentBodyHTML = "";
    // extract body scripts from current HTML
    let startPos = currentHTML.indexOf("<body>");
    let endPos = currentHTML.indexOf("</body>");
    currentBodyHTML = (startPos == -1 || endPos == -1) ? currentHTML : currentHTML.substring(startPos + 6, endPos);
    // categorize script to JS and HTML as they are
    let bodyCode = this.seperateCode(currentBodyHTML, "first");
    // only include() to includeArray
    for (let i = 0; i < bodyCode.type.length; i++) {
        if (bodyCode.type[i] == "JS" && bodyCode.code[i].search(/include\(.*\)/g) != -1) {
            includeArray.push(bodyCode.code[i]);
            order[cnt] = i;
            cnt++;
        }
    }

    // if include() exists, get urls from script
    if (includeArray.length != 0) {
        includeArray.forEach((script) => {
            if (script.includes("include(")) {
                startPos = script.indexOf('include("');
                if (startPos == -1) {
                    startPos = script.indexOf("include('") + 9;
                } else startPos = startPos + 9;
                endPos = script.indexOf('")');
                if (endPos == -1) {
                    endPos = script.indexOf("')");
                }
                tempString = script.substring(startPos, endPos);
                tempString = (tempString.substring(0, 1) == "/") ? tempString.substring(1) : tempString;
                tempString = (tempString.substring(0, 2) == "./") ? tempString.substring(2) : tempString;
                urls.push(this.currentUrl().host + tempString);
            }
        });
    }
    return {
        urls: urls,
        order: order,
        codeList: bodyCode.code
    };
};

eTemplate.prototype.insertNestedHTML = async function (currentHTML) {
    let finalHTML = "";
    let { urls, order, codeList } = this.findInclude(currentHTML);
    if (urls.length == 0) {
        finalHTML = codeList.join("");
        return { finalHTML: finalHTML, codeList: codeList };
    }
    let insertedHTMLs = await this.getTextFromFiles(urls);
    // insert HTML of files into each include() script
    insertedHTMLs.forEach((insertedHTML, i) => { codeList[order[i]] = insertedHTML; });
    // new HTML with included HTML
    finalHTML = codeList.join("");
    ({ urls, order, codeList } = this.findInclude(finalHTML));
    if (urls.length == 0) return { finalHTML: finalHTML, codeList: codeList };
    ({ finalHTML, codeList } = await this.insertNestedHTML(finalHTML));
    return { finalHTML: finalHTML, codeList: codeList };
}

eTemplate.prototype.seperateCode = function (html, calltype) {
    const regexText = `(${this.openDelimiter}[^%].*?${this.closeDelimiter})`;
    const templateRegex = new RegExp(regexText, 'g');
    // const templateRegex = /(<%[^%].*?%>)/g;
    let codes = html.split(templateRegex);
    let types = [];
    codes.forEach((code, index) => {
        let firstIndex = code.indexOf(`${this.openDelimiter}`);
        let lastIndex = code.indexOf(`${this.closeDelimiter}`);
        let codeType = "";
        if (firstIndex == 0 && lastIndex == (code.length - 2) && !code.includes('closeDelimiter:')) {
            codeType = "JS";
            codes[index] = (calltype == "second") ? code.substring(2, code.length - 2).trim() : code.trim();
        } else {
            codeType = "HTML";
            codes[index] = this.removeControlText(code).trim();
        }
        types.push(codeType);
    });
    // combine adjcent HTML
    let typeLength = types.length;
    if (typeLength > 1) {
        for (let i = typeLength - 1; i >= 1; i--) {
            if (types[i] == types[i - 1] && types[i] == "HTML") {
                codes[i - 1] = codes[i - 1] + codes[i];
                codes.splice(i, 1);
                types.splice(i, 1);
            }
        }
    }
    return { type: types, code: codes };
}

eTemplate.prototype.interpret = function (type, code) {
    // declare variables
    let htmlBlock = [];
    let cnt = 0;
    let escapedOpenComment = this.escapeHtml(this.commentDelimiter.replace(this.commentDelimiter, this.openDelimiter));
    let escapedCloseComment = this.escapeHtml(this.closeDelimiter);

    while (cnt < code.length) {
        switch (type[cnt]) {
            // HTML, as it is
            case "HTML":
                htmlBlock.push(code[cnt].replaceAll(this.commentDelimiter, escapedOpenComment).replaceAll(this.closeDelimiter, escapedCloseComment));
                break;
            // JS
            case "JS":
                if (code[cnt].substring(0, 1) == "=" || code[cnt].substring(0, 1) == "-") {
                    // sing line script
                    try {
                        htmlBlock.push(this.basicCode(code[cnt]));
                    } catch (error) {
                        htmlBlock.push("invalid template");
                    }
                    break;
                } else {
                    // multi line script block
                    let blockData = this.eachBlock(type, code, cnt);
                    cnt = blockData.index; // to next block
                    try {
                        htmlBlock.push(this.controlCode(blockData.partBlock));
                    } catch (error) {
                        htmlBlock.push("invalid template");
                    }
                    break;
                }
        } // switch:end
        cnt++;
    } // for:end
    return htmlBlock;
};

eTemplate.prototype.interpretPart = function (oType, oCode, eClass) {
    // declare variables
    let htmlBlock = [];
    let tempStr = "";
    let nType = [];
    let nCode = [];
    let tags = [];
    let i = 0;
    let j = 0;
    let blockNo = 0;
    let cnt = 0;
    let escapedOpenComment = this.escapeHtml(this.commentDelimiter.replace(this.commentDelimiter, this.openDelimiter));
    let escapedCloseComment = this.escapeHtml(this.closeDelimiter);

    for (i = 0; i < oCode.length; i++) {
        tags.length = 0;
        if (oType[i] == "HTML") {
            j = 0;
            tempStr = "";
            tags = this.removeControlText(oCode[i]).split("<");
            tags.forEach((tag) => {
                if (tag.includes("class=") && tag.includes(eClass)) {
                    tempStr = tag.substring(0, tag.indexOf(" ")).trim();
                }
            });
            if (tempStr.length > 0) {
                blockNo = this.htmlSync[i + 1];
                for (j = i + 1; j < oCode.length; j++) {
                    if (this.htmlSync[j] == blockNo) {
                        nType.push(oType[j]);
                        nCode.push(oCode[j]);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    while (cnt < nCode.length) {
        switch (nType[cnt]) {
            // HTML, as it is
            case "HTML":
                htmlBlock.push(nCode[cnt].replaceAll(this.commentDelimiter, escapedOpenComment).replaceAll(this.closeDelimiter, escapedCloseComment));
                break;
            // JS
            case "JS":
                if (nCode[cnt].substring(0, 1) == "=" || nCode[cnt].substring(0, 1) == "-") {
                    // single line script
                    try {
                        htmlBlock.push(this.basicCode(nCode[cnt]));
                    } catch (error) {
                        htmlBlock.push("invalid template script");
                    }
                    break;
                } else {
                    // multi line script block
                    let block_data = this.eachBlock(nType, nCode, cnt);
                    cnt = block_data.index; // to next block
                    try {
                        htmlBlock.push(this.controlCode(block_data.partBlock));
                    } catch (error) {
                        htmlBlock.push("invalid template script");
                    }
                    break;
                }
        } // switch:end
        cnt++;
    } // for:while
    return htmlBlock;
};

eTemplate.prototype.makeSyncBlock = function (type, code) {
    let sync = [];
    let cnt = 0;
    let index = 0;
    let braceBalance = 0;

    for (let i = 0; i < code.length; i++) {
        switch (type[i]) {
            // HTML, as it is
            case "HTML":
                sync.push(cnt);
                break;
            // JS
            case "JS":
                if (code[i].substring(0, 1) == "=" || code[i].substring(0, 1) == "-") {
                    // sing line script
                    sync.push(cnt);
                    break;
                } else {
                    // multi line script block
                    index = this.findBlockEnd(type, code, i).index;
                    braceBalance = this.findBlockEnd(type, code, i).braceBalance;
                    if (braceBalance < 0) {
                        console.log("ERROR: missing {");
                    } else if (braceBalance > 0) {
                        console.log("ERROR: missing }");
                    }
                    sync = [...sync, ...Array(index - i + 1).fill(cnt)];
                    i = index; // to next block
                    break;
                }
        } // switch:end
        cnt++;
    } // for:end
    return sync;
};

eTemplate.prototype.findBlockEnd = function (type, code, i) {
    // multi line script block - change
    let bracesCnt = 0;
    let j = 0;
    for (j = i; j < code.length; j++) {
        // First part of block
        if (j == i && type[j] == "JS") {
            if (code[j].includes("{")) bracesCnt++;
            if (code[j].includes("}")) bracesCnt--;
            if (bracesCnt == 0) return { index: j, error: 0 };
            continue;
        }
        // additional blocks
        // HTML
        if (type[j] == "HTML") continue;
        // JS
        if (type[j] == "JS" && code[j].substring(0, 1) != "=" && code[j].substring(0, 1) != "-") {
            if (code[j].includes("{")) bracesCnt++;
            if (code[j].includes("}")) bracesCnt--;
            if (bracesCnt == 0) return { index: j, error: 0 };
        }
    }
    if (bracesCnt != 0) return { index: i, braceBalance: bracesCnt };
    // if braces are not closed, change all the JS to HTML
    return { index: j, braceBalance: bracesCnt };
};

eTemplate.prototype.eachBlock = function (type, code, i) {
    // multi line script block - change
    let partBlock = "";
    let bracesCnt = 0;
    let j = 0;
    for (j = i; j < code.length; j++) {
        // First part of block
        if (j == i) {
            if (type[j] == "JS") {
                if (code[j].includes("{")) bracesCnt++;
                if (code[j].includes("}")) bracesCnt--;
                if (bracesCnt == 0) return { partBlock: code[j], index: j };
                partBlock = `let answer=''; ${code[j]}`;
                continue;
            } else {
                partBlock = `let answer='${code[j]}';`;
            }
        }
        // additional blocks
        // HTML
        if (type[j] == "HTML") {
            partBlock += `answer += '${code[j]}';`;
            continue;
        }
        // JS
        if (type[j] == "JS") {
            if (code[j].substring(0, 1) == "=" || code[j].substring(0, 1) == "-") {
                partBlock += `answer += ${code[j].substring(1)};`;
            } else {
                partBlock += code[j];
                if (code[j].includes("{")) bracesCnt++;
                if (code[j].includes("}")) bracesCnt--;
                if (bracesCnt == 0) {
                    partBlock += `; return answer;`;
                    return { partBlock: partBlock, index: j };
                }
            }
        }
    }
    partBlock += `; return answer;`;
    return { partBlock: partBlock, index: j };
};

eTemplate.prototype.insertSync = function (type, code, sync) {
    let lastSync = -1;
    let startPos = 0;
    let endPos = 0;
    let tempStr = "";
    let tagStr = "";
    let prevCode = "";
    let nextCode = "";
    let startBlock = 0;
    let endBlock = 0;
    let classStart = 0;
    let syncCnt = this.syncCnt;
    const eClass = this.syncClass;

    for (let i = 0; i < sync.length; i++) {
        if (sync[i] != lastSync && type[i] == "JS") {
            lastSync = sync[i];
            endBlock = 0;
            classStart = 0;
            startBlock = i;
            endBlock = sync.lastIndexOf(sync[startBlock]);
            prevCode = code[i - 1];

            if (prevCode.substring(prevCode.length - 1) != ">") {
                endPos = prevCode.lastIndexOf(">");
                startPos = prevCode.lastIndexOf("<");

                if (endPos < startPos) {
                    // template in the middle of prev and next code
                    tempStr = prevCode.substring(startPos);
                    let attr_start = prevCode.lastIndexOf(' ');
                    let attr_end = prevCode.lastIndexOf('="');
                    let attr = prevCode.substring(attr_start + 1, attr_end);
                    if (tempStr.includes("class=")) {
                        // class in the previous code
                        classStart = prevCode.indexOf("class=", startPos) + 7;
                        code[i - 1] = `${prevCode.substring(0, classStart)}${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt} ${prevCode.substring(classStart)}`;
                        syncCnt++;
                    } else {
                        // class in the next code
                        nextCode = code[i + 1];
                        endPos = nextCode.indexOf(">");
                        tempStr = nextCode.substring(0, endPos);
                        if (tempStr.includes("class=")) {
                            // is there class?
                            classStart = nextCode.indexOf("class=") + 7;
                            code[i + 1] = `${nextCode.substring(0, classStart)}${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt} ${nextCode.substring(classStart)}`;
                            syncCnt++;
                        } else {
                            // then, insert class
                            startPos = prevCode.lastIndexOf("<");
                            endPos = prevCode.indexOf(" ", startPos);
                            code[i - 1] = `${prevCode.substring(0, endPos + 1)} class="${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt}" ${prevCode.substring(endPos + 1)}`;
                            syncCnt++;
                        }
                    }
                } else {
                    // not in the middle and there is text elements before this template
                    code[i - 1] = code[i - 1] + `<span class="${eClass} ${eClass}Cnt${syncCnt}">`;
                    syncCnt++;
                    code[endBlock + 1] = "</span>" + code[endBlock + 1];
                }
            } else {
                startPos = prevCode.lastIndexOf("<");
                tagStr = prevCode.substring(startPos + 1, prevCode.length).split(" ")[0];
                if (prevCode.substring(startPos, startPos + 2) != "</") { //  if previous code is not ended with end tag
                    if (
                        code[endBlock + 1].includes("</" + tagStr) && code[endBlock + 1].indexOf("</" + tagStr) <
                        (code[endBlock + 1].indexOf("<" + tagStr) == -1 ? code[endBlock + 1].length : code[endBlock + 1].indexOf("<" + tagStr))
                    ) {
                        // end tag in the next code
                        endPos = prevCode.length - 1;
                        startPos = prevCode.lastIndexOf("<");
                        tempStr = prevCode.substring(startPos, endPos + 1);
                        if (tempStr.includes("class=")) {
                            classStart = prevCode.indexOf("class=", startPos) + 7;
                            code[i - 1] = `${prevCode.substring(0, classStart)}${eClass} ${eClass}Cnt${syncCnt} ${prevCode.substring(classStart)}`;
                            syncCnt++;
                        } else {
                            code[i - 1] =
                                `${prevCode.substring(0, prevCode.length - 1)} class="${eClass} ${eClass}Cnt${syncCnt}" ${prevCode.substring(prevCode.length - 1, prevCode.length)}`;
                            syncCnt++;
                        }
                    } else {
                        // no tag in the next
                        code[i - 1] = `${code[i - 1]}<span class="${eClass} ${eClass}Cnt${syncCnt}">`;
                        syncCnt++;
                        code[i + 1] = `</span>${code[i + 1]}`;
                    }
                } else {
                    code[i - 1] = `${code[i - 1]}<span class="${eClass} ${eClass}Cnt${syncCnt}">`;
                    syncCnt++;
                    code[endBlock + 1] = `</span>${code[endBlock + 1]}`;
                }
            }
        } else {
            lastSync = sync[i];
        }
    }
    return { type: type, code: code, syncCnt };
};

eTemplate.prototype.getTitle = function (currentHTML) {
    const headRegexp = /<head>(.|[\t\n\r])*?<\/head>/g;
    const titleRegexp = /<title>(.|[\t\n\r])*?<\/title>/g;
    const headHTML = currentHTML.match(headRegexp)[0];
    const titleCode = headHTML.match(titleRegexp)[0].replace('<title>', '').replace('</title>', '').trim();
    this.titleCode = (titleCode.length > 0) ? titleCode : this.titleCode;
}

eTemplate.prototype.changeTitle = function () {
    const regexText = `${this.openDelimiter}[^%].*?${this.closeDelimiter}`;
    const templateRegex = new RegExp(regexText, 'g');
    // interpret template of title
    let titleCode = null;
    if (this.titleCode.trim().match(templateRegex) != null) {
        titleCode = this.titleCode.trim().match(templateRegex)[0].replaceAll(`${this.openDelimiter}`, '').replaceAll(`${this.closeDelimiter}`, '');
    }
    let titleResult = "";
    if (titleCode != null) {
        titleResult = this.basicCode(titleCode);
        document.head.querySelector("title").innerText = titleResult;
    }
}

eTemplate.prototype.changeCss = async function (newHTML) {
    // combine css in style tag and linked css
    let combinedStyle = await this.combineCss(newHTML);
    // seperate style text to template and others
    let tempCode = this.seperateCode(combinedStyle, "second");
    this.cssCode = tempCode.code;
    this.cssType = tempCode.type;
    // interpret templates
    let cssBlock = this.interpret(tempCode.type, tempCode.code);
    combinedStyle = cssBlock.join("");
    // parse css string
    let cssRules = this.parseCSS(combinedStyle);
    this.cssRules = cssRules;
    const modifiedCss = this.createTextStyle(cssRules);
    if (modifiedCss == "") return;
    // remove all style tags
    document.querySelectorAll("style").forEach(style => { style.parentNode.removeChild(style); });
    // create and append all combined CSS
    let t_style = document.createElement("style");
    t_style.appendChild(document.createTextNode(modifiedCss));
    document.head.appendChild(t_style);
    // remove CSS link except linked CSS from other server
    document.head.querySelectorAll("link").forEach((element) => {
        if (element.getAttribute("rel") == "stylesheet" && !element.getAttribute("href").includes('http')) {
            element.parentNode.removeChild(element);
        }
    });
};

eTemplate.prototype.combineCss = async function (newHTML) {
    // declare variables
    const linkregexp = /<link.*?(rel=("|')stylesheet("|')).*?>/gi;
    const styleregexp = /<style>(.|[\t\n\r])*?<.style>/gi;
    const getHref = (str) => { return str.match(/href=".*?"/gi)[0].replaceAll('href=', '').replaceAll('"', ''); }
    let urls = [];
    let styleBlock = [];

    // if there is no head tag to parse
    let startPos = newHTML.indexOf("<head>");
    let endPos = newHTML.indexOf("</head>");
    if (startPos == -1 || endPos == -1) { return ""; } // if there is no head tag to parse
    // get CSS in style tag
    newHTML.replace(styleregexp, function (match) {
        styleBlock.push(match.replaceAll('<style>', '').replaceAll('</style>', ''));
        return '';
    });
    let combinedStyle = styleBlock.join('');
    // get urls of linked css files
    let linkTags = [];
    newHTML.replace(linkregexp, function (match) { linkTags.push(match); return ''; });
    let relUrl = this.currentUrl().host;

    linkTags.forEach(linkTag => {
        let linkHref = getHref(linkTag);
        if (!linkHref.includes('http')) { urls.push(relUrl + linkHref); }
    });
    // read and combine css files
    let importedStyles = await this.getTextFromFiles(urls);
    combinedStyle = importedStyles.reduce((acc, style) => { return acc + style }, combinedStyle)
    combinedStyle = await this.insertNestedCSS(combinedStyle);
    return combinedStyle;
}

eTemplate.prototype.insertNestedCSS = async function (styleText) {
    let finalCSS = "";
    // get urls of css to import, where to insert, seperated css array
    let { urls, order, codeList } = this.findImport(styleText);
    if (urls.length == 0) { // if there is no @import at all
        finalCSS = codeList.join("");
        return finalCSS;
    }
    let insertedCSSs = await this.getTextFromFiles(urls);
    // insert CSS of files into each @import
    insertedCSSs.forEach((insertedCSS, i) => { codeList[order[i]] = insertedCSS; });
    // new CSS with imported CSS
    finalCSS = codeList.join("");
    // find further nested @import
    ({ urls, order, codeList } = this.findImport(finalCSS));
    if (urls.length != 0) {
        // recursively insert css from imported css files
        finalCSS = await this.insertNestedCSS(finalCSS);
        return finalCSS;
    } else {
        // if there is no more @import...
        return finalCSS;
    }
}

eTemplate.prototype.findImport = function (styleText) {
    // declare variables
    let importArray = []; // only @import in CSS
    let urls = []; // url for inclusion
    let order = []; // index of @import out of array
    let tempString = "";
    let cnt = 0;
    const importRegex = /@import *["|'].*?["|'];/g;
    // categorize CSS to @IMPORT and OTHER
    let styleCode = this.seperateImport(styleText);
    // only @import to includeArray
    for (let i = 0; i < styleCode.type.length; i++) {
        if (styleCode.type[i] == "IMPORT" && styleCode.code[i].search(importRegex) != -1) {
            importArray.push(styleCode.code[i]);
            order[cnt] = i;
            cnt++;
        }
    }
    // if @import exists, get pathname from CSS
    if (importArray.length != 0) {
        importArray.forEach((script) => {
            tempString = script.match(importRegex)[0].replaceAll('@import', '').replaceAll('"', '').replaceAll(';', '\n').trim();
            tempString = (tempString.substring(0, 1) == "/") ? tempString.substring(1) : tempString;
            tempString = (tempString.substring(0, 2) == "./") ? tempString.substring(2) : tempString;
            urls.push(this.currentUrl().host + tempString);
        });
    }
    return {
        urls: urls,
        order: order,
        codeList: styleCode.code
    };
};

eTemplate.prototype.seperateImport = function (styleText) {
    // seperate @import and other css to types and codes
    const importRegex = /(@import *["|'].*?["|'];)/g;
    let codes = styleText.split(importRegex);
    let types = [];
    codes.forEach((code, index) => {
        let type = code.includes('@import') ? "IMPORT" : "OTHER";
        types.push(type);
        codes[index] = code.includes('@import') ? code.trim() : this.removeControlText(code).trim();
    });
    return { type: types, code: codes };
}

eTemplate.prototype.createTextStyle = function (cssRules) {
    let modifiedCss = '';
    // clone cssRules
    let tempRules = JSON.parse(JSON.stringify(cssRules));
    // create style text from cssRules object
    tempRules.forEach(cssRule => {
        let cssType = cssRule.type == undefined ? "" : cssRule.type;
        switch (cssType) {
            case "":
            case "font-face":
                modifiedCss = modifiedCss + cssRule.selector + " {\n";
                cssRule.rules.forEach(rule => {
                    modifiedCss = modifiedCss + `    ${rule.key}: ${rule.value};\n`;
                });
                modifiedCss = modifiedCss + "}\n";
                break;
            case "imports":
            case "keyframes":
                modifiedCss = modifiedCss + cssRule.styles.replaceAll('{', '{\n').replaceAll('}', '}\n').replaceAll(';', ';\n') + "\n";
                break;
            case "supports":
            case "media":
                modifiedCss = modifiedCss + cssRule.selector + " {\n";
                cssRule.subStyles.forEach(subStyle => {
                    modifiedCss = modifiedCss + "    " + subStyle.selector + " {\n";
                    subStyle.rules.forEach(rule => {
                        modifiedCss = modifiedCss + `        ${rule.key}: ${rule.value};\n`;
                    });
                    modifiedCss = modifiedCss + "    }\n";
                });
                modifiedCss = modifiedCss + "}\n";
                break;
        }
    });
    return modifiedCss;
}

eTemplate.prototype.basicCode = function (script) {
    try {
        return Function(`"use strict"; return ( ${script.substring(1)} )`)();
    } catch (e) {
        return `${e.message}`;
    }
};

eTemplate.prototype.controlCode = function (script) {
    try {
        return Function(`"use strict"; ${script.replace(/[\n\r\t]/g, "")}`)();
    } catch (e) {
        return `invalid template block`;
    }
};

// partial render for data object or files
eTemplate.prototype.renderPart = async function (dataText = "", type = "") {
    let source = '';
    let result = '';
    let path = '';
    let tempCode = [];
    let sync = [];
    let returnValue = '';
    let combinedStyle = '';
    let cssBlock = [];
    let cssRules = [];
    let modifiedCss = '';

    if (type.trim() == "") return "select type from html, html_path";
    if (dataText.trim() == "") return "nothing to render";

    switch (type) {
        case "html":
            source = dataText;
            tempCode = this.seperateCode(source, "second");
            sync = this.makeSyncBlock(tempCode.type, tempCode.code);
            if (tempCode.type[0] == "JS") {
                tempCode.type.unshift("HTML");
                tempCode.code.unshift(" ");
                sync = sync.map(x => x + 1);
                sync.unshift(0);
            }
            tempCode = this.insertSync(tempCode.type, tempCode.code, sync);
            result = this.interpret(tempCode.type, tempCode.code);
            returnValue = result.join('');
            return { domText: returnValue, sourceType: tempCode.type, sourceCode: tempCode.code, sourceSync: sync };
        case "html_path":
            path = this.currentUrl().host + dataText;
            try {
                const response = await fetch(path);
                source = await response.text();
            }
            catch (e) {
                return "incorrect pathname";
            }
            tempCode = this.seperateCode(source, "second");
            sync = this.makeSyncBlock(tempCode.type, tempCode.code);
            if (tempCode.type[0] == "JS") {
                tempCode.type.unshift("HTML");
                tempCode.code.unshift(" ");
                sync = sync.map(x => x + 1);
                sync.unshift(0);
            }
            tempCode = this.insertSync(tempCode.type, tempCode.code, sync);
            result = this.interpret(tempCode.type, tempCode.code);
            returnValue = result.join('');
            return { domText: returnValue, sourceType: tempCode.type, sourceCode: tempCode.code, sourceSync: sync };
        case "css":
            source = dataText;
            source = await this.insertNestedCSS(source);
            // seperate style text to template and others
            tempCode = this.seperateCode(source, "second");
            // interpret templates
            cssBlock = this.interpret(tempCode.type, tempCode.code);
            combinedStyle = cssBlock.join("");
            // parse css string
            cssRules = this.parseCSS(combinedStyle);
            modifiedCss = this.createTextStyle(cssRules);
            return modifiedCss;
        case "css_path":
            path = this.currentUrl().host + dataText;
            try {
                const response = await fetch(path);
                source = await response.text();
            }
            catch (e) {
                return "incorrect pathname";
            }
            source = await this.insertNestedCSS(source);
            tempCode = this.seperateCode(source, "second");
            // interpret templates
            cssBlock = this.interpret(tempCode.type, tempCode.code);
            combinedStyle = cssBlock.join("");
            // parse css string
            cssRules = this.parseCSS(combinedStyle);
            modifiedCss = this.createTextStyle(cssRules);
            return modifiedCss;
    }
}

eTemplate.prototype.appendHtml = function (obj = {}, element) {
    let domText = obj.domText || "";
    if (element == undefined) return "no element to append to";
    const tempType = obj.sourceType || [];
    const tempCode = obj.sourceCode || [];
    const tempSync = obj.sourceSync || [];
    if (this.getObjectType(element) != "DOMobject") { return "invalid object to append to"; }
    if (tempType.length == 0) return "nothing to append";
    // adding template information for sync
    this.htmlType = [ ...this.htmlType, ...tempType];
    this.htmlCode = [ ...this.htmlCode, ...tempCode];
    this.htmlSync = [ ...this.htmlSync, ...tempSync];
    // appending interpreted html to element
    domText = domText.trim();
    if (domText == "") return "nothing to append";
    element.insertAdjacentHTML('beforeend', domText);
}

eTemplate.prototype.appendCss = function (modfiedCss) {
    let styleElement;
    if (document.querySelector('style') == null) {
        styleElement = document.createElement("style");
        styleElement.appendChild(document.createTextNode(modfiedCss));
        document.head.appendChild(styleElement);
        return;
    }
    styleElement = document.createTextNode(modfiedCss);
    document.querySelector('style').appendChild(styleElement);

}

eTemplate.prototype.currentUrl = function () {
    let fullUrl = window.location.href;
    let urlHash = window.location.hash;
    fullUrl = fullUrl.replace(urlHash, "");
    let fileName = fullUrl.split("/").pop();
    let host = fullUrl.substring(0, fullUrl.length - fileName.length); // host + path (without filename)
    if (urlHash != "") fileName = urlHash.substring(1) + ".html";
    return { host: host, filename: fileName };
};

eTemplate.prototype.getTextFromFiles = async (urls) => {
    if (urls.length == 0) return [];
    let requests = urls.map((url) => fetch(url));
    let responses = await Promise.all(requests);
    let errors = responses.filter((response) => !response.ok);
    if (errors.length > 0) { throw errors.map((response) => Error(response.statusText)); }
    let responseTexts = responses.map((response) => response.text());
    let insertedTexts = await Promise.all(responseTexts);
    return insertedTexts;
}

// check object type for renderPart()
eTemplate.prototype.getObjectType = (o) => {
    if (typeof HTMLElement === "object" ? o instanceof HTMLElement : o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string") { return "DOMobject"; } else { return (o.includes('<%') && o.includes('%>')) ? "template" : o.includes('.html') ? "html_path" : o.includes('.css') ? "css_path" : "undefined"; }
}

// replace filename with current page's hash
eTemplate.prototype.hashtofilename = function (fileName) {
    let hash = window.location.hash;
    if (hash != "" && fileName == "") {
        fileName = hash.substring(1) + ".html";
    } // if hash exist, it's filename
    return fileName;
};

eTemplate.prototype.removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

eTemplate.prototype.parseCSS = function (source) {
    if (source === undefined) return [];
    let commentRegex = /\/\*.*?\*\//gi;
    let importsRegex = /@import .*?\(.*?\);/gi;
    let keyframesRegex = /((@keyframes [\s\S]*?){([\s\S]*?}\s*?)})/gi;
    let generalRegex = /((\s*?(?:\/\*[\s\S]*?\*\/)?\s*?(@media|@supports)[\s\S]*?){([\s\S]*?)}\s*?})|(([\s\S]*?){([\s\S]*?)})/gi;
    let css = [];
    // remove comments
    source = source.replace(commentRegex, "");
    //get import
    let imports = [...source.matchAll(importsRegex)];
    imports.forEach(imported => {
        css.push({ selector: "@imports", type: "imports", styles: imported[0] });
    });
    source = source.replace(importsRegex, "");
    // get keyframes
    let keyframes = [...source.matchAll(keyframesRegex)];
    keyframes.forEach(keyframe => {
        css.push({ selector: "@keyframes", type: "keyframes", styles: keyframe[0] });
    });
    source = source.replace(keyframesRegex, "");
    // get general rules
    let generalRules = [...source.matchAll(generalRegex)];
    generalRules.forEach(generalRule => {
        let selector = (generalRule[2] === undefined) ? generalRule[6] : generalRule[2];
        selector = selector.split("\r\n").join("\n").trim().replace(/\n+/, "\n");
        let type = selector.includes("@media") ? "media" : selector.includes("@supports") ? "supports" : selector === "@font-face" ? "font-face" : "";
        let cssObject = { selector: selector, type: type };
        if (type === "media" || type === "supports") {
            cssObject.subStyles = this.parseCSS(generalRule[4] + "\n}");
        } else {
            cssObject.rules = this.parseRules(generalRule[7]);
        }
        css.push(cssObject);
    });
    return css;
};

eTemplate.prototype.parseRules = function (rules) {
    let ret = [];
    rules = rules.split("\r\n").join("\n");
    rules = rules.split(";");
    rules.forEach(line => {
        line = line.trim();
        if (line.includes(":")) {
            line = line.split(":");
            let cssKey = line[0].trim();
            let cssValue = line.slice(1).join(":").trim();
            if (cssKey.length > 0 && cssValue.length > 0) ret.push({ key: cssKey, value: cssValue });
        } else {
            if (line.trim().substr(0, 7) === "base64,") {
                ret[ret.length - 1].value += line.trim();
            } else {
                if (line.length > 0) {
                    ret.push({
                        key: "",
                        value: line,
                        defective: true,
                    });
                }
            }
        }
    });
    return ret;
};

eTemplate.prototype.arrayFind = function (arr1, arr2) {
    let hash = {};
    arr1.map((val, index) => hash[val] = index);
    if (hash.hasOwnProperty(arr2)) return hash[arr2];
    return -1;
}

eTemplate.prototype.escapeHtml = function (str) {
    let map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;', "(": "&#40;", ")": "&#41;" };
    return str.replace(/[&<>"'()]/g, function (m) { return map[m]; });
}

eTemplate.prototype.removeControlText = function (str) {
    return str.replaceAll(/\r|\n|\t/g, "");
}

// mouse is on inside or outside of document
document.onmouseover = function () {
    window.innerDocClick = true;
};
document.onmouseleave = function () {
    window.innerDocClick = false;
};