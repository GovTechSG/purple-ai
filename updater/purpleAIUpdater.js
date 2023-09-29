const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { config } = require("dotenv");
const fs = require('fs');
const axios = require('axios');
const utils = require('./utils');
const { execSync } = require('child_process');
const { silentLogger } = require('./logs'); 

const { purpleAiRules, rangePath, purpleAIPromptsPath, resultsFolderPath } = require('./constants');

config(); 

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY, 
    scopes: [
        'https://www.googleapis.com/auth/spreadsheets'
    ]
})

const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": process.env.OPENAI_API_KEY
}

const query = async (payload) => {
    try {
      const response = await axios.post(process.env.OPENAI_API_ENDPOINT, payload, { headers: HEADERS });
      return { status: response.status, answer: response.data.data[0].llm_response.content };
    } catch (error) {
      const errorMessage = `${error}: ${error.response.config.data}`
      silentLogger.error(errorMessage);
      return { status: error.response.status }
    }
}

const getDataFromGoogleSheets = async () => {
    const sheet = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
    await sheet.loadInfo();

    const formReponses = sheet.sheetsByIndex[0];
    const range = utils.getRange();
    const rows = await formReponses.getRows({offset: range.offset, limit: range.limit}); // can set offset and limit
    return rows; 
}

const generateIssuesToQuery = (data) => {
    var issues = [];
    for (const d of data) {
        try {
            const results = JSON.parse(d.get('Accessibility Scan Results'));

            for (const ruleID of Object.keys(results)) {
                if (purpleAiRules.includes(ruleID)) {
                    const snippets = results[ruleID].snippets; 
                    for (const snippet of snippets) {  
                        const basicHTMLLabel = utils.createBasicHTMLLabel(ruleID, snippet);
                        const promptHTMLSnippet = utils.processHTMLSnippet(snippet);
                        issues.push({
                            ruleID: ruleID, 
                            htmlSnippet: snippet,
                            basicHTMLLabel: basicHTMLLabel,
                            promptHTMLSnippet: promptHTMLSnippet
                        })
                    }
                }
            } 
        } catch (e) {
        const errorMessage = `${e}: ${d['_rawData']}`
        silentLogger.error(errorMessage);
       }
    }
    utils.updateRowRange(data);
    return issues; 
}

const getAIResponse = async (promptHTMLSnippet, ruleID) => {
    const prompts = JSON.parse(fs.readFileSync(purpleAIPromptsPath));
    const htmlSnippet = promptHTMLSnippet;
    const prompt = eval('`' + prompts[ruleID] + '`');

    console.log(prompt);

    const result = await query({
        "flow_id": process.env.OPENAI_FLOW_ID, 
        "inputs": [{
            "prompt": prompt
        }]
    })

    console.log(result)
    return result.status === 200 ? result.answer : null;
}

const generateAIResponses = async (issues) => {
    const updatedIssues = new Set();
    const catalog = utils.getCatalog();
    for (const i of issues) {
        const { ruleID, htmlSnippet, basicHTMLLabel, promptHTMLSnippet } = i;
        const needsQuery = utils.needsQuery(ruleID, htmlSnippet, basicHTMLLabel, catalog); 
        if (needsQuery) {
            const response = await getAIResponse(promptHTMLSnippet, ruleID); 
            if (response) {
                utils.writeAIResponse(ruleID, basicHTMLLabel, response); 
                // update catalog
                catalog[ruleID] = catalog[ruleID] ? catalog[ruleID] : [];
                catalog[ruleID].push(basicHTMLLabel);

                updatedIssues.add(ruleID)
            }
        }
    }
    catalog["lastUpdated"] = new Date().toLocaleString();
    utils.writeCatalog(catalog);
    return updatedIssues;
}

const writeResultsToGithub = async (updatedIssues) => {
    if (updatedIssues.size > 0) {
        let commitMessage = 'Add '; 
        for (const issue of updatedIssues) {
            commitMessage += `${issue}.json `; 
        }
        execSync(`git pull && git add results && git commit -m "${commitMessage}"`)  
    }
    execSync(`git pull && git add catalog.json && git commit -m "Update catalog.json"`) 
    execSync(`git pull && git add range.json && git commit -m "Update range.json"`)
    execSync(`git push`)
 }

const writeCatalogLastUpdatedToGithub = () => {
    const catalog = utils.getCatalog();
    catalog["lastUpdated"] = new Date().toLocaleString();
    utils.writeCatalog(catalog);
    execSync(`git pull && git add catalog.json && git commit -m "Update catalog.json"`) 
}

const run = async () => {
    if (!fs.existsSync('./results')) {
        fs.mkdirSync('./results');
    }
    
    // for testing
    // const prompt = "How to ensure accessible tab order:  <button tabindex=\"10000\"><span></span></button>";
    // const result = await query({
    //     "flow_id": process.env.OPENAI_FLOW_ID, 
    //     "inputs": [{
    //         "prompt": prompt
    //     }]
    // })
    // console.log(result.answer);

    const data = await getDataFromGoogleSheets();
    if (data.length > 0) {
        const issues = generateIssuesToQuery(data);
        const updatedIssues = await generateAIResponses(issues);
        await writeResultsToGithub(updatedIssues);
    } else {
        writeCatalogLastUpdatedToGithub();
    }
}

run();
