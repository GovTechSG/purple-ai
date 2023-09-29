const fs = require('fs');
const prettier = require('prettier');
const { execSync } = require('child_process');
const { rulesUsingRoles, resultsFolderPath, rangePath, catalogPath } = require('./constants');

const htmlTagAndAttributeRegex = new RegExp(/((?<=[<])\s*([a-zA-Z][^\s>/]*)\b)|([\w-]+)\s*(?==\s*["']([^"']*)["'])/g);
const createBasicHTMLLabel = (ruleID, html) => {
    if (rulesUsingRoles.includes(ruleID) && html.includes('role')) {
        return createLabelForRuleWithRole(html);
    }
    const label = html.match(htmlTagAndAttributeRegex).toString().replaceAll(",", "_");
    return label;
}; 

const createLabelForRuleWithRole = (html) => {
    const htmlRoleAttributeRegex = new RegExp(/role="([^"]*)"/g); 
    const outermostHTMLTag = html.match(htmlTagAndAttributeRegex)[0]; 
    const outermostRoleAttribute = html.match(htmlRoleAttributeRegex)[0];
    const htmlLabel = `${outermostHTMLTag}_${outermostRoleAttribute}`;
    return htmlLabel || "";
}

const processHTMLSnippet = (html) => {
    const processed = html.replace(htmlTagAndAttributeRegex, `\`$&\``);
    return processed;
};

const getRange = () => {
    return JSON.parse(fs.readFileSync(rangePath));
}
const updateRowRange = async (rows) => {
    const range = getRange();
    if (rows.length <= range.limit && rows.length > 0) {
        range.offset += rows.length;
       fs.writeFileSync('./range.json', JSON.stringify(range));
    }
};

const needsQuery = (ruleID, html, label, catalog) => {
    // no information for current rule 
    if (!catalog[ruleID] || catalog[ruleID].length === 0) {
        return true; 
    }

    // response exists for exact label 
    if (catalog[ruleID].includes(label)) {
        return false; 
    }

    // rule requires role 
    if (rulesUsingRoles.includes(ruleID) && html.includes('role')) {
        return !catalog[ruleID].includes(label);
    }

    // count the number of elements in keyArr that
    // have matching elements at the same index in currentLabelList
    // return match if >= 3 elements matching
    const currentLabelList = html.match(htmlTagAndAttributeRegex);
    const currentLabelSet = new Set(currentLabelList);
    const hasMatches = catalog[ruleID].some(label => {
        const keyArr = label.split('_');
        const attrMatch = keyArr.filter(key => currentLabelSet.has(key));

        return attrMatch.length >= 3;
    })
    return !hasMatches;
}

const writeAIResponse = (ruleID, basicHTMLLabel, response) => {
     const resultPath = `${resultsFolderPath}/${ruleID}.json`; 
     var data = {}; 
     if (fs.existsSync(resultPath)) {
         data = JSON.parse(fs.readFileSync(resultPath));
     }
     data[basicHTMLLabel] = response;
     fs.writeFileSync(resultPath, prettier.format(JSON.stringify(data), {parser: "json"}));
}

const getCatalog = () => {
    var catalog; 
    if (fs.existsSync(catalogPath)) {
        catalog = JSON.parse(fs.readFileSync(catalogPath));
    } else {
        catalog = {};
    }
    return catalog;
}

const writeCatalog = (catalog) => {
    fs.writeFileSync(catalogPath, prettier.format(JSON.stringify(catalog), {parser: 'json'}));
}

module.exports = {
    createBasicHTMLLabel, 
    processHTMLSnippet, 
    getRange,
    updateRowRange,
    needsQuery,
    writeAIResponse,
    getCatalog,
    writeCatalog
}