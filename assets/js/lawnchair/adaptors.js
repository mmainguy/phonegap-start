// inline the AIR aliases file, edited to include only what we need

/* AIRAliases.js - Revision: 2.0beta */

/*
ADOBE SYSTEMS INCORPORATED
Copyright 2007-2008 Adobe Systems Incorporated. All Rights Reserved.
 
NOTICE:		Adobe permits you to modify and distribute this file only in accordance with
the terms of Adobe AIR SDK license agreement.  You may have received this file from a
source other than Adobe.	Nonetheless, you may modify or
distribute this file only in accordance with such agreement.

http://www.adobe.com/products/air/tools/sdk/eula/
*/

var air;
if (window.runtime)
{
		if (!air) air = {};
		// functions
		air.trace = window.runtime.trace;

		// file
		air.File = window.runtime.flash.filesystem.File;
		air.FileStream = window.runtime.flash.filesystem.FileStream;
		air.FileMode = window.runtime.flash.filesystem.FileMode;

		// data
		air.EncryptedLocalStore = window.runtime.flash.data.EncryptedLocalStore;
		air.SQLCollationType = window.runtime.flash.data.SQLCollationType;
		air.SQLColumnNameStyle = window.runtime.flash.data.SQLColumnNameStyle;
		air.SQLColumnSchema = window.runtime.flash.data.SQLColumnSchema;
		air.SQLConnection = window.runtime.flash.data.SQLConnection;
		air.SQLError = window.runtime.flash.errors.SQLError;
		air.SQLErrorEvent = window.runtime.flash.events.SQLErrorEvent;
		air.SQLErrorOperation = window.runtime.flash.errors.SQLErrorOperation;
		air.SQLEvent = window.runtime.flash.events.SQLEvent;
		air.SQLIndexSchema = window.runtime.flash.data.SQLIndexSchema;
		air.SQLMode = window.runtime.flash.data.SQLMode;
		air.SQLResult = window.runtime.flash.data.SQLResult;
		air.SQLSchema = window.runtime.flash.data.SQLSchema;
		air.SQLSchemaResult = window.runtime.flash.data.SQLSchemaResult;
		air.SQLStatement = window.runtime.flash.data.SQLStatement;
		air.SQLTableSchema = window.runtime.flash.data.SQLTableSchema;
		air.SQLTransactionLockType = window.runtime.flash.data.SQLTransactionLockType;
		air.SQLTriggerSchema = window.runtime.flash.data.SQLTriggerSchema;
		air.SQLUpdateEvent = window.runtime.flash.events.SQLUpdateEvent;
		air.SQLViewSchema = window.runtime.flash.data.SQLViewSchema;

}



 
/**
 * AIRSQLiteAdaptor
 * ===================
 * AIR flavored SQLite implementation for Lawnchair.
 *
 * This uses synchronous connections to the DB. If this is available,
 * I think this is the better option, but in single-threaded apps it
 * may cause blocking. It might be reasonable to implement an alternative
 * that uses async connections.
 *
 */
var AIRSQLiteAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


AIRSQLiteAdaptor.prototype = {
	init:function(options) {
	
		var that = this;
		var merge = that.merge;
		var opts = (typeof arguments[0] == 'string') ? {table:options} : options;
	
		this.name = merge('Lawnchair', opts.name);
		this.table = merge('field', opts.table);
	
		this.conn = new air.SQLConnection();
		var appstoredir = air.File.applicationStorageDirectory;
		this.dbFile = appstoredir.resolvePath(this.name + ".sqlite.db");
	
		try {
			this.conn.open(this.dbFile);
		} catch(err) {
			air.trace('Error msg:'+err.message);
			air.trace('Error details:'+err.details);
		}

		this._execSql('create table if not exists ' + this.table + ' (id NVARCHAR(32) UNIQUE PRIMARY KEY, value TEXT, timestamp REAL)');
	},
	
	/*
	
	*/
	save:function(obj, callback) {
		var that = this;

		var insert = function(obj, callback) {
			var id;

			if (obj.key == undefined) {
				id = that.uuid();
			} else {
				id = obj.key;
			}
	
			delete(obj.key);
	
			var rs = that._execSql("INSERT INTO " + that.table + " (id, value, timestamp) VALUES (:id,:value,:timestamp)",
				{
					':id':id,
					':value':that.serialize(obj),
					':timestamp':that.now()
				}
			);
	
			if (callback != undefined) {
				obj.key = id;
				callback(obj);
			}
		};
	
		var update = function(id, obj, callback) {
			var rs = that._execSql("UPDATE " + that.table + " SET value=:value, timestamp=:timestamp WHERE id=:id",
				{
					':id':id,
					':value':that.serialize(obj),
					':timestamp':that.now()
				}
			);
	
			if (callback != undefined) {
				obj.key = id;
				callback(obj);
			}
		};
	
	
		if (obj.key == undefined) {
	
			insert(obj, callback);
		} else {
	
			this.get(obj.key, function(r) {
				var isUpdate = (r != null);
	
				if (isUpdate) {
					var id = obj.key;
					delete(obj.key);
					update(id, obj, callback);
				} else {
					insert(obj, callback);
				}
			});
		}
	
	},
	
	/*
	
	*/
	get:function(key, callback) {
		var rs = this._execSql("SELECT * FROM " + this.table + " WHERE id = :id",
			{
				':id':key
			}
		);
	
		if (rs.data && rs.data.length> 0) {
			var o = this.deserialize(rs.data[0].value);
			o.key = key;
			callback(o);
		} else {
			callback(null);
		}
	},

	all:function(callback) {
	
		if (typeof callback === 'string') {
			throw new Error("Callback was a string; strings are not supported for callback shorthand under AIR");
		}
	
		var cb	= this.terseToVerboseCallback(callback);
		var rs	= this._execSql("SELECT * FROM " + this.table);
		var r		= [];
		var o;
	
	
		if (rs.data && rs.data.length > 0) {
			var k = 0;
			var numrows = rs.data.length;

			while (k < numrows) {
				var thisdata = rs.data[k];
				o = this.deserialize(thisdata.value);
				o.key = thisdata.id;
					r.push(o);
				k++;
			}
		} else {
			r = [];
		}

		cb(r);


	},
	
	/*
	
	*/
	remove:function(keyOrObj, callback) {
	
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		var rs = this._execSql("DELETE FROM " + this.table + " WHERE id = :id",
			{
				':id':key
			},
			callback
		);
	},
	
	/*

	*/
	nuke:function(callback) {
		var rs = this._execSql("DELETE FROM " + this.table, {}, callback);
	},
	
	/*
		this is a wrapper for the overly complex AIR SQL API method of executing
		SQL statements
	*/
	_execSql:function(sql, params, onSuccess, onError) {
	
		var stmt = new air.SQLStatement();
		stmt.sqlConnection = this.conn;
		stmt.text = sql;
		if (params) {
			for (var key in params) {
				stmt.parameters[key] = params[key];
			}
		}
	
		try {
			stmt.execute();
	
			var rs = stmt.getResult();
			if (onSuccess) {
				onSuccess(rs.data);
			}

			return rs;
		} catch(err) {
			air.trace('Error:' + err.message);
			air.trace('Error details:' + err.details);
			if (onError) {
				onError(err);
			}
			return false;
		}
	}
};
// inline the AIR aliases file, edited to include only what we need

/* AIRAliases.js - Revision: 2.0beta */

/*
ADOBE SYSTEMS INCORPORATED
Copyright 2007-2008 Adobe Systems Incorporated. All Rights Reserved.
 
NOTICE:		Adobe permits you to modify and distribute this file only in accordance with
the terms of Adobe AIR SDK license agreement.  You may have received this file from a
source other than Adobe.	Nonetheless, you may modify or
distribute this file only in accordance with such agreement.

http://www.adobe.com/products/air/tools/sdk/eula/
*/

var air;
if (window.runtime)
{
		if (!air) air = {};
		// functions
		air.trace = window.runtime.trace;

		// file
		air.File = window.runtime.flash.filesystem.File;
		air.FileStream = window.runtime.flash.filesystem.FileStream;
		air.FileMode = window.runtime.flash.filesystem.FileMode;

		// data
		air.EncryptedLocalStore = window.runtime.flash.data.EncryptedLocalStore;
		air.SQLCollationType = window.runtime.flash.data.SQLCollationType;
		air.SQLColumnNameStyle = window.runtime.flash.data.SQLColumnNameStyle;
		air.SQLColumnSchema = window.runtime.flash.data.SQLColumnSchema;
		air.SQLConnection = window.runtime.flash.data.SQLConnection;
		air.SQLError = window.runtime.flash.errors.SQLError;
		air.SQLErrorEvent = window.runtime.flash.events.SQLErrorEvent;
		air.SQLErrorOperation = window.runtime.flash.errors.SQLErrorOperation;
		air.SQLEvent = window.runtime.flash.events.SQLEvent;
		air.SQLIndexSchema = window.runtime.flash.data.SQLIndexSchema;
		air.SQLMode = window.runtime.flash.data.SQLMode;
		air.SQLResult = window.runtime.flash.data.SQLResult;
		air.SQLSchema = window.runtime.flash.data.SQLSchema;
		air.SQLSchemaResult = window.runtime.flash.data.SQLSchemaResult;
		air.SQLStatement = window.runtime.flash.data.SQLStatement;
		air.SQLTableSchema = window.runtime.flash.data.SQLTableSchema;
		air.SQLTransactionLockType = window.runtime.flash.data.SQLTransactionLockType;
		air.SQLTriggerSchema = window.runtime.flash.data.SQLTriggerSchema;
		air.SQLUpdateEvent = window.runtime.flash.events.SQLUpdateEvent;
		air.SQLViewSchema = window.runtime.flash.data.SQLViewSchema;

}



 
/**
 * AIRSQLiteAsyncAdaptor
 * ===================
 * AIR flavored SQLite implementation for Lawnchair.
 *
 * This uses asynchronous connections to the DB.
 */
var AIRSQLiteAsyncAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


AIRSQLiteAsyncAdaptor.prototype = {
	init:function(options) {
	
		var that = this;
		var merge = that.merge;
		var opts = (typeof arguments[0] == 'string') ? {table:options} : options;
	
		this.name = merge('Lawnchair', opts.name);
		this.table = merge('field', opts.table);
	
		this.conn = new air.SQLConnection();
		var appstoredir = air.File.applicationStorageDirectory;
		this.dbFile = appstoredir.resolvePath(this.name + ".sqlite.db");
	
		try {
			this.conn.openAsync(this.dbFile);
		} catch(err) {
			air.trace('Error msg:'+err.message);
			air.trace('Error details:'+err.details);
		}

		this._execSql('create table if not exists ' + this.table + ' (id NVARCHAR(32) UNIQUE PRIMARY KEY, value TEXT, timestamp REAL)');
	},
	
	/*
	
	*/
	save:function(obj, callback) {
		var that = this;

		var insert = function(obj, callback) {
			var id;

			if (obj.key == undefined) {
				id = that.uuid();
			} else {
				id = obj.key;
			}
	
			delete(obj.key);
	
			that._execSql("INSERT INTO " + that.table + " (id, value, timestamp) VALUES (:id,:value,:timestamp)",
				{
					':id':id,
					':value':that.serialize(obj),
					':timestamp':that.now()
				},
				function(rs) {
					if (callback != undefined) {
						obj.key = id;
						callback(obj);
					}
				}
			);
		};
	
		var update = function(id, obj, callback) {
			that._execSql("UPDATE " + that.table + " SET value=:value, timestamp=:timestamp WHERE id=:id",
				{
					':id':id,
					':value':that.serialize(obj),
					':timestamp':that.now()
				},
				function(rs) {
					if (callback != undefined) {
						obj.key = id;
						callback(obj);
					}					
				}
			);
		};
	
	
		if (obj.key == undefined) {
	
			insert(obj, callback);
		} else {
	
			this.get(obj.key, function(r) {
				var isUpdate = (r != null);
	
				if (isUpdate) {
					var id = obj.key;
					delete(obj.key);
					update(id, obj, callback);
				} else {
					insert(obj, callback);
				}
			});
		}
	
	},
	
	/*
	
	*/
	get:function(key, callback) {
		var that = this;
		this._execSql("SELECT * FROM " + this.table + " WHERE id = :id",
			{
				':id':key
			},
			function(rs) {
				if (rs.data && rs.data.length> 0) {
					var o = that.deserialize(rs.data[0].value);
					o.key = key;
					callback(o);
				} else {
					callback(null);
				}
			}
		);
	},

	all:function(callback) {
		var that = this;
		
		if (typeof callback === 'string') {
			throw new Error("Callback was a string; strings are not supported for callback shorthand under AIR");
		}

		var cb	= this.terseToVerboseCallback(callback);
		this._execSql("SELECT * FROM " + this.table, null, function(rs) {
			var r		 = [];
			var o;
			if (rs.data && rs.data.length > 0) {
				var k = 0;
				var numrows = rs.data.length;

				while (k < numrows) {
					var thisdata = rs.data[k];
					o = that.deserialize(thisdata.value);
					o.key = thisdata.id;
						r.push(o);
					k++;
				}
			} else {
				r = [];
			}

			cb(r);
		});

	},
	
	/*
	
	*/
	remove:function(keyOrObj) {
	
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		this._execSql("DELETE FROM " + this.table + " WHERE id = :id",
			{
				':id':key
			}
		);
	},
	
	/*

	*/
	nuke:function() {
		this._execSql("DELETE FROM " + this.table);
	},
	
	/*
		this is a wrapper for the overly complex AIR SQL API method of executing
		SQL statements
	*/
	_execSql:function(sql, params, onSuccess, onError) {
	
		var stmt = new air.SQLStatement();
		stmt.sqlConnection = this.conn;
		stmt.text = sql;
		if (params) {
			for (var key in params) {
				stmt.parameters[key] = params[key];
			}
		}
		
		
		function resultHandler(event) {
			var rs = stmt.getResult();
			if (onSuccess) {
				onSuccess(rs);
			}
		}
		
		function errorHandler(event) {
			air.trace('Error:' + event.error.message);
			air.trace('Error details:' + event.error.details);
			if (onError) {
				onError(event.error);
			}
		}
		
		stmt.addEventListener(air.SQLEvent.RESULT, resultHandler); 
		stmt.addEventListener(air.SQLErrorEvent.ERROR, errorHandler);
		
		try {
			stmt.execute();
		} catch(err) {
			air.trace('Error:' + err.message);
			air.trace('Error details:' + err.details);
			if (onError) {
				onError(err);
			}
		}
	}
};
/**
 * BlackBerryPersistentStorageAdaptor
 * ===================
 * Implementation that uses the BlackBerry Persistent Storage mechanism. This is only available in PhoneGap BlackBerry projects
 * See http://www.github.com/phonegap/phonegap-blackberry
 *
 */
var BlackBerryPersistentStorageAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};

BlackBerryPersistentStorageAdaptor.prototype = {
	init:function() {
		// Check for the existence of the phonegap blackberry persistent store API
		if (!navigator.store)
			throw('Lawnchair, "This browser does not support BlackBerry Persistent Storage; it is a PhoneGap-only implementation."');
	},
	get:function(key, callback) {
		var that = this;
		navigator.store.get(function(value) { // success cb
			if (callback) {
				// Check if BBPS returned a serialized JSON obj, if so eval it.
				if (that.isObjectAsString(value)) {
					eval('value = ' + value.substr(0,value.length-1) + ',key:\'' + key + '\'};');
				}
				that.terseToVerboseCallback(callback)(value);
			}
		}, function() {}, // empty error cb
		key);
	},
	save:function(obj, callback) {
		var id = obj.key || this.uuid();
		delete obj.key;
		var that = this;
		navigator.store.put(function(){
			if (callback) {
				var cbObj = obj;
				cbObj['key'] = id;
				that.terseToVerboseCallback(callback)(cbObj);
			}
		}, function(){}, id, this.serialize(obj));
	},
	all:function(callback) {
		var that = this;
		navigator.store.getAll(function(json) { // success cb
			if (callback) {
				// BlackBerry store returns straight strings, so eval as necessary for values we deem as objects.
				var arr = [];
				for (var prop in json) {
					if (that.isObjectAsString(json[prop])) {
						eval('arr.push(' + json[prop].substr(0,json[prop].length-1) + ',key:\'' + prop + '\'});');
					} else {
						eval('arr.push({\'' + prop + '\':\'' + json[prop] + '\'});');
					}
				}
				that.terseToVerboseCallback(callback)(arr);
			}
		}, function() {}); // empty error cb
	},
	remove:function(keyOrObj, callback) {
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		var that = this;
		navigator.store.remove(function() {
			if (callback)
		    	that.terseToVerboseCallback(callback)();
		}, function() {}, key);
	},
	nuke:function(callback) {
		var that = this;
		navigator.store.nuke(function(){
			if (callback)
		    	that.terseToVerboseCallback(callback)();
		},function(){});
	},
	// Private helper.
	isObjectAsString:function(value) {
		return (value != null && value[0] == '{' && value[value.length-1] == '}');
	}
};/**
 * CookieAdaptor
 * ===================
 * Cookie implementation for Lawnchair for older browsers.
 *
 * Based on ppk's http://www.quirksmode.org/js/cookies.html
 *
 */
var CookieAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};

CookieAdaptor.prototype = {
	init:function(){
		this.createCookie = function(name, value, days) {
			if (days) {
				var date = new Date();
				date.setTime(date.getTime()+(days*24*60*60*1000));
				var expires = "; expires="+date.toGMTString();
			}
			else var expires = "";
			document.cookie = name+"="+value+expires+"; path=/";
		};
	},
	get:function(key, callback){
		var readCookie = function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			var len = ca.length;
			for (var i=0; i < len; i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
			}
			return null;
		};
		var obj = this.deserialize(readCookie(key)) || null;
		if (obj) {
			obj.key = key;
		}
		if (callback)
            this.terseToVerboseCallback(callback)(obj);
	},
	save:function(obj, callback){
		var id = obj.key || this.uuid();
		delete obj.key;
		this.createCookie(id, this.serialize(obj), 365);
        obj.key = id;
		if (callback)
			this.terseToVerboseCallback(callback)(obj);
	},
	all:function(callback){
		var cb = this.terseToVerboseCallback(callback);
		var ca = document.cookie.split(';');
		var yar = [];
		var c,k,v,o;
		// yo ho yo ho a pirates life for me
		for (var i = 0, l = ca.length; i < l; i++) {
			c = ca[i].split('=');
			k = c[0];
			v = c[1];
			o = this.deserialize(v);
			if (o) {
				o.key = k;
				yar.push(o);
			}
		}
		if (cb)
			cb(yar);
	},
	remove:function(keyOrObj, callback) {
		var key = (typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key;
		this.createCookie(key, '', -1);
		if (callback)
		    this.terseToVerboseCallback(callback)();
	},
	nuke:function(callback) {
		var that = this;
		this.all(function(r){
			for (var i = 0, l = r.length; i < l; i++) {
				if (r[i].key)
					that.remove(r[i].key);
			}
            if (callback) {
                callback = that.terseToVerboseCallback(callback);
                callback(r);
            }
		});
	}
};
/**
 * DOMStorageAdaptor
 * ===================
 * DOM Storage implementation for Lawnchair.
 *
 * - originally authored by Joseph Pecoraro
 * - window.name code courtesy Remy Sharp: http://24ways.org/2009/breaking-out-the-edges-of-the-browser
 *
 */
var DOMStorageAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


DOMStorageAdaptor.prototype = {
	init:function(options) {
		var self = this;
		this.storage = this.merge(window.localStorage, options.storage);
		this.table = this.merge('field', options.table);
		
		if (!window.Storage) {
			this.storage = (function () {
				// window.top.name ensures top level, and supports around 2Mb
				var data = window.top.name ? self.deserialize(window.top.name) : {};
				return {
					setItem: function (key, value) {
						data[key] = value+""; // force to string
						window.top.name = self.serialize(data);
					},
					removeItem: function (key) {
						delete data[key];
						window.top.name = self.serialize(data);
					},
					getItem: function (key) {
						return data[key] || null;
					},
					clear: function () {
						data = {};
						window.top.name = '';
					}
				};
			})();
		};
	},

	save:function(obj, callback) {
		var id = this.table + '::' + (obj.key || this.uuid());
		delete obj.key;
		this.storage.setItem(id, this.serialize(obj));
		if (callback) {
		    obj.key = id.split('::')[1];
		    callback(obj);
		}
	},

    get:function(key, callback) {
        var obj = this.deserialize(this.storage.getItem(this.table + '::' + key));
        var cb = this.terseToVerboseCallback(callback);
        
        if (obj) {
            obj.key = key;
            if (callback) cb(obj);
        } else {
			if (callback) cb(null);
		}
    },

	all:function(callback) {
		var cb = this.terseToVerboseCallback(callback);
		var results = [];
		for (var i = 0, l = this.storage.length; i < l; ++i) {
			var id = this.storage.key(i);
			var tbl = id.split('::')[0]
			var key = id.split('::').slice(1).join("::");
			if (tbl == this.table) {
				var obj = this.deserialize(this.storage.getItem(id));
				obj.key = key;
				results.push(obj);
			}
		}
		if (cb)
			cb(results);
	},

	remove:function(keyOrObj, callback) {
		var key = this.table + '::' + (typeof keyOrObj === 'string' ? keyOrObj : keyOrObj.key);
		this.storage.removeItem(key);
		if(callback)
		  callback();
	},

	nuke:function(callback) {
		var self = this;
		this.all(function(r) {
			for (var i = 0, l = r.length; i < l; i++) {
				self.remove(r[i]);
			}
			if(callback)
			  callback();
		});
	}
};
// init.js directly included to save on include traffic
//
// Copyright 2007, Google Inc.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//	1. Redistributions of source code must retain the above copyright notice,
//		 this list of conditions and the following disclaimer.
//	2. Redistributions in binary form must reproduce the above copyright notice,
//		 this list of conditions and the following disclaimer in the documentation
//		 and/or other materials provided with the distribution.
//	3. Neither the name of Google Inc. nor the names of its contributors may be
//		 used to endorse or promote products derived from this software without
//		 specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
// WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
// EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
// OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
// OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
// ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Sets up google.gears.*, which is *the only* supported way to access Gears.
//
// Circumvent this file at your own risk!
//
// In the future, Gears may automatically define google.gears.* without this
// file. Gears may use these objects to transparently fix bugs and compatibility
// issues. Applications that use the code below will continue to work seamlessly
// when that happens.

(function() {
	// We are already defined. Hooray!
	if (window.google && google.gears) {
		return;
	}

	var factory = null;

	// Firefox
	if (typeof GearsFactory != 'undefined') {
		factory = new GearsFactory();
	} else {
		// IE
		try {
			factory = new ActiveXObject('Gears.Factory');
			// privateSetGlobalObject is only required and supported on IE Mobile on
			// WinCE.
			if (factory.getBuildInfo().indexOf('ie_mobile') != -1) {
				factory.privateSetGlobalObject(this);
			}
		} catch (e) {
			// Safari
			if ((typeof navigator.mimeTypes != 'undefined')
					 && navigator.mimeTypes["application/x-googlegears"]) {
				factory = document.createElement("object");
				factory.style.display = "none";
				factory.width = 0;
				factory.height = 0;
				factory.type = "application/x-googlegears";
				document.documentElement.appendChild(factory);
			}
		}
	}

	// *Do not* define any objects if Gears is not installed. This mimics the
	// behavior of Gears defining the objects in the future.
	if (!factory) {
		return;
	}

	// Now set up the objects, being careful not to overwrite anything.
	//
	// Note: In Internet Explorer for Windows Mobile, you can't add properties to
	// the window object. However, global objects are automatically added as
	// properties of the window object in all browsers.
	if (!window.google) {
		google = {};
	}

	if (!google.gears) {
		google.gears = {factory: factory};
	}
})();

/**
 * GearsSQLiteAdaptor
 * ===================
 * Gears flavored SQLite implementation for Lawnchair.
 *
 */
var GearsSQLiteAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


GearsSQLiteAdaptor.prototype = {
	init:function(options) {
	
		var that = this;
		var merge = that.merge;
		var opts = (typeof arguments[0] == 'string') ? {table:options} : options;
	
		this.name = merge('Lawnchair', opts.name);
		this.table = merge('field', opts.table);
	
		this.db = google.gears.factory.create('beta.database');
		this.db.open(this.name);
		this.db.execute('create table if not exists ' + this.table + ' (id NVARCHAR(32) UNIQUE PRIMARY KEY, value TEXT, timestamp REAL)');
	},
	save:function(obj, callback) {
		var that = this;

		var insert = function(obj, callback) {
			var id = (obj.key == undefined) ? that.uuid() : obj.key;
			delete(obj.key);
	
			var rs = that.db.execute(
				"INSERT INTO " + that.table + " (id, value, timestamp) VALUES (?,?,?)",
				[id, that.serialize(obj), that.now()]
			);
			if (callback != undefined) {
				obj.key = id;
				callback(obj);
			}
		};
	
		var update = function(id, obj, callback) {
			that.db.execute(
				"UPDATE " + that.table + " SET value=?, timestamp=? WHERE id=?",
				[that.serialize(obj), that.now(), id]
			);
			if (callback != undefined) {
				obj.key = id;
				callback(obj);
			}
		};
	
		if (obj.key == undefined) {
			insert(obj, callback);
		} else {
			this.get(obj.key, function(r) {
				var isUpdate = (r != null);
	
				if (isUpdate) {
					var id = obj.key;
					delete(obj.key);
					update(id, obj, callback);
				} else {
					insert(obj, callback);
				}
			});
		}
	
	},
	get:function(key, callback) {
		var rs = this.db.execute("SELECT * FROM " + this.table + " WHERE id = ?", [key]);
	
		if (rs.isValidRow()) {
			// FIXME need to test null return / empty recordset
			var o = this.deserialize(rs.field(1));
			o.key = key;
			callback(o);
		} else {
			callback(null);
		}
		rs.close();
	},
	all:function(callback) {
		var cb	= this.terseToVerboseCallback(callback);
		var rs	= this.db.execute("SELECT * FROM " + this.table);
		var r		= [];
		var o;
	
		// FIXME need to add 0 len support
		//if (results.rows.length == 0 ) {
		//	cb([]);
	
		while (rs.isValidRow()) {
			o = this.deserialize(rs.field(1));
			o.key = rs.field(0);
				r.push(o);
				rs.next();
		}
		rs.close();
		cb(r);
	},
	remove:function(keyOrObj, callback) {
		this.db.execute(
			"DELETE FROM " + this.table + " WHERE id = ?",
			[(typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key]
		);
		if(callback)
		  callback();
	},
	nuke:function(callback) {
		this.db.execute("DELETE FROM " + this.table);
		if(callback)
		  callback();
		return this;
	}
};
/**
 * LawnchairAdaptorHelpers
 * =======================
 * Useful helpers for creating Lawnchair stores. Used as a mixin.
 *
 */
var LawnchairAdaptorHelpers = {
	// merging default properties with user defined args
	merge: function(defaultOption, userOption) {
		return (userOption == undefined || userOption == null) ? defaultOption: userOption;
	},

	// awesome shorthand callbacks as strings. this is shameless theft from dojo.
	terseToVerboseCallback: function(callback) {
		return (typeof arguments[0] == 'string') ?
		function(r, i) {
			eval(callback);
		}: callback;
	},

	// Returns current datetime for timestamps.
	now: function() {
		return new Date().getTime();
	},

	// Returns a unique identifier
	uuid: function(len, radix) {
		// based on Robert Kieffer's randomUUID.js at http://www.broofa.com
		var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
		var uuid = [];
		radix = radix || chars.length;

		if (len) {
			for (var i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
		} else {
			// rfc4122, version 4 form
			var r;

			// rfc4122 requires these characters
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';

			// Fill in random data.  At i==19 set the high bits of clock sequence as
			// per rfc4122, sec. 4.1.5
			for (var i = 0; i < 36; i++) {
				if (!uuid[i]) {
					r = 0 | Math.random() * 16;
					uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8: r];
				}
			}
		}
		return uuid.join('');
	},

	// Serialize a JSON object as a string.
	serialize: function(obj) {
		var r = '';
		r = JSON.stringify(obj);
		return r;
	},

	// Deserialize JSON.
	deserialize: function(json) {
		return eval('(' + json + ')');
	}
};
/**
 * UserDataAdaptor
 * ===================
 * UserData implementation for Lawnchair for older IE browsers.
 *
 */
var UserDataAdaptor = function(options) {
    for (var i in LawnchairAdaptorHelpers) {
        this[i] = LawnchairAdaptorHelpers[i];
    }
    this.init(options);
};

UserDataAdaptor.prototype = {
	init:function(){
		var s = document.createElement('span');
		s.style.behavior = 'url(\'#default#userData\')';
		s.style.position = 'absolute';
		s.style.left = 10000;
		document.body.appendChild(s);
		this.storage = s;
		this.storage.load('lawnchair');
	},
	get:function(key, callback){
		
		var obj = this.deserialize(this.storage.getAttribute(key));
	        if (obj) {
	            obj.key = key;
	            
	        }
			if (callback)
	                callback(obj);
	},
	save:function(obj, callback){
		var id = obj.key || 'lc' + this.uuid();
	        delete obj.key;		
		this.storage.setAttribute(id, this.serialize(obj));
		this.storage.save('lawnchair');		
		if (callback){
			obj.key = id;
			callback(obj);
			}
	},
	all:function(callback){
		var cb = this.terseToVerboseCallback(callback);
		var ca = this.storage.XMLDocument.firstChild.attributes;
		var yar = [];
		var v,o;
		// yo ho yo ho a pirates life for me
		for (var i = 0, l = ca.length; i < l; i++) {
			v = ca[i];
			o = this.deserialize(v.nodeValue);
			if (o) {
				o.key = v.nodeName;
				yar.push(o);
			}
		}
		if (cb)
			cb(yar);
	},
	remove:function(keyOrObj,callback) {
		var key = (typeof keyOrObj == 'string') ?  keyOrObj : keyOrObj.key;		
		this.storage.removeAttribute(key);
		this.storage.save('lawnchair');
		if(callback)
		  callback();
	}, 
	nuke:function(callback) {
		var that = this;		  
		this.all(function(r){
			for (var i = 0, l = r.length; i < l; i++) {
				if (r[i].key)
					that.remove(r[i].key);
			}
			if(callback) 
				callback();
		});
	}
};
/**
 * WebkitSQLiteAdaptor
 * ===================
 * Sqlite implementation for Lawnchair.
 *
 */
var WebkitSQLiteAdaptor = function(options) {
	for (var i in LawnchairAdaptorHelpers) {
		this[i] = LawnchairAdaptorHelpers[i];
	}
	this.init(options);
};


WebkitSQLiteAdaptor.prototype = {
	init:function(options) {
		var that = this;
		var merge = that.merge;
		var opts = (typeof arguments[0] == 'string') ? {table:options} : options;

		// default properties
		this.name		= merge('Lawnchair', opts.name	  	);
		this.version	= merge('1.0',       opts.version 	);
		this.table 		= merge('field',     opts.table	  	);
		this.display	= merge('shed',      opts.display 	);
		this.max		= merge(65536,       opts.max	  	);
		this.db			= merge(null,        opts.db		);

		// default sqlite callbacks
		this.onError = function(){};
		this.onData  = function(){};

		if("onError" in opts) {
			this.onError = opts.onError;
		}

		// error out on shit browsers
		if (!window.openDatabase)
			throw('Lawnchair, "This browser does not support sqlite storage."');

		// instantiate the store
		this.db = openDatabase(this.name, this.version, this.display, this.max);

		// create a default database and table if one does not exist
		this.db.transaction(function(tx) {
			tx.executeSql("SELECT COUNT(*) FROM " + that.table, [], function(){}, function(tx, error) {
				that.db.transaction(function(tx) {
					tx.executeSql("CREATE TABLE "+ that.table + " (id NVARCHAR(32) UNIQUE PRIMARY KEY, value TEXT, timestamp REAL)", [], function(){}, that.onError);
				});
			});
		});
	},
	save:function(obj, callback) {
		var that = this;
	
		var update = function(id, obj, callback) {
			that.db.transaction(function(t) {
				t.executeSql(
					"UPDATE " + that.table + " SET value=?, timestamp=? WHERE id=?",
					[that.serialize(obj), that.now(), id],
					function() {
						if (callback != undefined) {
							obj.key = id;
							that.terseToVerboseCallback(callback)(obj);
						}
					},
					that.onError
				);
			});
		};
		var insert = function(obj, callback) {
			that.db.transaction(function(t) {
				var id = (obj.key == undefined) ? that.uuid() : obj.key;
				delete(obj.key);
				t.executeSql(
					"INSERT INTO " + that.table + " (id, value,timestamp) VALUES (?,?,?)",
					[id, that.serialize(obj), that.now()],
					function() {
						if (callback != undefined) {
							obj.key = id;
							that.terseToVerboseCallback(callback)(obj);
						}
					},
					that.onError
				);
			});
		};
		if (obj.key == undefined) {
			insert(obj, callback);
		} else {
			this.get(obj.key, function(r) {
				var isUpdate = (r != null);
	
				if (isUpdate) {
					var id = obj.key;
					delete(obj.key);
					update(id, obj, callback);
				} else {
					insert(obj, callback);
				}
			});
		}
	},
	get:function(key, callback) {
		var that = this;
		this.db.transaction(function(t) {
			t.executeSql(
				"SELECT value FROM " + that.table + " WHERE id = ?",
				[key],
				function(tx, results) {
					if (results.rows.length == 0) {
						that.terseToVerboseCallback(callback)(null);
					} else {
						var o = that.deserialize(results.rows.item(0).value);
						o.key = key;
						that.terseToVerboseCallback(callback)(o);
					}
				},
				this.onError
			);
		});
	},
	all:function(callback) {
		var cb = this.terseToVerboseCallback(callback);
		var that = this;
		this.db.transaction(function(t) {
			t.executeSql("SELECT * FROM " + that.table, [], function(tx, results) {
				if (results.rows.length == 0 ) {
					cb([]);
				} else {
					var r = [];
					for (var i = 0, l = results.rows.length; i < l; i++) {
						var raw = results.rows.item(i).value;
						var obj = that.deserialize(raw);
						obj.key = results.rows.item(i).id;
						r.push(obj);
					}
					cb(r);
				}
			},
			that.onError);
		});
	},
	remove:function(keyOrObj, callback) {
		var that = this;
        if (callback)
            callback = that.terseToVerboseCallback(callback);
		this.db.transaction(function(t) {
			t.executeSql(
				"DELETE FROM " + that.table + " WHERE id = ?",
				[(typeof keyOrObj == 'string') ? keyOrObj : keyOrObj.key],
				callback || that.onData,
				that.onError
			);
		});
	},
	nuke:function(callback) {
		var that = this;
        if (callback)
            callback = that.terseToVerboseCallback(callback);
		this.db.transaction(function(tx) {
			tx.executeSql(
				"DELETE FROM " + that.table,
				[],
				callback || that.onData,
				that.onError
			);
		});
	}
};
