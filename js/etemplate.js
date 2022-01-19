const eTemplate = function () {
    this.sync_type = [];
    this.sync_code = [];
    this.sync_block = [];
    this.cssRules = [];
    this.tRulePos = [];
    this.tSubRulePos = [];
    this.tStylePos = [];
    this.eTem = {};
    this.syncCnt=0;
};

eTemplate.prototype.render = async function (dataobj) {
    // arguments
    this.syncCnt=0;
    dataobj = dataobj || {};
    let filename = dataobj.sync_url || "";
    let scrollobj = dataobj.scrollto || "";
    let iscope = dataobj.iscope || "";
    this.eTem["sync_url"] = filename;
    this.eTem["start_url"] = dataobj.start_url || "";
    this.eTem["sync_class"] = dataobj.sync_class || "et_sync";
    // default: myUrl from current filename
    let myUrl = this.currentUrl().host + this.currentUrl().filename;
    // if hash exists, replace filename with hash
    filename = this.hashtofilename(filename);
    filename = (filename == "" && this.eTem.start_url != "") ? this.eTem.start_url : filename;
    myUrl = (filename != "") ? this.currentUrl().host + filename : myUrl;

    this.myUrl = myUrl;
    //  read first layer HTML
    const response = await fetch(myUrl);
    const currentHTML = await response.text();
    // read second layer and proceed
    const result = await this.getGoing(currentHTML, iscope);
    this.removeAllChildNodes(document.querySelector('body'));
    document.body.insertAdjacentHTML('afterbegin', result.htmlBlock.join(""));

    // scroll to element of ID
    if (scrollobj != "" && Object.keys(scrollobj).length != 0) {
        document.getElementById(scrollobj.id).scrollIntoView({ block: scrollobj.block });
    }
    // variables for sync()
    this.sync_code = result.t_code.code;
    this.sync_type = result.t_code.type;

    if (typeof addListener === "function") addListener(filename);
    document.body.style.display = "block";
    return new Promise((resolve, reject) => {
        resolve("done");
    });
};

// second and third layer - read and process
eTemplate.prototype.getGoing = async function (currentHTML, iscope) {
    // declare variables
    let finalHTML = "";
    // CSS change in HEAD
    if (iscope != 'body') { await this.changeCss(currentHTML); }
    // change title
    this.changeTitle();
    // find the second level include() and urls
    let scripts = this.findInclude(currentHTML);
    let urls = scripts.urls; // urls to find
    let order = scripts.order; // where to insert
    let t_code = scripts.t_code; // seperated code
    // read files to be included
    if (urls.length != 0) {
        let requests = urls.map((url) => fetch(url));
        let responses = await Promise.all(requests);
        let errors = responses.filter((response) => !response.ok);
        if (errors.length > 0) { throw errors.map((response) => Error(response.statusText)); }
        let text = responses.map((response) => response.text());
        let promise_data = await Promise.all(text);
        // insert HTML of files into each include() script
        promise_data.forEach((datum, i) => { t_code[order[i]] = datum; });
        // new HTML with included HTML
        let secondHTML = t_code.join("");
        // find the third level include() and urls in included HTML
        scripts = this.findInclude(secondHTML);
        urls = scripts.urls;
        order = scripts.order;
        t_code = scripts.t_code;
        if (urls.length != 0) {
            requests = urls.map((url) => fetch(url));
            responses = await Promise.all(requests);
            errors = responses.filter((response) => !response.ok);
            if (errors.length > 0) throw errors.map((response) => Error(response.statusText));
            text = responses.map((response) => response.text());
            promise_data = await Promise.all(text);
            promise_data.forEach((datum, i) => { t_code[order[i]] = datum; });
            // the third level HTML included into final HTML
            finalHTML = t_code.join("");
        } else {
            // if there is no third level HTML
            finalHTML = secondHTML;
        }
    } else {
        // if there is no second level HTML
        finalHTML = t_code.join("");
    }
    // categorize codes
    t_code = this.seperateCode(finalHTML, "second");
    // make code blocks like for, if...
    let sync = this.makeSyncBlock(t_code.type, t_code.code);
    // add "HTML" if first code="JS"
    if (t_code.type[0] == "JS") {
        t_code.type.unshift("HTML");
        t_code.code.unshift(" ");
        sync=sync.map(x => x + 1);
        sync.unshift(0);
    }
    // insert bookmark to be refreshed at
    t_code = this.insertSync(t_code.type, t_code.code, sync);
    this.sync_block=sync;
    this.syncCnt=t_code.syncCnt;
    // interprete template scripts
    let htmlBlock = this.interpret(t_code.type, t_code.code);
    return new Promise((resolve, reject) => {
        resolve({ htmlBlock, t_code });
    });
};

eTemplate.prototype.renderPart = async function (dataobj, type) {
    let source = '';
    let result = '';
    let path = '';
    let t_code = [];
    let sync = [];
    let returnValue = '';
    let cssRules=[];
    let resultObj;
    let modifiedCss='';
    dataobj=dataobj || "";
    type=type || "";
    if (type.trim()=="") return "select type from html,css, html_path, css-path";
    if (dataobj.trim()=="") return "nothing to render";

    switch (type) {
        case "html":
            source = dataobj;
            t_code = this.seperateCode(source, "second");
            sync = this.makeSyncBlock(t_code.type, t_code.code);
            if (t_code.type[0] == "JS") {
                t_code.type.unshift("HTML");
                t_code.code.unshift(" ");
                sync=sync.map(x => x + 1);
                sync.unshift(0);
            }
            t_code = this.insertSync(t_code.type, t_code.code, sync);
            result = this.interpret(t_code.type, t_code.code);
            returnValue = result.join('');
            return { domText: returnValue, sourceType: t_code.type, sourceCode: t_code.code, sourceSync: sync };
        case "css":
            source = dataobj;
            cssRules = this.parseCSS(source);
            resultObj = this.interpretCss(cssRules)
            modifiedCss = resultObj.modifiedCss;
            return { cssText: modifiedCss, cssRules: cssRules, tRulePos: resultObj.tRulePos, tStylePos: resultObj.tStylePos, tSubRulePos: resultObj.tSubRulePos };
        case "html_path":
            path = window.location.host + dataobj;
            try {
                const response = await fetch(path);
                source = await response.text();
            }
            catch (e) {
                return "wrong pathname";
            }
            t_code = this.seperateCode(source, "second");
            sync = this.makeSyncBlock(t_code.type, t_code.code);
            if (t_code.type[0] == "JS") {
                t_code.type.unshift("HTML");
                t_code.code.unshift(" ");
                sync=sync.map(x => x + 1);
                sync.unshift(0);
            }
            t_code = this.insertSync(t_code.type, t_code.code, sync);
            result = this.interpret(t_code.type, t_code.code);
            returnValue = result.join('');
            return { domText: returnValue, sourceType: t_code.type, sourceCode: t_code.code, sourceSync: sync };            
        case "css_path":
            path = window.location.host + dataobj;
            try {
                const response = await fetch(path);
                source = await response.text();
            }
            catch (e) {
                return "wrong pathname";
            }
            cssRules = this.parseCSS(source);
            resultObj = this.interpretCss(cssRules)
            modifiedCss = resultObj.modifiedCss;
            return { cssText: modifiedCss, cssRules: cssRules, tRulePos: resultObj.tRulePos, tStylePos: resultObj.tStylePos, tSubRulePos: resultObj.tSubRulePos };
    }
}

eTemplate.prototype.appendHtml = function (obj, element) {
    obj=obj || {};
    let domText=obj.domText || "";
    if (element==undefined) { return "nowhere to append";}
    const t_type=obj.sourceType || [];
    const t_code=obj.sourceCode || [];
    const t_sync=obj.sourceSync || [];
    if (this.getObjectType(element)!="DOMobject") { return "nothing to append"; }
    if (t_type.length==0) { return "nothing to append"; }
    // adding template information for sync
    this.sync_type=this.sync_type.concat(t_type);
    this.sync_code=this.sync_code.concat(t_code);
    this.sync_block=this.sync_block.concat(t_sync);
    // appending interpreted html to element
    if (domText.trim()=="") { return "nothing to append"; }
    domText = domText.trim();
    element.insertAdjacentHTML('beforeend', domText);
}

eTemplate.prototype.appendCss = function (obj) {
    obj=obj || {};
    const cssText=obj.cssText || "";
    const cssRules=obj.cssRules || [];
    const tRulePos=obj.tRulePos || [];
    const tStylePos=obj.tStylePos || [];
    const tSubRulePos=obj.tSubRulePos || [];
    let lastRule=this.tRulePos[tRulePos.length-1];
    // adding css rules for sync
    cssRules.forEach(cssRule => { cssRule+=(lastRule+1); });
    this.cssRules=this.cssRules.concat(cssRules);
    this.tRulePos=this.tRulePos.concat(tRulePos);
    this.tStylePos=this.tStylePos.concat(tStylePos);
    this.tSubRulePos=this.tSubRulePos.concat(tSubRulePos);
    // applying css to document
    this.syncCss();
}

eTemplate.prototype.changeTitle = function () {
    // interpret template of title
    let titleCode=null;
    if ( document.querySelector("title").innerText.trim().match(/<%.*?%>/g)!=null) {
        titleCode = document.querySelector("title").innerText.trim().match(/<%.*?%>/g)[0].replaceAll('<%','').replaceAll('%>','');
    }
    let titleResult = "";
    if (titleCode != null) {
        titleResult = this.basicCode(titleCode);
        document.head.querySelector("title").innerText = titleResult;
    }
}

eTemplate.prototype.combineCss = async function (newHTML) {
    // declare variables
    let combinedStyle = '';
    let urls = [];
    const linkregexp = /<link.*?(rel=("|')stylesheet("|')).*?>/gi;
    const styleregexp = /<style>(.|[\t\n\r])*?<.style>/gi;

    if (this.eTem.sync_url == "") {
        // get styles of current html
        if (document.querySelector('head').innerHTML.trim() == '') { return ""; } // if there is no head tag to parse
        let styleTags = document.querySelectorAll('head style');
        for (let i = 0; i < styleTags.length; i++) {
            combinedStyle += styleTags[i].innerHTML;
        }
        let stylelinks = document.querySelectorAll('link[rel="stylesheet"]');
        // check external css
        stylelinks.forEach(stylelink => {
            let linkhref=stylelink.outerHTML;
            let start_pos=linkhref.indexOf('href="')+6;
            let end_pos=linkhref.indexOf('"',start_pos);
            linkhref=linkhref.substring(start_pos, end_pos);
            if (!linkhref.includes('http')) { urls.push(stylelink.href); }
        });
    } else {
        // extract head scripts from current HTML
        let start_pos = newHTML.indexOf("<head>");
        let end_pos = newHTML.indexOf("</head>");
        if (start_pos == -1 || end_pos == -1) { return ""; } // if there is no head tage to parse
        let newHeadHTML = newHTML.substring(start_pos + 6, end_pos);
        // change title with title from a new file
        let targetTitle = newHeadHTML.querySelector("title").innerText;
        let currentTitle = document.querySelector("title").innerText;
        if (targetTitle != currentTitle) document.querySelector("title").innerText = targetTitle;
        // get urls of css files
        let linkTags = [];
        newHeadHTML.replace(linkregexp, function (match) { linkTags.push(match); return ''; });
        let filename = this.myUrl.split('/').pop();
        let relUrl = this.myUrl.substring(0, this.myUrl.length - filename.length);
        linkTags.forEach(linkTag => {
            urls.push(relUrl + linkTag.match(/href=".*?"/gi).replaceAll('href=','').replaceAll('"',''));
        });
        let styleBlock = [];
        newHeadHTML.replace(styleregexp, function (match) { 
            styleBlock.push(match.replaceAll('<style>','').replaceAll('</style>',''));
            return '';
        });
        combinedStyle = styleBlock.join('');
    }

    // read css files
    if (urls.length != 0) {
        let requests = urls.map((url) => fetch(url));
        let responses = await Promise.all(requests);
        errors = responses.filter((response) => !response.ok);
        if (errors.length > 0) throw errors.map((response) => Error(response.statusText));
        let texts = responses.map((response) => response.text());
        let importedStyles = await Promise.all(texts);
        importedStyles.forEach(style => {
            combinedStyle += style;
        });
    }

    return combinedStyle;
}

eTemplate.prototype.interpretCss = function (cssRules) {
    let tRulePos = [];
    let tSubRulePos = [];
    let tStylePos = [];
    let temp_str = '';
    let modifiedCss = '';
    let t_code=[];
    let css_block=[];
    
    // find template position
    for (let i = 0; i < cssRules.length; i++) {
        let cssRule = cssRules[i];
        let cssType = cssRule.type == undefined ? "" : cssRule.type;
        switch (cssType) {
            case "":
            case "font-face":
                for (let j = 0; j < cssRule.rules.length; j++) {
                    if (cssRule.rules[j].value.indexOf("<%") > -1) {
                        tRulePos.push(i);
                        tSubRulePos.push(-1);
                        tStylePos.push(j);
                    }
                }
                break;
            case "imports":
            case "keyframes":
                if (cssRule.styles.indexOf("<%") > -1) {
                    tRulePos.push(i);
                    tSubRulePos.push(-2);
                    tStylePos.push(0);
                }
                break;
            case "media":
                for (let j = 0; j < cssRule.subStyles.length; j++) {
                    let subStyle = cssRule.subStyles[j];
                    for (let k = 0; k < subStyle.rules.length; k++) {
                        if (subStyle.rules[k].value.indexOf("<%") > -1) {
                            tRulePos.push(i);
                            tSubRulePos.push(j);
                            tStylePos.push(k);
                        }
                    }
                }
                break;
        }
    }
    // find template position - end

    if (tRulePos.length > 0) {
        // change teplates;
        let tempRules = JSON.parse(JSON.stringify(cssRules));
        for (i = 0; i < tRulePos.length; i++) {
            if (tSubRulePos[i] == -1) {
                //  font-face or general
                temp_str = tempRules[tRulePos[i]].rules[tStylePos[i]].value;
                t_code = this.seperateCode(temp_str, "second");
                css_block = this.interpret(t_code.type, t_code.code);
                temp_str = css_block.join("");
                tempRules[tRulePos[i]].rules[tStylePos[i]].value = temp_str;
            } else if (tSubRulePos[i] == -2) {
                // imports or keyframes - part of style is template
                temp_str = tempRules[tRulePos[i]].styles;
                t_code = this.seperateCode(temp_str, "second");
                css_block = this.interpret(t_code.type, t_code.code);
                temp_str = css_block.join("");
                tempRules[tRulePos[i]].styles = temp_str;
            } else {
                // media
                temp_str = tempRules[tRulePos[i]].subStyles[tSubRulePos[i]].rules[tStylePos[i]].value;
                t_code= this.seperateCode(temp_str, "second");
                css_block = this.interpret(t_code.type, t_code.code);
                temp_str = css_block.join("");
                tempRules[tRulePos[i]].subStyles[tSubRulePos[i]].rules[tStylePos[i]].value = temp_str;
            }
        }

        // create modified CSS
        for (let i = 0; i < tempRules.length; i++) {
            let cssRule = tempRules[i];
            let cssType = cssRule.type == undefined ? "" : cssRule.type;
            switch (cssType) {
                case "":
                case "font-face":
                    modifiedCss = modifiedCss + cssRule.selector + " {\n";
                    for (let j = 0; j < cssRule.rules.length; j++) {
                        modifiedCss = modifiedCss + `    ${cssRule.rules[j].key}: ${cssRule.rules[j].value};\n`;
                    }
                    modifiedCss = modifiedCss + "}\n";
                    break;
                case "imports":
                case "keyframes":
                    modifiedCss = modifiedCss + cssRule.styles + "\n";
                    break;
                case "media":
                    modifiedCss = modifiedCss + cssRule.selector + " {\n";
                    for (let j = 0; j < cssRule.subStyles.length; j++) {
                        let subStyle = cssRule.subStyles[j];
                        modifiedCss = modifiedCss + "    " + subStyle.selector + " {\n";
                        for (let k = 0; k < subStyle.rules.length; k++) {
                            modifiedCss = modifiedCss + `        ${subStyle.rules[k].key}: ${subStyle.rules[k].value};\n`;
                        }
                        modifiedCss = modifiedCss + "    }\n";
                    }
                    modifiedCss = modifiedCss + "}\n";
                    break;
            }
        }
    }
    return { modifiedCss: modifiedCss, tRulePos: tRulePos, tSubRulePos: tSubRulePos, tStylePos: tStylePos };
}

eTemplate.prototype.changeCss = async function (newHTML) {
    let combinedStyle = await this.combineCss(newHTML);
    // parse css string
    let cssRules = this.parseCSS(combinedStyle);
    let resultObj = this.interpretCss(cssRules)
    const modifiedCss = resultObj.modifiedCss;
    this.cssRules = cssRules;
    this.tRulePos = resultObj.tRulePos;
    this.tSubRulePos = resultObj.tSubRulePos;
    this.tStylePos = resultObj.tStylePos;

    if (modifiedCss != "") {
        // remove all style tags
        document.querySelectorAll("style").forEach(style => { style.parentNode.removeChild(style); });
        // create and append all combined tags
        t_style = document.createElement("style");
        t_style.appendChild(document.createTextNode(modifiedCss));
        document.head.appendChild(t_style);
        // remove CSS link
        document.head.querySelectorAll("link").forEach((element) => {
            if (element.getAttribute("rel") == "stylesheet") { element.parentNode.removeChild(element); }
        });
    }
};

eTemplate.prototype.syncCss = function () {
    let temp_dir = "";
    let temp_str = "";
    let temp_code = "";
    let t_code = [];
    let css_block = [];

    // css change
    for (i = 0; i < this.tRulePos.length; i++) {
        if (this.tSubRulePos[i] == -1) {
            //  font-face or general
            temp_str = this.cssRules[this.tRulePos[i]].rules[this.tStylePos[i]].value;
            temp_dir = this.cssRules[this.tRulePos[i]].rules[this.tStylePos[i]].key;
            t_code = this.seperateCode(temp_str, "second");
            css_block = this.interpret(t_code.type, t_code.code);
            temp_code = css_block.join("");
            document.styleSheets[0].cssRules[this.tRulePos[i]].style.setProperty(temp_dir, temp_code);
        } else if (this.tSubRulePos[i] == -2) {
            // imports or keyframes - part of style is template
            temp_str = this.cssRules[this.tRulePos[i]].styles;
            t_code = this.seperateCode(temp_str, "second");
            css_block = this.interpret(t_code.type, t_code.code);
            temp_str = css_block.join("");
            document.styleSheets[0].deleteRule(this.tRulePos[i]);
            document.styleSheets[0].insertRule(temp_str, this.tRulePos[i]);
        } else {
            // media
            temp_str = this.cssRules[this.tRulePos[i]].subStyles[this.tSubRulePos[i]].rules[this.tStylePos[i]].value;
            temp_dir = this.cssRules[this.tRulePos[i]].subStyles[this.tSubRulePos[i]].rules[this.tStylePos[i]].key;
            t_code = this.seperateCode(temp_str, "second");
            css_block = this.interpret(t_code.type, t_code.code);
            temp_code = css_block.join("");
            document.styleSheets[0].cssRules[this.tRulePos[i]].cssRules[this.tSubRulePos[i]].style.setProperty(temp_dir, temp_code);
        }
    }
};

eTemplate.prototype.sync = function (iscope) {
    let temp = "";
    let eClass = this.eTem.sync_class;
    // check and change title
    this.changeTitle();
    // put values of input tags to related variables
    document.querySelectorAll(`.${eClass}`).forEach((cList) => {
        temp = "";
        if (cList.nodeName == "INPUT") {
            temp = cList.getAttribute("data-sync");
            if (cList.type == "number") {
                temp += "=" + (cList.value ? cList.value.replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("(", "&#40;").replaceAll(")", "&#41;") : '""');
            } else {
                temp += "=" + (cList.value ? '"' + cList.value.replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("(", "&#40;").replaceAll(")", "&#41;") + '"' : '""');
            }
            try { temp_code = this.controlCode(temp); }
            catch (error) { return error; }
        }
    });
    // interprete registered templates
    let htmlBlock = this.interpretPart(this.sync_type, this.sync_code, eClass);
    // change current template to newly interpreted templates
    document.querySelectorAll(`.${eClass}`).forEach((cList) => {
        let classLists = cList.classList;
        let classAttr = '';
        let templateInAttribute = false;
        let index = 0;
        // get attribute to change from class
        classLists.forEach((classList) => {
            if (classList.includes(`${eClass}_`)) {
                templateInAttribute = true;
                classAttr = classList.split('_').pop();
            }
            if (classList.includes(`${eClass}Cnt`)) { index = parseInt(classList.replace(`${eClass}Cnt`, ''), 10); }
        });
        if (!templateInAttribute) {
            this.removeAllChildNodes(cList);
            cList.insertAdjacentHTML('afterbegin',htmlBlock[index]);            
        } else {
            cList.setAttribute(classAttr, htmlBlock[index]);
        }
    });
    if (typeof addListener === "function") { 
        let filename = this.hashtofilename();
        addListener(filename);
    }
    if (iscope != 'body') { this.syncCss(); }
};

eTemplate.prototype.findInclude = function (currentHTML) {
    // declare variables
    let b_list = []; // only JS script in body
    let urls = []; // url for inclusion
    let order = []; // index of include script out of code array
    let temp_string = "";
    let cnt = 0;
    let currentBodyHTML = "";
    // extract body scripts from current HTML
    let start_pos=currentHTML.indexOf("<body>");
    let end_pos=currentHTML.indexOf("</body>");
    if (start_pos==-1 || end_pos==-1) {
        currentBodyHTML = currentHTML;
    } else {
        currentBodyHTML = currentHTML.substring(start_pos+6, end_pos);
    }
    // categorize script to JS and HTML as they are
    let bodyCode = this.seperateCode(currentBodyHTML, "first");
    // only include() to b_list array
    for (i = 0; i < bodyCode.type.length; i++) {
        if (bodyCode.type[i] == "JS" && bodyCode.code[i].search(/include\(.*\)/g) != -1) {
            b_list.push(bodyCode.code[i]);
            order[cnt] = i;
            cnt++;
        }
    }

    // if include() exists, get urls from script
    if (b_list.length != 0) {
        b_list.forEach((script) => {
            if (script.includes("include(")) {
                start_pos=script.indexOf('include("');
                if (start_pos==-1) { 
                    start_pos=script.indexOf("include('")+9;
                } else start_pos=start_pos+9;
                end_pos=script.indexOf('")');
                if (end_pos==-1) {
                    end_pos=script.indexOf("')");
                }
                temp_string = script.substring(start_pos, end_pos);
                temp_string = (temp_string.substring(0, 1) == "/") ? temp_string.substring(1) : temp_string;
                temp_string = (temp_string.substring(0, 2) == "./") ? temp_string.substring(2) : temp_string;
                urls.push(this.currentUrl().host + temp_string);
            }
        });
    }
    return {
        urls: urls,
        order: order,
        t_code: bodyCode.code
    };
};

eTemplate.prototype.seperateCode = function (html, calltype) {
    const templateRegex=/(<%[^%].*?%>)/g;
    let codes=html.split(templateRegex);
    let types=[];
    codes.forEach((code, index)=>{
        let firstIndex=code.indexOf('<%');
        let lastIndex=code.indexOf('%>');
        if (firstIndex==0 && lastIndex==(code.length-2)) {
            types.push("JS");
            if (calltype=="second") { codes[index]=code.substring(2, code.length-2).trim(); } 
            else { codes[index]=code.trim(); }
        } else {
            types.push("HTML");
            codes[index]=code.replaceAll("\r", "").replaceAll("\n", "").replaceAll("\t", "").trim();
        }
    });
    return { type: types, code: codes };
}

eTemplate.prototype.interpret = function (t_type, t_code) {
    // declare variables
    let htmlBlock = [];
    let cnt = 0;

    while (cnt < t_code.length) {
        switch (t_type[cnt]) {
            // HTML, as it is
            case "HTML":
                htmlBlock.push(t_code[cnt].replaceAll("<%%", "&lt;%").replaceAll("%>", "%&gt;"));
                break;
            // JS
            case "JS":
                if (t_code[cnt].substring(0, 1) == "=") {
                    // sing line script
                    try {
                        htmlBlock.push(this.basicCode(t_code[cnt].substring(1)));
                    } catch (error) {
                        htmlBlock.push("invalid template");
                    }
                    break;
                } else if (t_code[cnt].substring(0, 1) == "-") {
                    // sing line script
                    try {
                        htmlBlock.push(this.basicCode(t_code[cnt].substring(1)));
                    } catch (error) {
                        htmlBlock.push("invalid template");
                    }
                    break;
                } else {
                    // multi line script block
                    let block_data = this.eachBlock(t_type, t_code, cnt);
                    cnt = block_data.index; // to next block
                    try {
                        htmlBlock.push(this.controlCode(block_data.partBlock));
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

eTemplate.prototype.interpretPart = function (t_type, t_code, eClass) {
    // declare variables
    let htmlBlock = [];
    let temp_string = "";
    let n_type = [];
    let n_code = [];
    let tags = [];
    let i = 0;
    let j = 0;
    let block_no = 0;
    let cnt = 0;

    for (i = 0; i < t_code.length; i++) {
        tags.length = 0;
        if (t_type[i] == "HTML") {
            j = 0;
            temp_string = "";
            tags = t_code[i].replaceAll("\r", "").replaceAll("\n", "").replaceAll("\t", "").split("<");
            tags.forEach((tag) => {
                if (tag.includes("class=") && tag.includes(eClass)) {
                    temp_string = tag.substring(0, tag.indexOf(" ")).trim();
                }
            });
            if (temp_string.length > 0) {
                block_no = this.sync_block[i + 1];
                for (j = i + 1; j < t_code.length; j++) {
                    if (this.sync_block[j] == block_no) {
                        n_type.push(t_type[j]);
                        n_code.push(t_code[j]);
                    } else {
                        break;
                    }
                }
            }
        }
    }

    while (cnt < n_code.length) {
        switch (n_type[cnt]) {
            // HTML, as it is
            case "HTML":
                htmlBlock.push(n_code[cnt].replaceAll("<%%", "&lt;%").replaceAll("%>", "%&gt;"));
                break;
            // JS
            case "JS":
                if (n_code[cnt].substring(0, 1) == "=") {
                    // single line script
                    try {
                        htmlBlock.push(this.basicCode(n_code[cnt].substring(1)));
                    } catch (error) {
                        htmlBlock.push("invalid template script");
                    }
                    break;
                } else if (n_code[cnt].substring(0, 1) == "-") {
                    try {
                        htmlBlock.push(this.basicCode(n_code[cnt].substring(1)));
                    } catch (error) {
                        htmlBlock.push("invalid template script");
                    }
                    break;
                } else {
                    // multi line script block
                    let block_data = this.eachBlock(n_type, n_code, cnt);
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

eTemplate.prototype.makeSyncBlock = function (t_type, t_code) {
    let sync=[];
    let cnt = 0;
    let index = 0;
    let brace_error = 0;

    for (i = 0; i < t_code.length; i++) {
        switch (t_type[i]) {
            // HTML, as it is
            case "HTML":
                sync.push(cnt);
                break;
            // JS
            case "JS":
                if (t_code[i].substring(0, 1) == "=" || t_code[i].substring(0, 1) == "-") {
                    // sing line script
                    sync.push(cnt);
                    break;
                } else {
                    // multi line script block
                    index = this.findBlockEnd(t_type, t_code, i).index;
                    brace_error = this.findBlockEnd(t_type, t_code, i).error;
                    if (brace_error < 0) {
                        console.log("ERROR: missing {");
                    } else if (brace_error > 0) {
                        console.log("ERROR: missing }");
                    }

                    for (j = 0; j < index - i + 1; j++) {
                        sync.push(cnt);
                    }
                    i = index; // to next block
                    break;
                }
        } // switch:end
        cnt++;
    } // for:end
    return sync;
};

eTemplate.prototype.findBlockEnd = function (t_type, t_code, i) {
    // multi line script block - change
    let braces_cnt = 0;
    for (j = i; j < t_code.length; j++) {
        // First part of block
        if (j == i) {
            if (t_type[j] == "JS") {
                if (t_code[j].includes("{")) braces_cnt++;
                if (t_code[j].includes("}")) braces_cnt--;
                if (braces_cnt == 0) return { index: j, error: 0 };
                continue;
            }
        }
        // additional blocks
        // HTML
        if (t_type[j] == "HTML") continue;
        // JS
        if (t_type[j] == "JS") {
            if (t_code[j].substring(0, 1) != "=" && t_code[j].substring(0, 1) != "-") {
                if (t_code[j].includes("{")) braces_cnt++;
                if (t_code[j].includes("}")) braces_cnt--;
                if (braces_cnt == 0) return { index: j, error: 0 };
            }
        }
    }
    if (braces_cnt != 0) return { index: i, error: braces_cnt };
    // if braces are not closed, change all the JS to HTML
    return { index: j, error: braces_cnt };
};

eTemplate.prototype.eachBlock = function (t_type, t_code, i) {
    // multi line script block - change
    let partBlock = "";
    let braces_cnt = 0;
    let j = 0;
    for (j = i; j < t_code.length; j++) {
        // First part of block
        if (j == i) {
            if (t_type[j] == "JS") {
                if (t_code[j].includes("{")) braces_cnt++;
                if (t_code[j].includes("}")) braces_cnt--;
                if (braces_cnt == 0) return { partBlock: t_code[j], index: j };
                partBlock = `let answer=''; ${t_code[j]}`;
                continue;
            } else {
                partBlock = `let answer='${t_code[j]}';`;
            }
        }
        // additional blocks
        // HTML
        if (t_type[j] == "HTML") {
            partBlock += `answer=answer+'${t_code[j]}';`;
            continue;
        }
        // JS
        if (t_type[j] == "JS") {
            if (t_code[j].substring(0, 1) == "=") {
                partBlock += `answer=answer+${t_code[j].substring(1)};`;
            } else if (t_code[j].substring(0, 1) == "-") {
                partBlock += `answer=answer+${t_code[j].substring(1)};`;
            } else {
                partBlock += t_code[j];
                if (t_code[j].includes("{")) braces_cnt++;
                if (t_code[j].includes("}")) braces_cnt--;
                if (braces_cnt == 0) {
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
    let start_pos = 0;
    let end_pos = 0;
    let temp_str = "";
    let tag_str = "";
    let prev_code = "";
    let next_code = "";
    let start_block = 0;
    let end_block = 0;
    let class_start = 0;
    let syncCnt = this.syncCnt;
    const eClass=this.eTem.sync_class;

    for (i = 0; i < sync.length; i++) {
        if (sync[i] != lastSync && type[i] == "JS") {
            lastSync = sync[i];
            end_block = 0;
            class_start = 0;
            start_block = i;
            // find first index and last index of code block
            for (j = i; j < sync.length; j++) {
                if (sync[j] == sync[start_block]) { end_block = j; }
                else { break; }
            }

            prev_code = code[i - 1];
            if (prev_code.substring(prev_code.length - 1) != ">") {
                end_pos = prev_code.lastIndexOf(">");
                start_pos = prev_code.lastIndexOf("<");
                if (end_pos < start_pos) {
                    // template in the middle of prev and next
                    temp_str = prev_code.substring(start_pos);
                    let attr_start = prev_code.lastIndexOf(' ');
                    let attr_end = prev_code.lastIndexOf('="');
                    let attr = prev_code.substring(attr_start + 1, attr_end);
                    if (temp_str.includes("class=")) {
                        // tag left, class?
                        class_start = prev_code.indexOf("class=", start_pos) + 7;
                        code[i - 1] = `${prev_code.substring(0, class_start)}${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt} ${prev_code.substring(class_start)}`;
                        syncCnt++;
                    } else {
                        next_code = code[i + 1];
                        end_pos = next_code.indexOf(">");
                        temp_str = next_code.substring(0, end_pos);
                        if (temp_str.includes("class=")) {
                            // tag right, class?
                            class_start = next_code.indexOf("class=") + 7;
                            code[i + 1] = `${next_code.substring(0, class_start)}${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt} ${next_code.substring(class_start)}`;
                            syncCnt++;
                        } else {
                            // then, insert class
                            start_pos = prev_code.lastIndexOf("<");
                            end_pos = prev_code.indexOf(" ", start_pos);
                            code[i - 1] = `${prev_code.substring(0, end_pos + 1)} class="${eClass} ${eClass}_${attr} ${eClass}Cnt${syncCnt}" ${prev_code.substring(end_pos + 1)}`;
                            syncCnt++;
                        }
                    }
                } else {
                    // not in the middle
                    code[i - 1] = code[i - 1] + `<span class="${eClass} ${eClass}Cnt${syncCnt}">`;
                    syncCnt++;
                    code[end_block + 1] = "</span>" + code[end_block + 1];
                }
            } else {
                start_pos = prev_code.lastIndexOf("<");
                tag_str = prev_code.substring(start_pos + 1, prev_code.length).split(" ")[0];
                if (prev_code.substring(start_pos, start_pos + 2) != "</") { //  만약 전 code가 end tag으로 끝나지 않으면
                    if (
                        code[end_block + 1].includes("</" + tag_str) &&
                        code[end_block + 1].indexOf("</" + tag_str) <
                        (code[end_block + 1].indexOf("<" + tag_str) == -1 ? code[end_block + 1].length : code[end_block + 1].indexOf("<" + tag_str))
                    ) {
                        // tag end in the next
                        end_pos = prev_code.length - 1;
                        start_pos = prev_code.lastIndexOf("<");
                        temp_str = prev_code.substring(start_pos, end_pos + 1);
                        if (temp_str.includes("class=")) {
                            class_start = prev_code.indexOf("class=", start_pos) + 7;
                            code[i - 1] = `${prev_code.substring(0, class_start)}${eClass} ${eClass}Cnt${syncCnt} ${prev_code.substring(class_start)}`;
                            syncCnt++;
                        } else {
                            code[i - 1] =
                                `${prev_code.substring(0, prev_code.length - 1)} class="${eClass} ${eClass}Cnt${syncCnt}" ${prev_code.substring(prev_code.length - 1, prev_code.length)}`;
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
                    code[end_block + 1] = `</span>${code[end_block + 1]}`;
                }
            }
        } else {
            lastSync = sync[i];
        }
    }

    return { type: type, code: code, syncCnt };
};

eTemplate.prototype.basicCode = function (script) {
    try {
        return Function(`"use strict"; return ( ${script.substring(1)} )`)();
    } catch (e) {
        return `invalid template script`;
    }
};

eTemplate.prototype.controlCode = function (script) {
    try {
        return Function(`"use strict"; ${script.replace(/[\n\r\t]/g, "")}`)();
    } catch (e) {
        return "invalid template script";
    }
};

eTemplate.prototype.currentUrl = function () {
    let fullurl = window.location.href;
    let url_hash = window.location.hash;
    fullurl = fullurl.replace(url_hash, "");
    let filename = fullurl.split("/").pop();
    let host = fullurl.substring(0, fullurl.length - filename.length);
    if (filename.length < 1) {
        if (url_hash.length > 0) {
            filename = url_hash.substring(1) + ".html";
        } else {
            filename = "index.html";
        }
    }
    return { host: host, filename: filename };
};

eTemplate.prototype.loadjscssfile = function (filename, filetype) {
    if (filetype == "js") {
        //if filename is a external JavaScript file
        var fileref = document.createElement("script");
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
    } else if (filetype == "css") {
        //if filename is an external CSS file
        var fileref = document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
    }
    if (typeof fileref != "undefined") document.getElementsByTagName("head")[0].appendChild(fileref);
};

eTemplate.prototype.createjscssfile = function (filename, filetype) {
    if (filetype == "js") {
        //if filename is a external JavaScript file
        let fileref = document.createElement("script");
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
    } else if (filetype == "css") {
        //if filename is an external CSS file
        let fileref = document.createElement("link");
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
    }
    return fileref;
};

eTemplate.prototype.replacejscssfile = function (newfilelist) {
    let targetelement = 'link[rel="stylesheet"]';
    let targetattr = "href";
    let allsuspects = document.querySelectorAll(targetelement);
    let matched = new Array(allsuspects.length);
    let matchcnt = 0;
    let temp_href = "";
    for (i = 0; i < allsuspects.length; i++) {
        matched[i] = 0;
    }
    for (i = 0; i < newfilelist.length; i++) {
        matchcnt = 0;
        for (let j = allsuspects.length - 1; j >= 0; j--) {
            temp_href = allsuspects[j].getAttribute(targetattr);
            temp_href = temp_href.replace(this.currentUrl().host, "/");
            if (temp_href.indexOf(newfilelist[i]) != -1) {
                matchcnt++;
                matched[j]++;
            }
        }
        if (matchcnt == 0) {
            this.loadjscssfile(newfilelist[i], "css");
        }
    }
    for (i = 0; i < matched.length; i++) {
        if (matched[i] == 0) {
            allsuspects[i].parentNode.removeChild(allsuspects[i]);
        }
    }
};

// check object type for renderPart()
eTemplate.prototype.getObjectType = (o) => {
    if (typeof HTMLElement === "object" ? o instanceof HTMLElement : o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string") { return "DOMobject"; } else { return (o.includes('<%') && o.includes('%>')) ? "template" : o.includes('.html') ? "html_path" :  o.includes('.css') ? "css_path" : "undefined"; }
}

// replace filename with current page's hash
eTemplate.prototype.hashtofilename = function (filename) {
    let hash = window.location.hash;
    if (hash != "" && filename == "") {
        filename = hash.substring(1) + ".html";
    } // if hash exist, it's filename
    return filename;
};

eTemplate.prototype.removeAllChildNodes = (parent) => {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

eTemplate.prototype.parseCSS = function (source) {
    if (source === undefined) return [];
    let cssImportStatements = [];
    let cssKeyframeRegex = "((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})";
    let combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})"; //to match css & media queries together
    let cssImportStatementRegex = new RegExp("@import .*(.*)?;", "gi");
    let css = [];
    //get import
    while (true) {
        let imports = cssImportStatementRegex.exec(source);
        if (imports !== null) {
            cssImportStatements.push(imports[0]);
            css.push({
                selector: "@imports",
                type: "imports",
                styles: imports[0],
            });
        } else {
            break;
        }
    }
    source = source.replace(cssImportStatementRegex, "");
    //get keyframe
    let keyframesRegex = new RegExp(cssKeyframeRegex, "gi");
    let arr;
    while (true) {
        arr = keyframesRegex.exec(source);
        if (arr === null) break;
        css.push({
            selector: "@keyframes",
            type: "keyframes",
            styles: arr[0],
        });
    }
    source = source.replace(keyframesRegex, "");
    
    let unified = new RegExp(combinedCSSRegex, "gi");

    while (true) {
        arr = unified.exec(source);
        if (arr === null) break;
        let selector = "";
        if (arr[2] === undefined) {
            selector = arr[5].split("\r\n").join("\n").trim();
        } else {
            selector = arr[2].split("\r\n").join("\n").trim();
        }

        selector = selector.replace(/\n+/, "\n");

        if (selector.indexOf("@media") !== -1) {
            let cssObject = {
                selector: selector,
                type: "media",
                subStyles: this.parseCSS(arr[3] + "\n}"),
            };
            css.push(cssObject);
        } else {
            let rules = this.parseRules(arr[6]);
            let style = {
                selector: selector,
                rules: rules,
            };
            if (selector === "@font-face") style.type = "font-face";
            css.push(style);
        }
    }

    return css;
};

eTemplate.prototype.parseRules = function (rules) {
    rules = rules.split("\r\n").join("\n");
    let ret = [];
    rules = rules.split(";");
    for (let i = 0; i < rules.length; i++) {
        let line = rules[i];
        line = line.trim();
        if (line.indexOf(":") !== -1) {
            line = line.split(":");
            let cssKey = line[0].trim();
            let cssValue = line.slice(1).join(":").trim();
            if (cssKey.length < 1 || cssValue.length < 1) continue;
            ret.push({ key: cssKey, value: cssValue });
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
    }
    return ret;
};

// mouse is on inside or outside of document
document.onmouseover = function () {
    window.innerDocClick = true;
};
document.onmouseleave = function () {
    window.innerDocClick = false;
};

let etm_temp = {};