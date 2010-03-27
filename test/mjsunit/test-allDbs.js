var jslint = require("mjsunit"),
	couch = require("../../module/node-couch").CouchDB;

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

couch.allDbs({
	success : function(response) {
		var result = response;

		jslint.assertInstanceof(result, Array);
		for (var ii = 0; ii < result.length; ii++) {
			jslint.assertEquals("string", typeof result[ii]);
		}

	},
	error : unwantedError
});


