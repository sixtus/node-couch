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
  // Possible basic auth eg: "http://admin:password@127.0.0.1:5984"
    defaultHost : "http://localhost:5984",
    debug : true,
    
    activeTasks: function(options) {
        _interact("get", "/_active_tasks", 200, options, CouchDB.defaultHost);
    },
    
    allDbs : function(options) {
        _interact("get", "/_all_dbs", 200, options, CouchDB.defaultHost);    
    },
    
    generateUUIDs : function(options) {
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
        return {
            name : name,
            uri  : "/" + encodeURIComponent(name) + "/",
            host : host || CouchDB.defaultHost,

            interact : function(verb, path, successStatus, options, suppressPrefix) {
                if (!suppressPrefix) {
                    path = this.uri + path;
                }
                _interact(verb, path, successStatus, options, this.host);
            },
            
            compact : function(options) {
                this.interact("post", "_compact", 202, options);
            },
            
            create : function(options) {
                this.interact("put", "", 201, options);
            },
            
            drop : function(options) {
                this.interact("del", "", 200, options);
            },
            
            info : function(options) {
                this.interact("get", "", 200, options);                
            },

            allDocs : function(options) {
                this.interact("get", "_all_docs", 200, options);
            },

            openDoc : function(docId, options) {
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
                options = options || {};
                options.rev = doc._rev;

                var success = options.success;
                options.success = function(result) {
                    if (!result.ok) {
                        options.error(result);
                    }
                    delete doc._rev;
                    if (success) {
                        success(doc);                         
                    }
                };

                this.interact("del", doc._id, 200, options);
            },

            view : function(name, options) {
                name = name.split('/');
                this.interact("get", "_design/" + name[0] + "/_view/" + name[1], 200, options);
            }
        }    
    }
};

exports.CouchDB = CouchDB;
