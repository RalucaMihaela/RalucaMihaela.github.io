// Utils - MSO JS Helper Library 

//Utils constuctor with default values
var Utils = function(options) {
    this.location = options.location;
    this.baseURL = options.location.replace('/application.js', '');
    this.canAutoAuth = false;
    this.userName = "John Appleseed";
};


//Helper function to create username and password template with variables for the username, password and placeholders fields
/**
 * @description Responsible for presenting an authentication template pre-populated with usernamePlaceholder and passwordPlaceholder
 * @param       {String}    usernamePlaceholder - The username placeholder
 * @param       {String}    passwordPlaceholder - The password placeholder
 * @param       {String}    username - The username value
 * @param       {String}    password - The password value
 */
Utils.prototype.presentAuthenticationDocument = function(usernamePlaceholder, passwordPlaceholder, username, password) {
    console.log('presentAuthenticationDocument called');

    //Setting default values incase they aren't sent in the presentAuthenticationDocument call
    var usernamePlaceholder = usernamePlaceholder || 'john_appleseed';
    var passwordPlaceholder = passwordPlaceholder || 'Password';
    var username = username || '';
    var password = password || '';

    //Defining the template string
    var templateString = 
    `<?xml version="1.0" encoding="UTF-8"?>
    <document>
        <authenticationTemplate>
            <img src="${App.utils.baseURL}/SSOTester.png" />
            <textFieldGroup>
                <textField id="username" type="emailAddress" label="Username">${usernamePlaceholder}</textField>
                <textField id="password" secure="true" label="Password">${passwordPlaceholder}</textField>
            </textFieldGroup>
            <displayLink src="https://appleid.apple.com" label="Forgot Username or Password?"/>
        </authenticationTemplate>
    </document>`;

    //Take the templateString and turn it into a document
    var parser = new DOMParser();
    var xmlDocument = parser.parseFromString(templateString, 'application/xml');
    xmlDocument.getElementById('username').getFeature('Keyboard').text = username;
    xmlDocument.getElementById('password').getFeature('Keyboard').text = password;
    //present Documnet
    App.presentDocument(xmlDocument);
};


//Helper function to create auto-auth template with a variable for the username placeholder field
/**
 * @description Responsible for presenting an autoAuth template pre-populated with the usernamePlaceholder
 * @param       {[type]}    usernamePlaceholder - The username placeholder
 */
Utils.prototype.presentAutoAuthDocument = function(username) {
    console.log('presentAutoAuthDocument called');

    //Defining the template string
    var templateString = 
    `<?xml version="1.0" encoding="UTF-8"?>
    <document>
        <autoAuthenticationTemplate>
            <img src="${App.utils.baseURL}/SSOTester.png" />
            <accountName>Hi ${username}!</accountName>
            <title>Apple SSO &amp; Home Based Authentication</title>
            <description>From now on, whenever we identify that you are on your home network you can automatically 'Sign In' using Home Based Authentication, no username or password required.</description>
            <buttonLockup onselect="App.utils.presentAuthenticationDocument()">
                <title>Dont want to use Home Based Authentication?</title>
                <text>Sign In Manually</text>
            </buttonLockup>
        </autoAuthenticationTemplate>
    </document>`;

    //Take the templateString and turn it into a document
    var parser = new DOMParser();
    var xmlDocument = parser.parseFromString(templateString, 'application/xml');

    //Presenting the documnet
    App.presentDocument(xmlDocument);
};


//Helper function to determine if currentAuthentication is valid
/**
 * @description Responsible for validating the current auth
 * @param       {Object}    currentAuthentication - The current SAML authentication document
 * @return      {Boolean}   True if the auth is valid, false otherwise
 */
Utils.prototype.currentAuthIsValid = function(currentAuthentication) {
    console.log('Checking if currentAuthIsValid');
    if (!currentAuthentication) {
        console.log("Authentication Expired")
        return false;
    } else {
        console.log("We have currentAuthentication");
        console.log("Checking expiresDate");
        //Your expiresDate implementation will depend on your currentAuthentication formatting
        expiresDate = new Date(currentAuthentication.substr(currentAuthentication.lastIndexOf("SessionNotOnOrAfter") + 21, 20));
        console.log("Current expiresDate = " + expiresDate);
        return Date.now() < expiresDate.getTime();
    }

};


//Helper function to determine if user is eligible for auto-auth
/**
 * @description Responsible for determining if auto-auth is allowed
 */
Utils.prototype.checkAutoAuth = function() {
    console.log('Checking eligibleForAutoAuth');
    return new Promise(function(resolve,reject){
        App.utils.makeRequest({ url: App.utils.baseURL + "/autoAuth", method: 'GET' })
        .then(function(xhr, request) {
            resolve(JSON.parse(xhr.responseText));
        })
        .catch(function(error) {
            reject(error);
        });
    });
};


//Helper function to get an UIAuthN and return it
/**
 * @description Responsible for getting the authN with UI elements
 */
Utils.prototype.getUIAuthN = function(options, responsePayload) {
    console.log('Getting UI AuthN');
    return new Promise(function(resolve,reject){
        var templateType = getActiveDocument().firstChild.firstChild.tagName;
        switch(templateType){
            case "authenticationTemplate":
                //authenticationTemplate
                //Grabing the username and password from the document
                var username = getActiveDocument().getElementById('username').getFeature('Keyboard').text;
                var password = getActiveDocument().getElementById('password').getFeature('Keyboard').text;
                App.utils.makeRequest({ url: App.utils.baseURL + '/uiAuth', method: 'POST', data: '{"username":"'+username+'","password":"'+password+'"}'})
                .then(function(xhr, request) {
                    var response = JSON.parse(xhr.responseText);
                    responsePayload.authN = response.accessToken;
                    responsePayload.username = username;
                    responsePayload.expirationDate = new Date(response.expiresDate);
                    responsePayload.authenticationScheme = "OAuth";
                    responsePayload.userChannelList = response.userChannelList;
                    responsePayload.statusCode = "200";
                    responsePayload.expectedAction = 1;
                    resolve(responsePayload);
                })
                .catch(function(error) {
                    reject(error);
                });
                break;

            case "autoAuthenticationTemplate":
                responsePayload.authN = App.utils.accessToken;
                responsePayload.username = App.utils.userName;
                responsePayload.expirationDate = new Date(App.utils.expiresDate);
                responsePayload.authenticationScheme = "OAuth";
                responsePayload.userChannelList = App.utils.userChannelList;
                responsePayload.statusCode = "SUCCESS";
                responsePayload.expectedAction = 1;
                resolve(responsePayload);
                break;
        }        
    });
};


//Helper function to get an authN and return it
/**
 * @description Responsible for getting the authN object when device level authentication expires
 */
Utils.prototype.getAuthN = function(options, responsePayload) {
    console.log('Getting Silent AuthN');
    return new Promise(function(resolve,reject){
        responsePayload.authenticationScheme = "OAuth";
        responsePayload.statusCode = "MSO_Requires_UI";
        responsePayload.expectedAction = 2;
        resolve(responsePayload);
    });
};


//Helper function to get userMetadata and return it
/**
 * @description Responsible for getting the userMetadata object for TVE apps
 */
Utils.prototype.getUserMetadata = function(options, responsePayload) {
    console.log('Getting UserMetadata');
    return new Promise(function(resolve,reject){
        App.utils.makeRequest({ url: App.utils.baseURL + '/userMetadata', method: 'GET'})
        .then(function(xhr, request) {
            responsePayload.authenticationScheme = "OAuth";
            responsePayload.userMetadata = xhr.responseText;
            responsePayload.statusCode = "SUCCESS";
            responsePayload.expectedAction = 1;
            resolve(responsePayload);
        })
        .catch(function(error) {
            reject(error);
        });
    });
};


//Helper function to get userChannelList and return it
/**
 * @description Responsible for getting the userChannelList
 * @return      {Array}      userChannelList - The array of strings representing the users channel list
 */
Utils.prototype.getUserChannelList = function(request, currentAuthentication) {
    console.log('Getting UserChannelList');
    return new Promise(function(resolve,reject){
        resolve(["ABC","NBC","FOX","DIS","ESPN"]);
    });
};


//Helper function to request a logout and return the results
/**
 * @description Responsible for requesting a logout
 */
Utils.prototype.requestLogout = function(options, responsePayload) {
    console.log('Requesting Logout');
    return new Promise(function(resolve,reject){
        responsePayload.authenticationScheme = "OAuth";
        responsePayload.expectedAction = 1;
        resolve(responsePayload);
    });
};





/**
 * XHR handler.
 * Simplifies most of tedious tasks needed when making an XHR request.
 *
 * var ajax = new Ajax( { options } )
 *
 * @params object $options
 * @params string $options.url - url to be loaded
 * @params string $options.method - "GET", "POST", "PUT", "DELTE"
 * @params bool $options.type - false = "Sync" or true = "Async" (You should always use true)
 * @params func $options.success - Gets called on readyState 4 & status 200
 * @params func $options.failure - Gets called on readyState 4 & status != 200
 * @params func $options.callback - Gets called after the success and failure on readyState 4
 * @params string $options.data - data to be sent to the server
 * @params array $options.headers - an array of objects each containing a header and value
 */

Ajax = function(options) {
    var me = this;
    options = options || {};

    /* Setup XHR properties */
    this.url = options.url || false;
    this.method = options.method || "GET";
    this.type = (options.type === false) ? false : true;
    this.success = options.success || null;
    this.failure = options.failure || null;
    this.data = options.data || null;
    this.headers = options.headers || null;
    this.complete = options.complete || null;

    if (!this.url) {
        console.error('\nAjax Object requires a url to be passed in: e.g. { "url": "some string" }\n')
        return undefined;
    };

    this.id = Date.now();

    this.createRequest();

    this.req.onreadystatechange = this.stateChange;

    this.req.object = this;

    this.open();

    this.setRequestHeaders();

    this.send();

};

/**
 * Singleton object that keeps a list of all Active requests
 */
Ajax.activeRequests = {};

/**
 * Method to cancel and remove all active requests
 */
Ajax.cancelAllRequests = function() {
    for (var p in Ajax.activeRequests) {
        if (Ajax.activeRequests.hasOwnProperty(p)) {
            var obj = Ajax.activeRequests[p];
            if (obj.hasOwnProperty("abort") && typeof obj.abort == "function") {
                obj.req.abort();
            };
            delete Ajax.activeRequests[p];
        };
    };
    Ajax.activeRequests = {};
};

Ajax.prototype = {
    successCodes: [200, 201, 202, 203, 204, 205, 206, 207, 208, 226],
    stateChange: function() {
        var me = this.object;
        switch (this.readyState) {
            case 1:
                if (typeof(me.connection) === "function") me.connection(this, me);
                break;
            case 2:
                if (typeof(me.received) === "function") me.received(this, me);
                break;
            case 3:
                if (typeof(me.processing) === "function") me.processing(this, me);
                break;
            case 4:
                if (me.successCodes.indexOf(this.status) > -1) {
                    if (typeof(me.success) === "function") me.success(this, me);
                } else {
                    if (typeof(me.failure) === "function") me.failure(this.status, this, me);
                }
                if (typeof(me.complete) === "function") me.complete(this, me);
                break;
            default:
                console.log("Request has been cancelled");
                if (typeof(me.cancelled) == "function") me.cancelled(this, me);
                break;
        }
    },
    cancelRequest: function() {
        this.req.abort();
        Ajax.activeRequests[this.id] = null;
    },
    cancelAllActiveRequests: function() {
        Ajax._cancelAllRequests();
    },
    createRequest: function() {
        try {
            this.req = makeXMLHttpRequest();
            Ajax.activeRequests[this.id] = this;
        } catch (error) {
            console.error("failed to create request: " + error);
        }
    },
    open: function() {
        try {
            this.req.open(this.method, this.url, this.type);
        } catch (error) {
            console.error("failed to open request: " + error);
        }
    },
    setRequestHeaders: function() {
        try {
            if (this.headers) {
                for (var i = 0; i < this.headers.length; i++) {
                    this.req.setRequestHeader(this.headers[i].header, this.headers[i].value);
                }
            }
        } catch (error) {
            console.log("failed to set request headers: " + error);
        }
    },
    send: function() {
        var data = this.data || null;
        try {
            this.req.send(data);
        } catch (error) {
            console.log("failed to send request: " + error);
        }
    },
    responseDocument: function() {
        try {
            var updatedXMLStr = this.req.responseText;
            // var domParser = new DOMParser();
            // var xmlDoc = domParser.parseFromString(updatedXMLStr, "application/xml");
            // return xmlDoc;
            return updatedXMLStr;
        } catch (error) {
            console.log(" == FAILED TO RETRIEVE DOCUMENT FROM XHR: " + error + " == ");
        }
    }
};

//Promise wrapper for the AJAX - XHR handler
Utils.prototype.makeRequest = function(options) {
    return new Promise(function(resolve, reject) {
        new Ajax({
            url: options.url,
            method: options.method,
            headers: options.headers,
            data: options.data,
            success: function(xhr, request) {
                resolve(xhr, request);
            },
            failure: function(status, xhr, request) {
                var error = new Error();
                error.message = "XHR Failure: " + status + " " + xhr.statusText + ".";
                error.code = 4;
                reject(error);
            }
        });
    });
};

//Promise XHR Example
// App.utils.makeRequest({ url: 'https://www.apple.com', method: 'GET' })
// .then(function(xhr, request) {
//
// })
// .catch(function(error) {
//
// });

//Time helper
if(typeof Time === 'undefined'){

    Time = {
        now : function(){
            return Date.now();
        },
        elapsedSince: function(startTime){
            return Date.now() - startTime;
        },
        second : 1000,
        minute : 1000 * 60,
        hour : 1000 * 60 * 60,
        day : 1000 * 60 * 60 * 24,
        week : 1000 * 60 * 60 * 24 * 7,
        month : 1000 * 60 * 60 * 24 * 30,
        year : 1000 * 60 * 60 * 24 * 365,
        seconds : function(num){
            return this.second * num;
        },
        minutes : function(num){
            return this.minute * num;
        },
        hours : function(num){
            return this.hour * num;
        },
        days : function(num){
            return this.day * num;
        },
        weeks : function(num){
            return this.week * num;
        },
        months : function(num){
            return this.month * num;
        },
        years : function(num){
            return this.year * num;
        }
    }
}
