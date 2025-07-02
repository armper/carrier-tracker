"use strict";
/**
 * SAFER Web Scraper
 * Free scraping service for DOT carrier data from safer.fmcsa.dot.gov
 * Respectful scraping with rate limiting and error handling
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.SAFERScraper = void 0;
var supabase_server_1 = require("@/lib/supabase-server");
var carrier_filter_1 = require("./carrier-filter");
var cheerio = __importStar(require("cheerio"));
var SAFERScraper = /** @class */ (function () {
    function SAFERScraper() {
        this.baseUrl = 'https://safer.fmcsa.dot.gov';
        this.requestDelay = 2000; // 2 seconds between requests
        this.maxRetries = 3;
        this.userAgent = 'Mozilla/5.0 (compatible; CarrierTracker/1.0)';
    }
    /**
     * Scrape a single carrier's data from SAFER
     */
    SAFERScraper.prototype.scrapeCarrier = function (dotNumber) {
        return __awaiter(this, void 0, void 0, function () {
            var url, response, html, titleMatch, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Scraping DOT ".concat(dotNumber, ", attempt 1/3"));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        url = "".concat(this.baseUrl, "/CompanySnapshot.aspx?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=").concat(dotNumber);
                        return [4 /*yield*/, fetch(url, {
                                headers: {
                                    'User-Agent': this.userAgent,
                                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                    'Referer': "".concat(this.baseUrl, "/")
                                }
                            })];
                    case 2:
                        response = _a.sent();
                        if (!response.ok) {
                            console.log("HTTP ".concat(response.status, " for DOT ").concat(dotNumber));
                            return [2 /*return*/, {
                                    success: false,
                                    error: "HTTP ".concat(response.status),
                                    httpStatus: response.status
                                }];
                        }
                        return [4 /*yield*/, response.text()
                            // Debug: Check what kind of page we got
                        ];
                    case 3:
                        html = _a.sent();
                        // Debug: Check what kind of page we got
                        if (process.env.NODE_ENV === 'development') {
                            console.log("DOT ".concat(dotNumber, " - HTML length: ").concat(html.length));
                            console.log("DOT ".concat(dotNumber, " - Contains 'Company Snapshot': ").concat(html.includes('Company Snapshot')));
                            console.log("DOT ".concat(dotNumber, " - Contains 'Legal Name': ").concat(html.includes('Legal Name')));
                            console.log("DOT ".concat(dotNumber, " - Contains 'Query Result': ").concat(html.includes('Query Result')));
                            titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
                            if (titleMatch) {
                                console.log("DOT ".concat(dotNumber, " - Page title: ").concat(titleMatch[1]));
                            }
                            // Show first 500 characters if it's not a company snapshot
                            if (!html.includes('Company Snapshot')) {
                                console.log("DOT ".concat(dotNumber, " - First 500 chars: ").concat(html.substring(0, 500)));
                            }
                        }
                        // Check if this is actually a company snapshot page
                        if (!html.includes('Company Snapshot')) {
                            console.log("DOT ".concat(dotNumber, " - Not a valid company snapshot page"));
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Not a valid company snapshot page'
                                }];
                        }
                        // Additional validation: Check if this is a search form page (no actual company data)
                        if (html.includes('Search Criteria') ||
                            html.includes('Users can search by DOT Number') ||
                            html.includes('query.asp') ||
                            html.includes('QueryBox') ||
                            html.includes('searchtype') ||
                            html.includes('query_type')) {
                            console.log("DOT ".concat(dotNumber, " - Page contains search form, no company data found"));
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'No company data found - DOT number may not exist'
                                }];
                        }
                        // Check for actual company data indicators
                        if (!html.includes('Legal Name') && !html.includes('DBA Name') && !html.includes('Physical Address')) {
                            console.log("DOT ".concat(dotNumber, " - No company data fields found"));
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'No company data fields found'
                                }];
                        }
                        data = this.parseCarrierHTML(html, dotNumber);
                        if (!data.legal_name || data.legal_name.length > 200) {
                            console.log("DOT ".concat(dotNumber, " - Invalid legal name extracted: ").concat(data.legal_name));
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Could not extract valid company name'
                                }];
                        }
                        console.log("Successfully parsed data for DOT ".concat(dotNumber, ": ").concat(data.legal_name));
                        return [2 /*return*/, {
                                success: true,
                                data: data
                            }];
                    case 4:
                        error_1 = _a.sent();
                        console.error("Error scraping DOT ".concat(dotNumber, ":"), error_1);
                        return [2 /*return*/, {
                                success: false,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Parse carrier data from SAFER HTML response
     */
    SAFERScraper.prototype.parseCarrierHTML = function (html, dotNumber) {
        var _a, _b, _c, _d, _e;
        var data = {
            dot_number: dotNumber
        };
        try {
            // Load HTML into Cheerio for DOM parsing
            var $_1 = cheerio.load(html);
            // Helper function to clean text
            var cleanText = function (text) {
                if (!text)
                    return undefined;
                return text
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .trim();
            };
            // Helper function to extract table values using DOM selectors - improved for SAFER HTML structure
            var extractTableValue = function (label) {
                // SAFER HTML uses specific structure: <TH class="querylabelbkg">Label:</TH> followed by <TD class="queryfield">Data</TD>
                
                // Approach 1: Look for the specific SAFER structure
                var labelTh = $_1('th.querylabelbkg').filter(function(i, el) {
                    var text = $_1(el).text().trim();
                    return text === label + ':' || text === label || text.includes(label);
                });
                
                if (labelTh.length > 0) {
                    // Find the data cell in the same row with class "queryfield"
                    var row = labelTh.closest('tr');
                    var dataCell = row.find('td.queryfield').first();
                    if (dataCell.length > 0) {
                        var text = dataCell.text().trim();
                        // Clean the text and validate it's not form interface
                        if (text && !text.includes('Query Result') && !text.includes('SAFER Table Layout') && !text.includes('Enter Value')) {
                            return text;
                        }
                    }
                }
                
                // Approach 2: Fallback to original logic but with better filtering
                var row = $_1("th:contains(\"".concat(label, "\"), td:contains(\"").concat(label, "\")")).closest('tr');
                if (row.length === 0) {
                    var labelElement = $_1("*:contains(\"".concat(label, "\")")).filter(function (i, el) {
                        var text = $_1(el).text().trim();
                        return text === label || text.startsWith(label + ':') || text.startsWith(label + ' ');
                    }).first();
                    if (labelElement.length > 0) {
                        row = labelElement.closest('tr');
                    }
                }
                if (row.length === 0)
                    return null;
                
                // Get the corresponding data cell - try different strategies
                var dataCell = row.find('td').not(':contains("' + label + '")').first();
                // If no data cell found, try the next sibling
                if (dataCell.length === 0) {
                    var labelCell = row.find("td:contains(\"".concat(label, "\"), th:contains(\"").concat(label, "\")")).first();
                    if (labelCell.length > 0) {
                        dataCell = labelCell.next('td');
                    }
                }
                if (dataCell.length === 0)
                    return null;
                // Extract text content, handling nested tags more carefully
                var clonedCell = dataCell.clone();
                // Remove problematic elements that might contain unwanted text
                clonedCell.find('table').remove(); // Remove nested tables
                clonedCell.find('form').remove(); // Remove forms
                clonedCell.find('input').remove(); // Remove input fields
                clonedCell.find('select').remove(); // Remove select dropdowns
                clonedCell.find('button').remove(); // Remove buttons
                clonedCell.find('script').remove(); // Remove scripts
                clonedCell.find('style').remove(); // Remove styles
                var text = clonedCell.text().trim();
                // Additional cleaning - remove common HTML artifacts and normalize
                text = text
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .replace(/^\s+|\s+$/g, '') // Trim
                    .replace(/^[:\s]+/, '') // Remove leading colons/spaces
                    .replace(/[:\s]+$/, '') // Remove trailing colons/spaces
                    .replace(/Query Result/gi, '') // Remove "Query Result" text
                    .replace(/Information/g, '') // Remove "Information" text  
                    .replace(/USDOT Number/gi, '') // Remove "USDOT Number" text
                    .replace(/MC\/MX Number/gi, '') // Remove "MC/MX Number" text
                    .replace(/Name/g, '') // Remove standalone "Name" text
                    .replace(/SAFER Table Layout/gi, '') // Remove "SAFER Table Layout" text
                    .replace(/Enter Value:?/gi, '') // Remove "Enter Value:" text
                    .replace(/&nbsp;/g, ' ') // Remove non-breaking spaces
                    .trim();
                
                // If the result is empty or just form interface elements, return null
                if (!text || text.length === 0 || 
                    text.match(/^(Query Result|Information|USDOT Number|MC\/MX Number|Name|SAFER Table Layout|Enter Value)$/i)) {
                    return null;
                }
                // If the text is still too long or contains HTML artifacts, try a more aggressive approach
                if (text.length > 200 || text.includes('Query Result') || text.includes('SAFER Table Layout')) {
                    // Try to find the actual data by looking for the first meaningful text
                    var textNodes = dataCell.contents().filter(function () {
                        return this.type === 'text' && $_1(this).text().trim().length > 0;
                    });
                    if (textNodes.length > 0) {
                        text = $_1(textNodes[0]).text().trim();
                    }
                }
                return text || null;
            };
            // Extract Legal Name with better fallbacks
            var legalName = extractTableValue('Legal Name');
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
                console.log("DOT ".concat(dotNumber, " - Legal Name extraction:"), legalName);
            }
            // Validate the extracted legal name
            if (legalName && (legalName.length > 200 ||
                legalName.includes('Query Result') ||
                legalName.includes('SAFER Table Layout') ||
                legalName.includes('Information') ||
                legalName.includes('USDOT Number') ||
                legalName.includes('MC/MX Number') ||
                legalName.includes('Enter Value') ||
                legalName.includes('Search Criteria'))) {
                console.log("DOT ".concat(dotNumber, " - Invalid legal name detected, clearing:"), legalName);
                legalName = null;
            }
            if (!legalName) {
                // Fallback 1: Try title extraction
                var title = $_1('title').text();
                var titleMatch = title.match(/SAFER Web - Company Snapshot\s+(.+)/i);
                if (titleMatch) {
                    legalName = titleMatch[1].trim();
                    if (process.env.NODE_ENV === 'development') {
                        console.log("DOT ".concat(dotNumber, " - Legal Name from title:"), legalName);
                    }
                }
            }
            // Fallback 2: If still no name, try to find any company name pattern
            if (!legalName || legalName.length > 200) {
                // Look for any text that looks like a company name
                var allText = $_1('body').text();
                var companyNameMatch = allText.match(/([A-Z][A-Z\s&.,'-]{3,50})/g);
                if (companyNameMatch) {
                    // Filter out common SAFER page text
                    var filteredNames = companyNameMatch.filter(function (name) {
                        return name.length > 3 &&
                            name.length < 100 &&
                            !name.includes('SAFER') &&
                            !name.includes('USDOT') &&
                            !name.includes('MC/MX') &&
                            !name.includes('Query Result') &&
                            !name.includes('Information') &&
                            !name.includes('Table Layout') &&
                            !name.includes('Enter Value') &&
                            !name.includes('DOT Number') &&
                            !name.includes('Number') &&
                            !name.includes('Name') &&
                            !name.includes('Search Criteria') &&
                            !name.includes('Company Snapshot');
                    });
                    if (filteredNames.length > 0) {
                        legalName = filteredNames[0].trim();
                        if (process.env.NODE_ENV === 'development') {
                            console.log("DOT ".concat(dotNumber, " - Legal Name from pattern match:"), legalName);
                        }
                    }
                }
            }
            // Final validation before using fallback
            if (legalName && (legalName.length > 200 ||
                legalName.includes('Query Result') ||
                legalName.includes('SAFER Table Layout') ||
                legalName.includes('Information') ||
                legalName.includes('USDOT Number') ||
                legalName.includes('MC/MX Number') ||
                legalName.includes('Enter Value') ||
                legalName.includes('Search Criteria'))) {
                console.log("DOT ".concat(dotNumber, " - Final validation failed, using fallback name"));
                legalName = "Carrier ".concat(dotNumber);
            }
            // Final fallback: Use DOT number if no name found
            if (!legalName || legalName.length > 200) {
                legalName = "Carrier ".concat(dotNumber);
                if (process.env.NODE_ENV === 'development') {
                    console.log("DOT ".concat(dotNumber, " - Using fallback name:"), legalName);
                }
            }
            data.legal_name = cleanText(legalName);
            // Extract DBA Name
            data.dba_name = cleanText(extractTableValue('DBA Name'));
            // Extract Physical Address
            var rawAddress = extractTableValue('Physical Address');
            if (rawAddress) {
                var cleanAddress = cleanText(rawAddress);
                data.physical_address = cleanAddress;
                // Extract state and city from address
                if (cleanAddress) {
                    var addressParts = cleanAddress.split(',').map(function (part) { return part.trim(); });
                    if (addressParts.length >= 2) {
                        var lastPart = addressParts[addressParts.length - 1];
                        var stateZipMatch = lastPart.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/);
                        if (stateZipMatch) {
                            data.state = stateZipMatch[1];
                            data.city = addressParts[addressParts.length - 2];
                        }
                    }
                }
            }
            // Extract Phone
            data.phone = cleanText(extractTableValue('Phone'));
            // Extract Safety Rating
            var rawSafetyRating = extractTableValue('Safety Rating') || extractTableValue('DOT Safety Rating');
            if (rawSafetyRating) {
                var rating = (_a = cleanText(rawSafetyRating)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                if (rating === null || rating === void 0 ? void 0 : rating.includes('satisfactory'))
                    data.safety_rating = 'satisfactory';
                else if (rating === null || rating === void 0 ? void 0 : rating.includes('conditional'))
                    data.safety_rating = 'conditional';
                else if (rating === null || rating === void 0 ? void 0 : rating.includes('unsatisfactory'))
                    data.safety_rating = 'unsatisfactory';
                else
                    data.safety_rating = 'not-rated';
            }
            // Extract Authority Status (Operating Authority Status) - improved parsing
            var rawAuthorityStatus = extractTableValue('Operating Authority Status') || extractTableValue('Operating Status') || extractTableValue('Authority Status');
            if (rawAuthorityStatus) {
                var status_1 = (_b = cleanText(rawAuthorityStatus)) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                if ((status_1 === null || status_1 === void 0 ? void 0 : status_1.includes('authorized')) || (status_1 === null || status_1 === void 0 ? void 0 : status_1.includes('active'))) {
                    data.authority_status = 'Active';
                }
                else if (status_1 === null || status_1 === void 0 ? void 0 : status_1.includes('not authorized')) {
                    data.authority_status = 'Inactive';
                }
                else {
                    data.authority_status = 'Unknown';
                }
            }
            // Extract Out of Service Date
            var rawOosDate = extractTableValue('Out of Service Date');
            if (rawOosDate && cleanText(rawOosDate) !== 'None') {
                data.out_of_service_date = cleanText(rawOosDate);
            }
            // Extract MCS-150 Date (last update)
            data.mcs_150_date = cleanText(extractTableValue('MCS-150 Form Date') || extractTableValue('MCS-150 Date'));
            // Extract Power Units (vehicle count)
            var rawPowerUnits = extractTableValue('Power Units');
            if (rawPowerUnits) {
                var units = parseInt(((_c = cleanText(rawPowerUnits)) === null || _c === void 0 ? void 0 : _c.replace(/,/g, '')) || '0');
                if (!isNaN(units) && units > 0) {
                    data.vehicle_count = units;
                }
            }
            // Determine insurance status based on operating status and out of service
            if (data.authority_status === 'Active' && !data.out_of_service_date) {
                data.insurance_status = 'Active';
            }
            else {
                data.insurance_status = 'Unknown';
            }
            // Extract operation classification
            data.operation_classification = [cleanText(extractTableValue('Operation Classification')) || 'Unknown'];
            // Extract carrier operation type
            data.carrier_operation = [cleanText(extractTableValue('Carrier Operation')) || 'Unknown'];
            // Extract additional fields useful for freight brokers
            // Driver count
            var rawDrivers = extractTableValue('Drivers');
            if (rawDrivers) {
                var drivers = parseInt(((_d = cleanText(rawDrivers)) === null || _d === void 0 ? void 0 : _d.replace(/,/g, '')) || '0');
                if (!isNaN(drivers) && drivers > 0) {
                    data.driver_count = drivers;
                }
            }
            // MC Number (Motor Carrier Authority) - extract from MC/MX/FF Number(s)
            var mcNumbers = extractTableValue('MC/MX/FF Number(s)') || extractTableValue('MC') || extractTableValue('MC Number');
            if (mcNumbers) {
                var mcText = cleanText(mcNumbers);
                // Look for MC- pattern in the text
                var mcMatch = mcText === null || mcText === void 0 ? void 0 : mcText.match(/MC-(\d+)/);
                if (mcMatch) {
                    data.mc_number = "MC-".concat(mcMatch[1]);
                }
                else {
                    data.mc_number = mcText;
                }
            }
            // Operating Status (more detailed than authority status)
            data.operating_status = cleanText(extractTableValue('Operating Authority Status') || extractTableValue('Operating Status'));
            // Entity Type (Corporation, LLC, etc.)
            data.entity_type = cleanText(extractTableValue('Entity Type') || extractTableValue('Business Type'));
            // Safety Review/Rating dates
            data.safety_review_date = cleanText(extractTableValue('Safety Review Date'));
            data.safety_rating_date = cleanText(extractTableValue('Safety Rating Date'));
            // Interstate operation flag
            var interstate = cleanText(extractTableValue('Interstate'));
            if (interstate) {
                data.interstate_operation = interstate.toLowerCase().includes('yes') || interstate.toLowerCase().includes('interstate');
            }
            // Hazmat flag
            var hazmat = cleanText(extractTableValue('Hazmat') || extractTableValue('Hazardous Materials'));
            if (hazmat) {
                data.hazmat_flag = hazmat.toLowerCase().includes('yes') || hazmat.toLowerCase().includes('hazmat');
            }
            // Private Carrier flag
            var privateCarrier = cleanText(extractTableValue('Private') || extractTableValue('For Hire'));
            if (privateCarrier) {
                data.pc_flag = privateCarrier.toLowerCase().includes('private');
            }
            // Total mileage/mile traveled
            var mileage = extractTableValue('Miles') || extractTableValue('Total Miles');
            if (mileage) {
                var miles = parseInt(((_e = cleanText(mileage)) === null || _e === void 0 ? void 0 : _e.replace(/[^\d]/g, '')) || '0');
                if (!isNaN(miles) && miles > 0) {
                    data.total_mileage = miles;
                }
            }
            // Enhanced parsing for freight broker critical data
            // Crash Data
            var crashData = extractTableValue('Crashes') || extractTableValue('Crash Data');
            if (crashData) {
                var crashText = cleanText(crashData);
                var crashMatch = crashText === null || crashText === void 0 ? void 0 : crashText.match(/(\d+)/);
                if (crashMatch) {
                    data.crash_count = parseInt(crashMatch[1]);
                }
            }
            // Fatal Crashes
            var fatalCrashes = extractTableValue('Fatal Crashes') || extractTableValue('Fatalities');
            if (fatalCrashes) {
                var fatalText = cleanText(fatalCrashes);
                var fatalMatch = fatalText === null || fatalText === void 0 ? void 0 : fatalText.match(/(\d+)/);
                if (fatalMatch) {
                    data.fatal_crashes = parseInt(fatalMatch[1]);
                }
            }
            // Injury Crashes
            var injuryCrashes = extractTableValue('Injury Crashes') || extractTableValue('Injuries');
            if (injuryCrashes) {
                var injuryText = cleanText(injuryCrashes);
                var injuryMatch = injuryText === null || injuryText === void 0 ? void 0 : injuryText.match(/(\d+)/);
                if (injuryMatch) {
                    data.injury_crashes = parseInt(injuryMatch[1]);
                }
            }
            // Inspection Data
            var inspectionData = extractTableValue('Inspections') || extractTableValue('Inspection Data');
            if (inspectionData) {
                var inspectionText = cleanText(inspectionData);
                var inspectionMatch = inspectionText === null || inspectionText === void 0 ? void 0 : inspectionText.match(/(\d+)/);
                if (inspectionMatch) {
                    data.inspection_count = parseInt(inspectionMatch[1]);
                }
            }
            // Out of Service Orders
            var oosData = extractTableValue('Out of Service') || extractTableValue('OOS Orders');
            if (oosData) {
                var oosText = cleanText(oosData);
                var oosMatch = oosText === null || oosText === void 0 ? void 0 : oosText.match(/(\d+)/);
                if (oosMatch) {
                    data.out_of_service_orders = parseInt(oosMatch[1]);
                }
            }
            // Calculate Out of Service Rate
            if (data.inspection_count && data.out_of_service_orders) {
                data.out_of_service_rate = Math.round((data.out_of_service_orders / data.inspection_count) * 100);
            }
            // Insurance Information
            data.insurance_carrier = cleanText(extractTableValue('Insurance Carrier') || extractTableValue('Insurance Company'));
            data.insurance_policy_number = cleanText(extractTableValue('Policy Number') || extractTableValue('Insurance Policy'));
            var insuranceAmount = extractTableValue('Insurance Amount') || extractTableValue('Liability Insurance');
            if (insuranceAmount) {
                var amountText = cleanText(insuranceAmount);
                var amountMatch = amountText === null || amountText === void 0 ? void 0 : amountText.match(/\$?([\d,]+)/);
                if (amountMatch) {
                    data.insurance_amount = parseInt(amountMatch[1].replace(/,/g, ''));
                }
            }
            var cargoInsurance = extractTableValue('Cargo Insurance') || extractTableValue('Cargo Coverage');
            if (cargoInsurance) {
                var cargoText = cleanText(cargoInsurance);
                var cargoMatch = cargoText === null || cargoText === void 0 ? void 0 : cargoText.match(/\$?([\d,]+)/);
                if (cargoMatch) {
                    data.cargo_insurance_amount = parseInt(cargoMatch[1].replace(/,/g, ''));
                }
            }
            // Insurance Dates
            data.insurance_effective_date = cleanText(extractTableValue('Insurance Effective Date'));
            data.insurance_expiry_date = cleanText(extractTableValue('Insurance Expiry Date') || extractTableValue('Insurance Expiration'));
            // Financial Responsibility
            data.financial_responsibility_status = cleanText(extractTableValue('Financial Responsibility') || extractTableValue('Financial Status'));
            // Equipment Types (from operation classification)
            var operationClass = cleanText(extractTableValue('Operation Classification'));
            if (operationClass) {
                data.equipment_types = [operationClass];
                // Add common equipment types based on operation classification
                if (operationClass.toLowerCase().includes('general freight')) {
                    data.equipment_types.push('dry van');
                }
                if (operationClass.toLowerCase().includes('flatbed')) {
                    data.equipment_types.push('flatbed');
                }
                if (operationClass.toLowerCase().includes('refrigerated')) {
                    data.equipment_types.push('refrigerated');
                }
                if (operationClass.toLowerCase().includes('tanker')) {
                    data.equipment_types.push('tanker');
                }
            }
            // Service Areas (from interstate operation and state)
            if (data.interstate_operation) {
                data.service_areas = ['Interstate'];
            }
            if (data.state) {
                data.service_areas = data.service_areas || [];
                data.service_areas.push(data.state);
            }
            // Years in Business (estimate from MCS-150 date)
            if (data.mcs_150_date) {
                var mcsDate = new Date(data.mcs_150_date);
                var currentYear = new Date().getFullYear();
                var yearsInBusiness = currentYear - mcsDate.getFullYear();
                if (yearsInBusiness > 0 && yearsInBusiness < 100) {
                    data.years_in_business = yearsInBusiness;
                }
            }
            return data;
        }
        catch (error) {
            console.error("Error parsing HTML for DOT ".concat(dotNumber, ":"), error);
            return data;
        }
    };
    /**
     * Bulk scrape multiple carriers with rate limiting
     */
    SAFERScraper.prototype.bulkScrape = function (dotNumbers, onProgress) {
        return __awaiter(this, void 0, void 0, function () {
            var results, i, dotNumber, result, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        results = {
                            successful: 0,
                            failed: 0,
                            results: [],
                            siteDown: false,
                            siteDownError: undefined
                        };
                        console.log("Starting bulk scrape of ".concat(dotNumbers.length, " carriers"));
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < dotNumbers.length)) return [3 /*break*/, 10];
                        dotNumber = dotNumbers[i];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 7, , 8]);
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(i + 1, dotNumbers.length, dotNumber);
                        return [4 /*yield*/, this.scrapeCarrier(dotNumber)
                            // If SAFER site is down, abort batch
                        ];
                    case 3:
                        result = _a.sent();
                        // If SAFER site is down, abort batch
                        if (result.error && result.error.includes('SAFER site down')) {
                            results.siteDown = true;
                            results.siteDownError = result.error;
                            console.error('SAFER site appears to be down. Aborting bulk scrape.');
                            return [3 /*break*/, 10];
                        }
                        if (!(result.success && result.data)) return [3 /*break*/, 5];
                        results.successful++;
                        results.results.push({
                            dotNumber: dotNumber,
                            success: true,
                            data: result.data
                        });
                        // Update database immediately on success
                        return [4 /*yield*/, this.updateCarrierInDatabase(result.data)];
                    case 4:
                        // Update database immediately on success
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        results.failed++;
                        results.results.push({
                            dotNumber: dotNumber,
                            success: false,
                            error: result.error
                        });
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _a.sent();
                        results.failed++;
                        results.results.push({
                            dotNumber: dotNumber,
                            success: false,
                            error: error_2 instanceof Error ? error_2.message : 'Unknown error'
                        });
                        return [3 /*break*/, 8];
                    case 8:
                        // Progress logging
                        if ((i + 1) % 10 === 0 || i === dotNumbers.length - 1) {
                            console.log("Progress: ".concat(i + 1, "/").concat(dotNumbers.length, " carriers processed (").concat(results.successful, " successful, ").concat(results.failed, " failed)"));
                        }
                        _a.label = 9;
                    case 9:
                        i++;
                        return [3 /*break*/, 1];
                    case 10:
                        console.log("Bulk scrape completed: ".concat(results.successful, " successful, ").concat(results.failed, " failed"));
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Check if an entity is a carrier based on entity type and other indicators
     */
    SAFERScraper.prototype.isCarrierEntity = function (data) {
        return (0, carrier_filter_1.isCarrierEntity)(data);
    };
    /**
     * Update carrier data in database
     */
    SAFERScraper.prototype.updateCarrierInDatabase = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var supabase, now, updateData, existingCarrier, error, error, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supabase_server_1.createClient)()];
                    case 1:
                        supabase = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, , 9]);
                        // Check if this entity is actually a carrier
                        if (!this.isCarrierEntity(data)) {
                            console.log("Skipping non-carrier entity ".concat(data.dot_number, " (").concat(data.entity_type, "): ").concat(data.legal_name));
                            return [2 /*return*/];
                        }
                        now = new Date().toISOString();
                        updateData = {
                            legal_name: data.legal_name,
                            dba_name: data.dba_name,
                            physical_address: data.physical_address,
                            phone: data.phone,
                            safety_rating: data.safety_rating,
                            insurance_status: data.insurance_status,
                            authority_status: data.authority_status,
                            state: data.state,
                            city: data.city,
                            vehicle_count: data.vehicle_count,
                            // New freight broker fields
                            driver_count: data.driver_count,
                            safety_review_date: data.safety_review_date,
                            safety_rating_date: data.safety_rating_date,
                            total_mileage: data.total_mileage,
                            interstate_operation: data.interstate_operation,
                            hazmat_flag: data.hazmat_flag,
                            passenger_flag: data.passenger_flag,
                            migrant_flag: data.migrant_flag,
                            pc_flag: data.pc_flag,
                            crash_indicator: data.crash_indicator,
                            inspection_indicator: data.inspection_indicator,
                            entity_type: data.entity_type,
                            ein_number: data.ein_number,
                            mc_number: data.mc_number,
                            mx_number: data.mx_number,
                            operating_status: data.operating_status,
                            credit_score: data.credit_score,
                            out_of_service_date: data.out_of_service_date,
                            mcs_150_date: data.mcs_150_date,
                            operation_classification: data.operation_classification,
                            carrier_operation: data.carrier_operation,
                            // Enhanced freight broker fields
                            crash_count: data.crash_count,
                            fatal_crashes: data.fatal_crashes,
                            injury_crashes: data.injury_crashes,
                            tow_away_crashes: data.tow_away_crashes,
                            inspection_count: data.inspection_count,
                            inspection_violations: data.inspection_violations,
                            out_of_service_orders: data.out_of_service_orders,
                            out_of_service_rate: data.out_of_service_rate,
                            driver_inspections: data.driver_inspections,
                            vehicle_inspections: data.vehicle_inspections,
                            insurance_carrier: data.insurance_carrier,
                            insurance_policy_number: data.insurance_policy_number,
                            insurance_amount: data.insurance_amount,
                            insurance_effective_date: data.insurance_effective_date,
                            insurance_expiry_date: data.insurance_expiry_date,
                            cargo_insurance_amount: data.cargo_insurance_amount,
                            financial_responsibility_status: data.financial_responsibility_status,
                            equipment_types: data.equipment_types,
                            service_areas: data.service_areas,
                            years_in_business: data.years_in_business,
                            annual_revenue: data.annual_revenue,
                            fleet_age: data.fleet_age,
                            drug_testing_program: data.drug_testing_program,
                            alcohol_testing_program: data.alcohol_testing_program,
                            hazmat_certification: data.hazmat_certification,
                            passenger_certification: data.passenger_certification,
                            school_bus_certification: data.school_bus_certification,
                            email: data.email,
                            website: data.website,
                            emergency_contact: data.emergency_contact,
                            emergency_phone: data.emergency_phone,
                            business_hours: data.business_hours,
                            data_source: 'safer_scraper', // Always set to scraper when updated by scraper
                            last_verified: now,
                            updated_at: now
                        };
                        return [4 /*yield*/, supabase
                                .from('carriers')
                                .select('id')
                                .eq('dot_number', data.dot_number)
                                .single()];
                    case 3:
                        existingCarrier = (_a.sent()).data;
                        if (!existingCarrier) return [3 /*break*/, 5];
                        return [4 /*yield*/, supabase
                                .from('carriers')
                                .update(updateData)
                                .eq('dot_number', data.dot_number)];
                    case 4:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error("Failed to update carrier ".concat(data.dot_number, ":"), error);
                        }
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, supabase
                            .from('carriers')
                            .insert(__assign(__assign({}, updateData), { dot_number: data.dot_number, created_at: now }))];
                    case 6:
                        error = (_a.sent()).error;
                        if (error) {
                            console.error("Failed to create carrier ".concat(data.dot_number, ":"), error);
                        }
                        _a.label = 7;
                    case 7:
                        // Skip sync logging for now since api_sync_log table may not exist
                        console.log("Successfully updated carrier ".concat(data.dot_number, " in database"));
                        return [3 /*break*/, 9];
                    case 8:
                        error_3 = _a.sent();
                        console.error("Database update failed for ".concat(data.dot_number, ":"), error_3);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sleep utility for rate limiting
     */
    SAFERScraper.prototype.sleep = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    /**
     * Get carriers that need scraping (prioritized list)
     */
    SAFERScraper.prototype.getCarriersToScrape = function () {
        return __awaiter(this, arguments, void 0, function (limit) {
            var supabase, carriers, error_4;
            if (limit === void 0) { limit = 50; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, supabase_server_1.createClient)()];
                    case 1:
                        supabase = _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, supabase
                                .from('carriers')
                                .select('dot_number')
                                .limit(limit)];
                    case 3:
                        carriers = (_a.sent()).data;
                        return [2 /*return*/, (carriers === null || carriers === void 0 ? void 0 : carriers.map(function (c) { return c.dot_number; })) || []];
                    case 4:
                        error_4 = _a.sent();
                        console.error('Failed to get carriers to scrape:', error_4);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SAFERScraper;
}());
exports.SAFERScraper = SAFERScraper;
