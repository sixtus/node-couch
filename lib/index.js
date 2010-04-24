/*
Copyright (c) 2009 Hagen Overdick

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var sys = require('sys'),
    http = require('http'),
    url = require('url'),
    base64 = require('./base64');

var clients = {};
function cache_client(host) {
    // summary:
    //          Creates or fetches an HTTP Client for the specified host.
    // description:
    //          If we've already created an HTTPClient object for the host 
    //          argument, fetch it from the client cache object.  Otherwise, 
    //          create a new HTTPClient object and return it after adding it to 
    //          the cache.
    // host: String
    //          CouchDB Host URL.
    // returns:
    //          An HTTPClient object associated with the specified host.
    
    var client = clients[host];
    if (client) {
        return client;
    } else {
        var uri = url.parse(host);
        return clients[host] = http.createClient(uri.port, uri.hostname);
    }
}

function _interact(verb, path, successStatus, options, host) {
    // summary:
    //          Interacts with the CouchDB server.
    // description:
    //          Allows for interaction with the CouchDB server given the 
    //          appropriate REST request details as specified in the arguments 
    //          to this function.
    // verb: String
    //          HTTP request type (or verb).  E.g. GET, PUT, POST, DELETE
    // path: String
    //          CouchDB resource path.
    // successStatus: Integer
    //          The HTTP response code we expect on a successful interaction 
    //          with the server.
    // options: Object
    //          Options for the interaction with the server.
    //          {
    //              body: Object,
    //              keys: ?,
    //              key:
    //              startKey:
    //              endKey:
    //              request: Function,
    //              success: Function,
    //              error: Function
    //          }
    // host: String
    //          CouchDB host to connect to.
    
    // Sanitize the verb and options parameters.
    verb = verb.toUpperCase();
    options = options || {};
    
    // placeholder for the HTTP request object.
    var request; 
    
    var client = cache_client(host);
    var requestPath = path + encodeOptions(options);
    if (CouchDB.debug) {
        sys.puts("COUCHING " + requestPath + " -> " + verb);
    }

    var uri = url.parse(host);
    var headers = {};
    headers["Host"] = uri.hostname;
    if (uri.auth) {
        headers["Authorization"] = "Basic "+base64.encode(uri.auth);
    }
    
    if (options.keys) {
        options.body = {keys: options.keys};
    }    
    
    if (options.body) {        
        if (verb === "get") {
            verb = "post";
        }
        var requestBody = toJSON(options.body);

        headers["Content-Length"] = requestBody.length;
        headers["Content-Type"] = "application/json";

        request = client.request(verb, requestPath, headers);
        request.write(requestBody, "utf8");
    } else {
        request = client.request(verb, requestPath, headers);
    }
    
    request.addListener('response', function(response) {
        var responseBody = ""

        response.setBodyEncoding("utf8");
        
        response.addListener("data", function(chunk) {
            responseBody += chunk
        });
        
        response.addListener("end", function() {
            if (CouchDB.debug) {
                sys.puts("COMPLETED " + requestPath + " -> " + verb);
                sys.puts(responseBody)
            }
            responseBody = JSON.parse(responseBody);
            
            if (response.statusCode === successStatus) {
                if (options.success) {
                    options.success(responseBody);
                }
            } else if (options.error) {
                options.error(responseBody);
            }
        });
    });
    
    request.end();
    
}

function encodeOptions(options) {
    // summary:
    //          Builds an HTTP query string given an object containing options 
    //          for an interaction with the CouchDB server.
    // options:
    //          See description in _interact(...) above.
    // returns:
    //          Query string for the HTTP request to the CouchDB server.
    
    var result = [];
    
    if (typeof(options) === "object" && options !== null) {
        // Iterate through all of the options, and add an entry into the result 
        //  array if it's a key.
        for (var name in options) {
            if (options.hasOwnProperty(name)) {
                if (name === "request" || name === "error" || name === "success" || name === "body" || name === "keys") {
                    continue;
                }
                
                var value = options[name];
                
                if (name == "key" || name == "startkey" || name == "endkey") {
                    value = toJSON(value);
                }
                
                result.push(encodeURIComponent(name) + "=" + encodeURIComponent(value));
            }
        }
    }
    
    return result.length ? ("?" + result.join("&")) : "";
}

function toJSON(obj) {
    // summary:
    //          Builds a JSON string from an object.
    // description:
    //          Sanitizes the object, if it's null we'll return null, otherwise 
    //          we'll use JSON.stringify to convert it.
    // obj: Object
    //          Object to convert to JSON
    // returns:
    //          JSON string representation of obj.
    return obj !== null ? JSON.stringify(obj) : null;
}

var CouchDB = {
    // summary:
    //          The main node-couch utility object.
    // description:
    //          
    
    // defaultHost: String
    //          The default hostname to try and connect to a CouchDB instance 
    //          on.  Hostnames can include Basic Authentication parameters as
    //          well:
    //              "http://admin:password@127.0.0.1:5984"
    defaultHost : "http://localhost:5984",
    
    // debug: Boolean
    //          Flag to tell the node-couch module whether or not it should log
    //          certain actions.
    debug : true,
    
    activeTasks: function(options) {
        // summary: 
        //          Gets all of the active tasks from CouchDB.
        // description:
        //          Makes a GET request to [host]/_active_tasks with the 
        //          specified options.
        // options:
        //          Common options object.
        _interact("get", "/_active_tasks", 200, options, CouchDB.defaultHost);
    },
    
    allDbs : function(options) {
        // summary:
        //          Gets a list of all the databases from CouchDB.
        // description:
        //          Makes a GET request to [host]/_all_dbs with the specified 
        //          options.
        // options:
        //          Common options object.
        _interact("get", "/_all_dbs", 200, options, CouchDB.defaultHost);    
    },
    
    generateUUIDs : function(options) {
        // summary:
        //          Generates a bunch of UUIDs from the server.
        // description:
        //          Makes a GET request to [host]/_uuids with the specified 
        //          options. Note: the result object that gets passed to 
        //          options.success will only contain the UUIDs
        // options:
        //          Common options object.
        options = options || {};
        if (!options.count) {
            options.count = 100;
        }
        var callback = options.success;
        options.success = function(result) {
            callback(result.uuids);
        };
        _interact("get", "/_uuids", 200, options, CouchDB.defaultHost);
    },
    
    db : function(name, host) {
        // summary:
        //          Creates and returns an object that allows the user to 
        //          communicate with the specified database.
        // description:
        //          Returns an object that can communicate with a CouchDB 
        //          database of the specified name at the specified host.
        // name: String
        //          Name of the database to connect to.
        // host: String - Optional
        //          Host where the database is located.  If no host is 
        //          specified, CouchDB.defaultHost will be used.
        // returns:
        //          A connection object for the database with the specified name 
        //          at the specified host.
        //          {
        //              name: String
        //              uri: String
        //              host: String
        //              interact: Function
        //              compact: Function
        //              create: Function
        //              drop: Function
        //              info: Function
        //              allDocs: Function
        //              openDoc: Function
        //              saveDoc: Function
        //              removeDoc: Function
        //              view: Function
        //          }
        //          See the documentation on each of the functions in the object 
        //          itself for more info.
        return {
            // name: String
            //          Name of the database.
            name : name,
            
            // uri: String
            //          URI for the database - after the host string.
            uri  : "/" + encodeURIComponent(name) + "/",
            
            // host: String
            //          Hostname where the database with name 'name' is located.
            host : host || CouchDB.defaultHost,

            interact : function(verb, path, successStatus, options, suppressPrefix) {
                // summary:
                //          Interacts with the the database.
                // description:
                //          Given the verb, path, expected success status, etc. 
                //          This will make a connection to the database and 
                //          perform some action.  This function should be used 
                //          when node-couch doesn't explicitly define what 
                //          you're trying to do with your database as a node-
                //          couch function.
                // verb: String
                //          HTTP Verb
                // path: String
                //          If suppressPrefix is true, it's the Post-URI path.  
                //          That is, it's the stuff that comes after 
                //          [host]/[name]/ in a URL.  Otherwise, it's a full 
                //          path.
                // successStatus: Integer
                //          HTTP status code that indicates successful 
                //          interaction.
                // options: Object
                //          Standard options object.
                // suppressPrefix: Boolean
                //          Whether or not to interpret the path as the segment 
                //          after the database name.
                if (!suppressPrefix) {
                    path = this.uri + path;
                }
                _interact(verb, path, successStatus, options, this.host);
            },
            
            compact : function(options) {
                // summary:
                //          Compacts the database. 
                // description:
                //          Performs compaction on the database. See more at the 
                //          CouchDB wiki:
                //              http://wiki.apache.org/couchdb/Compaction
                // options: Object
                //          Standard options object.
                this.interact("post", "_compact", 202, options);
            },
            
            create : function(options) {
                // summary:
                //          Creates the database.
                // description:
                //          Will create the database with the name of this 
                //          object. See more at the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_database_API
                // options: Object
                //          Standard options object.
                this.interact("put", "", 201, options);
            },
            
            drop : function(options) {
                // summary:
                //          Deletes the database.
                // description:
                //          Will delete the database with the name of this 
                //          object. See more at the CouchDB wiki: 
                //              http://wiki.apache.org/couchdb/HTTP_database_API
                // options: Object
                //          Standard options object.
                this.interact("del", "", 200, options);
            },
            
            info : function(options) {
                // summary:
                //          Gets information about the database.
                // description:
                //          Will get information about the database.  See more 
                //          at the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_database_API
                // options: Object
                //          Standard options object.
                this.interact("get", "", 200, options);                
            },

            allDocs : function(options) {
                // summary:
                //          Bulk document fetch function.
                // description:
                //          Makes a GET request to [host]/[name]/_all_docs and 
                //          gets a bulk amount of documents back. For more 
                //          information, see the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API
                // options: Object
                //          Standard options object.
                this.interact("get", "_all_docs", 200, options);
            },

            openDoc : function(docId, options) {
                // summary:
                //          Fetches a particular document by its ID.
                // description:
                //          Makes a GET request to the database to fetch the 
                //          document specified by the docId parameter.  
                //          Depending on the type of the docId parameter, it 
                //          does one of two things:
                //          1. Gets the document directly (if the docId is a 
                //              string)
                //          2. Assumes the docId is an Array containing keys 
                //              and filters a bulk request of _all_docs to 
                //              retrieve those documents.
                //          See more at the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_Document_API
                //              http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API
                // docId: String|Object
                //          If a string, it is interpreted as the id of the 
                //          specific document to retrieve. Else, it's assumed to 
                //          be an array containing several IDs.
                // options: Object
                //          Standard options object.
                var path;
                if (typeof docId === "string") {
                    path = docId;                
                } else {
                    path = "_all_docs";
                    options.body = {
                        keys : docId
                    };                
                }
                this.interact("get", path, 200, options); // interact will override get to post when needed
            },

            saveDoc : function(doc, options) {
                // summary:
                //          Creates or updates a particular document.
                // description:
                //          Given the document to save, this function determines 
                //          whether or not it's a new document and either 
                //          creates the document in the database or updates an 
                //          existing one with the same ID.
                //          See more a the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_Document_API
                // doc: Object
                //          Document to save.
                // options: Object
                //          Standard options object.
                options = options || {};
                doc = doc || {};
                var success = options.success;
                options.success = function(result) {
                    if (!result.ok) {
                        options.error(result);
                    } else {
                        doc._id = result.id;
                        doc._rev = result.rev;
                    }
                    if (success) { success(doc); }
                };

                options.body = doc;

                if (doc._id === undefined) {
                    this.interact("post", "", 201, options);
                } else {
                    this.interact("put", doc._id, 201, options);
                }
            },

            removeDoc : function(doc, options) {
                // summary:
                //          Deletes a document from the database.
                // description:
                //          Makes a DELETE http request to the database with the 
                //          specified document's ID to delete the document. See
                //          more at the CouchDB wiki:
                //              http://wiki.apache.org/couchdb/HTTP_Document_API
                // doc: Object
                //          Document to delete. Must have an _id and a _rev.
                // options: Object
                //          Standard options object.
                options = options || {};
                options.rev = doc._rev;

                var success = options.success;
                options.success = function(result) {
                    if (!result.ok) {
                        options.error(result); // should this return, so success(doc) doesn't get called?
                    }
                    delete doc._rev;
                    if (success) {
                        success(doc);                         
                    }
                };

                this.interact("del", doc._id, 200, options);
            },

            view : function(name, options) {
                // summary:
                //          Gets a view of the database.
                // description:
                //          Given a name where the first part is the design and 
                //          the second is the view, will get a view of the 
                //          database.  For more information see the CouchDB 
                //          wiki:
                //              http://wiki.apache.org/couchdb/HTTP_view_API
                // name: String
                //          Design and view names. Separated by a slash.  
                //          E.g. company/all
                // options: Object
                //          Standard options object.
                name = name.split('/');
                this.interact("get", "_design/" + name[0] + "/_view/" + name[1], 200, options);
            }
        }    
    }
};

exports.CouchDB = CouchDB;
