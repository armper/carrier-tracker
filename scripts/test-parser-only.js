"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var cheerio = __importStar(require("cheerio"));
// Test the parsing logic directly without database dependencies
function testRealCompany() {
    return __awaiter(this, void 0, void 0, function () {
        var dotNumber, url, formData, response, html, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dotNumber = '4024598';
                    url = 'https://safer.fmcsa.dot.gov/query.asp';
                    formData = new URLSearchParams({
                        searchtype: 'ANY',
                        query_type: 'queryCarrierSnapshot',
                        query_param: 'USDOT',
                        query_string: dotNumber
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                            },
                            body: formData.toString()
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.text()];
                case 3:
                    html = _a.sent();
                    console.log("Downloaded HTML for DOT ".concat(dotNumber, ", length: ").concat(html.length));
                    result = parseCarrierHTML(html, dotNumber);
                    console.log('Parsed result:', result);
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error('Error downloading HTML:', error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function parseCarrierHTML(html, dotNumber) {
    var data = {
        dot_number: dotNumber
    };
    try {
        // Load HTML into Cheerio for DOM parsing
        var $_1 = cheerio.load(html);
        // Helper function to clean text
        var cleanText_1 = function (text) {
            if (!text)
                return undefined;
            return text
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim();
        };
        // Helper function to extract table values using DOM selectors
        var extractTableValue = function (label) {
            console.log("\n--- Extracting ".concat(label, " ---"));
            // Try multiple selectors to find the field
            var selectors = [
                "td:contains(\"".concat(label, "\") + td"),
                "th:contains(\"".concat(label, "\") + td"),
                "td:contains(\"".concat(label, "\")"),
                "th:contains(\"".concat(label, "\")")
            ];
            for (var _i = 0, selectors_1 = selectors; _i < selectors_1.length; _i++) {
                var selector = selectors_1[_i];
                var element = $_1(selector).first();
                if (element.length > 0) {
                    console.log("Found element with selector: ".concat(selector));
                    var text = cleanText_1(element.text());
                    console.log("Raw text: \"".concat(text, "\""));
                    if (text && text !== label) {
                        return text;
                    }
                }
            }
            // Try a more specific approach for SAFER's table structure
            var labelElement = $_1("th:contains(\"".concat(label, "\"), td:contains(\"").concat(label, "\")")).first();
            if (labelElement.length > 0) {
                console.log("Found label element for ".concat(label));
                var row = labelElement.closest('tr');
                if (row.length > 0) {
                    var dataCell = row.find('td').not(":contains(\"".concat(label, "\")")).first();
                    if (dataCell.length > 0) {
                        var text = cleanText_1(dataCell.text());
                        console.log("Data cell text: \"".concat(text, "\""));
                        return text;
                    }
                }
            }
            console.log("No element found for ".concat(label));
            return null;
        };
        // Specialized extraction for complex fields with checkboxes
        var extractCheckboxField = function (label) {
            console.log("\n--- Extracting ".concat(label, " with checkbox method ---"));
            // Find the section containing the label
            var labelElement = $_1("th:contains(\"".concat(label, "\"), td:contains(\"").concat(label, "\")")).first();
            if (labelElement.length === 0) {
                console.log("No label element found for ".concat(label));
                return [];
            }
            console.log("Found label element for ".concat(label));
            // Look for the table structure that contains the checkboxes
            // The checkboxes are typically in a nested table structure
            var section = labelElement.closest('tr').nextAll('tr').filter(function () {
                var hasTable = $_1(this).find('table').length > 0;
                var hasX = $_1(this).text().includes('X');
                return hasTable || hasX;
            }).first();
            if (section.length === 0) {
                console.log("No checkbox section found for ".concat(label));
                return [];
            }
            console.log("Found checkbox section for ".concat(label));
            var checkedItems = [];
            // Look for cells containing "X" and get the next cell's text
            section.find('td').each(function () {
                var text = $_1(this).text().trim();
                if (text === 'X') {
                    var nextCell = $_1(this).next('td');
                    if (nextCell.length > 0) {
                        var item = nextCell.text().trim();
                        if (item && item.length > 0 && item.length < 50) {
                            console.log("Found checked item: ".concat(item));
                            checkedItems.push(item);
                        }
                    }
                }
            });
            // If no X marks found, try a different approach - look for the entire section
            if (checkedItems.length === 0) {
                console.log("No X marks found, trying alternative approach for ".concat(label));
                // Look for the entire section text and extract items that look like cargo types
                var sectionText = section.text();
                console.log("Section text: ".concat(sectionText.substring(0, 200), "..."));
                // Common cargo types and operations to look for
                var commonItems = [
                    'Interstate', 'Intrastate Only (HM)', 'Intrastate Only (Non-HM)',
                    'General Freight', 'Household Goods', 'Fresh Produce', 'Commodities Dry Bulk',
                    'Refrigerated Food', 'OTHER', 'Auth. For Hire', 'Exempt For Hire', 'Private(Property)'
                ];
                for (var _i = 0, commonItems_1 = commonItems; _i < commonItems_1.length; _i++) {
                    var item = commonItems_1[_i];
                    if (sectionText.includes(item)) {
                        console.log("Found item in section: ".concat(item));
                        checkedItems.push(item);
                    }
                }
            }
            console.log("Final items for ".concat(label, ":"), checkedItems);
            return checkedItems;
        };
        // Extract Legal Name with better fallbacks
        var legalName = extractTableValue('Legal Name');
        // Debug logging
        console.log("DOT ".concat(dotNumber, " - Legal Name extraction:"), legalName);
        // Validate the extracted legal name
        if (legalName && (legalName.length > 200 ||
            legalName.includes('Query Result') ||
            legalName.includes('SAFER Table Layout') ||
            legalName.includes('Information') ||
            legalName.includes('USDOT Number') ||
            legalName.includes('MC/MX Number') ||
            legalName.includes('Enter Value') ||
            legalName.includes('Search Criteria'))) {
            console.log("DOT ".concat(dotNumber, " - Invalid legal name extracted:"), legalName);
            legalName = null;
        }
        // Fallback 1: Extract from page title
        if (!legalName) {
            var title = $_1('title').text();
            if (title && title.includes('Company Snapshot')) {
                var titleMatch = title.match(/Company Snapshot\s+(.+)/i);
                if (titleMatch && titleMatch[1]) {
                    legalName = cleanText_1(titleMatch[1]);
                    console.log("DOT ".concat(dotNumber, " - Legal name from title:"), legalName);
                }
            }
        }
        // Fallback 2: Pattern matching for company names
        if (!legalName) {
            var bodyText = $_1('body').text();
            var companyPatterns = [
                /([A-Z][A-Z\s&.,'-]+(?:LLC|INC|CORP|LTD|CO|COMPANY|SERVICES|TRANSPORT|TRUCKING|LOGISTICS))/i,
                /([A-Z][A-Z\s&.,'-]{3,50})/i
            ];
            for (var _i = 0, companyPatterns_1 = companyPatterns; _i < companyPatterns_1.length; _i++) {
                var pattern = companyPatterns_1[_i];
                var match = bodyText.match(pattern);
                if (match && match[1] && match[1].length > 3 && match[1].length < 100) {
                    legalName = cleanText_1(match[1]);
                    console.log("DOT ".concat(dotNumber, " - Legal name from pattern:"), legalName);
                    break;
                }
            }
        }
        // Final fallback
        if (!legalName) {
            legalName = "Carrier ".concat(dotNumber);
            console.log("DOT ".concat(dotNumber, " - Using fallback legal name:"), legalName);
        }
        data.legal_name = legalName;
        // Extract other fields with debugging
        data.dba_name = extractTableValue('DBA Name') || null;
        data.physical_address = extractTableValue('Physical Address') || null;
        data.entity_type = extractTableValue('Entity Type') || null;
        data.operating_status = extractTableValue('Operating Status') || null;
        // Use specialized extraction for complex checkbox fields
        var carrierOperations = extractCheckboxField('Carrier Operation');
        data.carrier_operation = carrierOperations.length > 0 ? carrierOperations : null;
        var cargoTypes = extractCheckboxField('Cargo Carried');
        data.equipment_types = cargoTypes.length > 0 ? cargoTypes : null;
        return {
            success: true,
            data: data
        };
    }
    catch (error) {
        console.error("Error parsing HTML for DOT ".concat(dotNumber, ":"), error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown parsing error'
        };
    }
}
// Run the test
testRealCompany().catch(function (err) {
    console.error('Test failed:', err);
    process.exit(1);
});
