include("mjsunit.js");
include("../../module/node-couch.js");

function unwantedError(result) {
	throw("Unwanted error" + JSON.stringify(result));
}

var db;

function onLoad () {
	CouchDB.generateUUIDs({
		count : 1,
		success : withUUIDs,
		error : unwantedError
	});
}

function withUUIDs(uuids) {
	db = CouchDB.db("test" + uuids[0]);
	db.create({
		success : withDB,
		error : unwantedError
	});
}

function withDB() {
	db.compact({
		success: afterCompact,
		error : unwantedError
	});
}

function afterCompact() {
	db.info({
		success : withInfo,
		error : unwantedError
	});
}

function withInfo(info) {
	assertEquals(db.name, info.db_name);

	db.drop({
		success : afterDrop,
		error : unwantedError
	});
}

function afterDrop() {
	db = "success";
}

function onExit() {
	assertEquals("success", db, "Please check the chain, last callback was never reached");
}