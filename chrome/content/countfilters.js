/**
 * Count Filters Thunderbird Plugin
 *
 * @copyright Copyright(c) 2015 Antoine Dumoulin
 * @author Antoine Dumoulin <dumoulinantoine@hotmail.com>
 * @license GPL v3
 *
 * This extension was written taking examples out of FiltaQuilla
 * and Expression Search extensions
 * Tip of the hat to their respective author for the good work !
 */

"use strict";

Components.utils.import("resource:///modules/gloda/utils.js");

var CountFilters = {
	prefs: Services.prefs.getBranch("extensions.countfilters."),
	startup: function() {
 		CountFilters.prefs.addObserver("", this, false);
	},
	installFilters: function() {
		// seems that stringbundle is not installed properly in empty overlay, using direct API instead

		var strbundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://countfilters/locale/countfilters.properties");
		var nbRecipients = {
			id: "countfilters#nbRecipients",
			name: strbundle.GetStringFromName("nbRecipients"),
			needsBody: false,
			getEnabled: CountFilters.getEnabled,
			getAvailable: function(scope,op) { return CountFilters.getAvailable(scope,op,"nbRecipients"); },
			getAvailableOperators: CountFilters.getAvailableOperators,
			match: function(aMsgHdr, aSearchValue, aSearchOp) {
				var recipientList = GlodaUtils.parseMailAddresses([aMsgHdr.recipients, aMsgHdr.ccList, aMsgHdr.bccList].join(', ')).fullAddresses.join(', ');
				var recipientSplitList = recipientList.split(", ");
				var nbRecipients = 1;
				if (recipientSplitList) {
					nbRecipients = recipientSplitList.length;
				}
				return CountFilters.isValueMatch(nbRecipients,aSearchValue,aSearchOp);
			}
		};
		var nbBytes = {
			id: "countfilters#nbBytes",
			name: strbundle.GetStringFromName("nbBytes"),
			needsBody: true,
			getEnabled: CountFilters.getEnabled,
			getAvailable: function(scope,op) { return CountFilters.getAvailable(scope,op,"nbBytes"); },
			getAvailableOperators: CountFilters.getAvailableOperators,
			match: function(aMsgHdr, aSearchValue, aSearchOp) {
				var body = CountFilters.retrieveBody(aMsgHdr);
				if (body == "__NO_BODY__") {
					return false;
				}
				var nbBytes = body.length;
				return CountFilters.isValueMatch(nbBytes,aSearchValue,aSearchOp);
			}
		};
		var nbWords = {
			id: "countfilters#nbWords",
			name: strbundle.GetStringFromName("nbWords"),
			needsBody: true,
			getEnabled: CountFilters.getEnabled,
			getAvailable: function(scope,op) { return CountFilters.getAvailable(scope,op,"nbWords"); },
			getAvailableOperators: CountFilters.getAvailableOperators,
			match: function(aMsgHdr, aSearchValue, aSearchOp) {
				var body = CountFilters.retrieveBody(aMsgHdr);
				if (body == "__NO_BODY__") {
					return false;
				}
				var nbWords = 0;
				body = body.replace(/[\r\n,;\:\.'\!\?\)\(]/g," ");
				var matchWords = body.match(/\S*\w+\S*/g);
				if (matchWords) {
					nbWords = matchWords.length;
				}
				return CountFilters.isValueMatch(nbWords,aSearchValue,aSearchOp);
			}
		};
		var nbLines = {
			id: "countfilters#nbLines",
			name: strbundle.GetStringFromName("nbLines"),
			needsBody: true,
			getEnabled: CountFilters.getEnabled,
			getAvailable: function(scope,op) { return CountFilters.getAvailable(scope,op,"nbLines"); },
			getAvailableOperators: CountFilters.getAvailableOperators,
			match: function(aMsgHdr, aSearchValue, aSearchOp) {
				// NB : forced to do this by hand as aMsgHdr.lineCount is useless
				var body = CountFilters.retrieveBody(aMsgHdr);
				if (body == "__NO_BODY__") {
					return false;
				}
				var nbLines = 1;
				body = body.replace('\r','');
				body = body.replace(/[\n][\n]+$/g,'\n'); // remove trailing lines
				var matchNewLines = body.match(/\n/g);
				if (matchNewLines) {
					nbLines = matchNewLines.length;
				}
				return CountFilters.isValueMatch(nbLines,aSearchValue,aSearchOp);
			}
		};
		var nbLinks = {
			id: "countfilters#nbLinks",
			name: strbundle.GetStringFromName("nbLinks"),
			needsBody: true,
			getEnabled: CountFilters.getEnabled,
			getAvailable: function(scope,op) { return CountFilters.getAvailable(scope,op,"nbLinks"); },
			getAvailableOperators: CountFilters.getAvailableOperators,
			match: function(aMsgHdr, aSearchValue, aSearchOp) {
				// url regexp courtesy of validator.js
				var urlRegexp = /\W(?:(?:http|https|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:(\/|\?|#)[^\s]*)?\W/ig;
				var body = CountFilters.retrieveBody(aMsgHdr);
				if (body == "__NO_BODY__") {
					return false;
				}
				body = body.replace(/[\r\n]+/g," ");
				var nbLinks = 0;
				var matchLinks = body.match(urlRegexp);
				if (matchLinks) {
					nbLinks = matchLinks.length;
				}
				return CountFilters.isValueMatch(nbLinks,aSearchValue,aSearchOp);
			}
		};
		var filterService = Components.classes["@mozilla.org/messenger/services/filters;1"].getService(Components.interfaces.nsIMsgFilterService);
		filterService.addCustomTerm(nbRecipients);
		filterService.addCustomTerm(nbBytes);
		filterService.addCustomTerm(nbWords);
		filterService.addCustomTerm(nbLines);
		filterService.addCustomTerm(nbLinks);
	},
	isLocalSearch: function(scope) {
    	return (scope == Components.interfaces.nsMsgSearchScope.offlineMail
    		|| scope == Components.interfaces.nsMsgSearchScope.offlineMailFilter
    		|| scope == Components.interfaces.nsMsgSearchScope.onlineMailFilter
    		|| scope == Components.interfaces.nsMsgSearchScope.localNews);
	},
	isValueMatch: function(baseValue,compValue,op) {
		if (!compValue) {
			compValue = 0;
		}
		if (op == nsMsgSearchOp.Is) {
			return (baseValue == compValue);
		}
		else if (op == nsMsgSearchOp.Isnt) {
			return (baseValue != compValue);
		}
		else if (op == nsMsgSearchOp.IsGreaterThan) {
			return (baseValue > compValue);
		}
		else if (op == nsMsgSearchOp.IsLessThan) {
			return (baseValue < compValue);
		}
		else {
			return true; // ignore filter, operator unsupported
		}
	},
 	getEnabled: function(scope,op) {
 		return CountFilters.isLocalSearch(scope);
	},
	getAvailable: function(scope,op,id) {
		var isActive = CountFilters.prefs.getBoolPref(id);
		return isActive && CountFilters.isLocalSearch(scope);
	},
	getAvailableOperators: function(scope,length) {
		if (!CountFilters.isLocalSearch(scope))
		{
			length.value = 0;
			return [];
		}
		length.value = 4;
		return [ nsMsgSearchOp.Is, nsMsgSearchOp.Isnt, nsMsgSearchOp.IsGreaterThan, nsMsgSearchOp.IsLessThan ];
	},
	retrieveBody: function(aMsgHdr) {
		var folder = aMsgHdr.folder;
		var stream;
		var body = "";
		try {
			// it seems the right message size is the offline one when message is stored locally
			var data;
			var messageSize = folder.hasMsgOffline(aMsgHdr.messageKey) ? aMsgHdr.offlineMessageSize : aMsgHdr.messageSize;
			try {
				stream = folder.getMsgInputStream(aMsgHdr, {});
				var scriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
            	data = NetUtil.readInputStreamToString(stream, aMsgHdr.offlineMessageSize);
			}
			catch(ex) {
				return "__NO_BODY__";
			}
			data = data.replace(/\r+/g,"");
			var lines = data.split("\n");
			var boundaryIds = [];
			var encoding="8bit";
			var textType = "plain";
			var inTextHeader = true;
			var isMultipartContentType = false;
			var inBody = false;
			for (var i=0;i<lines.length;i++) {
				var line = lines[i];
				if (inBody) {
					var end = false;
					if (line.startsWith("--")) {
						for (var j=0;j<boundaryIds.length;j++) {
							if (line == "--"+boundaryIds[j] || line == "--"+boundaryIds[j]+"--") {
								end = true; // stop on first boundary
							}
						}
					}
					if (end) {
						break;
					}
					body += line+"\r\n";
				}
				if (inTextHeader && line.length == 0) {
					inBody = true;
					inTextHeader = false;
				}
				var boundaryMatch1 = line.match(/^Content-Type:\s*multipart.*boundary=['"]?([^'"]+)['"]?/i);
				if (boundaryMatch1) {
					boundaryIds.push(boundaryMatch1[1]);
				}
				else if (isMultipartContentType) {
					var boundaryMatch2 = line.match(/\s*boundary=['"]?([^'"]+)['"]?/i);
					if (boundaryMatch2) {
						boundaryIds.push(boundaryMatch2[1]);
					}
				}
				isMultipartContentType = false;
				var contentEncodingMatch=line.match(/^Content-Transfer-Encoding:\s*([^;\s]*)/i);
				if (contentEncodingMatch && contentEncodingMatch[1]) {
					encoding = contentEncodingMatch[1].toLowerCase();
				}
				var contentTypeMatch = line.match(/^Content-Type:\s*([^\/]+)\/([^;\s]+)/i);
				if (contentTypeMatch && contentTypeMatch[1] && contentTypeMatch[2]) {
					if (contentTypeMatch[1].toLowerCase() == "text") {
						textType = contentTypeMatch[2].toLowerCase();
						inTextHeader = true;
					}
					else {
						inTextHeader = false;
						if (contentTypeMatch[1].toLowerCase() == "multipart") {
							isMultipartContentType = true;
						}
					}
				}
			}
			if (body) {
				try {
					body = CountFilters.decode(encoding,body);
				}
				catch (ex) {} // ignore
			}
			if (textType != "plain") {
				var parserUtils = Components.classes["@mozilla.org/parserutils;1"].getService(Components.interfaces.nsIParserUtils);
            	body = parserUtils.convertToPlainText(body, Components.interfaces.nsIDocumentEncoder.OutputBodyOnly, 0);
         	}

		}
		finally {
			if (stream) {
				stream.close();
			}
		}
		return body;
	},
	decode: function(encoding,data) {
		var decodedData = "";
		if (!encoding) {
			throw "No encoding specified for mime decoding";
		}
		encoding = encoding.toLowerCase();
		if (encoding == "base64") {
			decodedData = window.atob(data);
		}
		else if (encoding == "quoted-printable") {
			decodedData = data.replace(/\s+^/g,'') // remove trailing white spaces
							   .replace(/=\r\n/g,'') 	 // remove soft line breaks
							   .replace(/=([a-fA-F0-9]{2})/g, function($0, $1) {
							   		// encode decimal point
							   		return String.fromCharCode(parseInt($1, 16)); });
		}
		else if (encoding == "7bit" || encoding == "8bit" || encoding == "none") {
			decodedData = data; // nothing to decode
		}
		else {
			throw (encoding + " encoding cannot be decoded");
		}
		return decodedData;
	},
	shutdown: function() {
		CountFilters.prefs.removeObserver("", this);
	}
};

window.addEventListener("load", function(e) { CountFilters.startup(); }, false);
window.addEventListener("unload", function(e) { CountFilters.shutdown(); }, false);

if (!Application.storage.get("countFiltersInstalled", false)) { // testing if filters are already installed
	CountFilters.installFilters();
	Application.storage.set("countFiltersInstalled", true);
}
