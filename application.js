// application.js - App Lifecycle Callbacks
console.log('application.js start');

//Defining onLaunch Callback function
//This callback will be passed an options argument that provides the secure token and location as properties on the options object.
App.onLaunch = function(options) {
    console.log('App.onLaunch called with options: ' + JSON.stringify(options));

    //Extracting the baseURL string from the options.location to use it to fetch other required scripts
    //This assumes that this file is named application.js and is in the same directory as the other JS files
    var baseURL = options.location.replace('application.js', '');
    var javascriptFiles = [baseURL + 'helper.js'];

    // evaluateScripts is responsible for loading the JavaScript files neccessary for your app to run. 
    // https://developer.apple.com/library/prerelease/tvos/documentation/TVMLJS/Reference/TVJSGlobalFunc_Ref/index.html#//apple_ref/javascript/instm/Global/evaluateScripts
    evaluateScripts(javascriptFiles, function(success) {
        if (success) {
            console.log('evaluateScripts success');

            //setting up App.utils from helper.js library
            App.utils = new Utils(options);            
            options.callback(true, null);

        } else {
            // Be sure to handle script load failure cases in your code.
            var error = new Error();
            error.code = 4;
            error.message = "Service is temporarily unavailable, please try again later.";
            options.callback(false, error);
            throw ('evaluateScripts failed');
        }
    });
};

App.onShowUserInterface = function(options) {
    console.log('App.onShowUserInterface called with options: ' + JSON.stringify(options));
    App.utils.currentAuthentication = options.currentAuthentication;

    //Setting default values for username and password placeholder fields
    var usernamePlaceholder = 'john_appleseed';
    var passwordPlaceholder = 'Password';
    var currentUsername;

    //Looking for currentAuthentication to show current user or not
    if (options.currentAuthentication && options.purpose == "editCredentials") {
        //This case covers an authed user entering from the settings app
        //MSO logic is responsible for setting currentUsername to a relevant value
        currentUsername = options.currentAuthentication.substring(options.currentAuthentication.indexOf("username") + 116, options.currentAuthentication.indexOf('</saml:AttributeValue>', options.currentAuthentication.indexOf("username")));
        //Updating the username and password placeholder fields
        var username = currentUsername;
        var password = '******';

        App.utils.presentAuthenticationDocument(usernamePlaceholder, passwordPlaceholder, username, password);

    } else if (options.currentAuthentication && options.purpose == "authenticate" && App.utils.reAuthN == true) {
        //This case covers a user with expired auth token
        //MSO logic is responsible for setting currentUsername to a relevant value
        currentUsername = options.currentAuthentication.substring(options.currentAuthentication.indexOf("username") + 116, options.currentAuthentication.indexOf('</saml:AttributeValue>', options.currentAuthentication.indexOf("username")));
        //Updating the username and password placeholder fields
        var username = currentUsername;

        App.utils.presentAuthenticationDocument(usernamePlaceholder, passwordPlaceholder, username);

    } else if (options.purpose == "authenticate") {
        App.utils.presentAuthenticationDocument(usernamePlaceholder, passwordPlaceholder);
    }

};

App.onRequest = function(options) {
    console.log('App.onRequest called with options: ' + JSON.stringify(options));
    var responsePayload = new App.ResponsePayload();

    //Processing the requestType for requests
    switch (options.request.requestType) {

        //UIAuthN request
        case 'UIAuthN':
            //Setting the results of the getAuthN call to the authN property of the global responsePayload object
            //getAuthN is a helper function defined in Utils.js - MSO JS Helper Library
            App.utils.getUIAuthN(options, function(error, response) {
                if (error) {
                    options.callback(null, error);
                } else {
                    responsePayload.authN = response;
                    options.callback(responsePayload, null);
                }
            });

            break;

            //AuthN request
        case 'authN':
            //Setting the results of the getAuthN call to the authN property of the global responsePayload object
            //getAuthN is a helper function defined in Utils.js - MSO JS Helper Library
            App.utils.getAuthN(options, function(error, response) {
                if (error) {
                    options.callback(null, error);
                } else {
                    responsePayload.authN = response;
                    options.callback(responsePayload, null);
                }
            });
            break;

            //UserMetadata request
        case 'userMetadata':
            //Setting the results of the getUserMetadata call to the userMetadata property of the global responsePayload object
            //getUserMetadata is a helper function defined in Utils.js - MSO JS Helper Library
            // responsePayload.userMetadata = App.utils.getUserMetadata(options.request.requestBody, options.request.currentAuthentication);
            // options.callback(responsePayload);
            App.utils.getUserMetadata(options, function(error, response) {
                if (error) {
                    options.callback(null, error);
                } else {
                    responsePayload.userMetadata = response;
                    options.callback(responsePayload, null);
                }
            });
            break;

            //Logout request
        case 'logout':
            //Setting the results of the requestLogout call to the logout property of the global responsePayload object
            //requestLogout is a helper function defined in Utils.js - MSO JS Helper Library
            App.utils.requestLogout(options, function(error, response) {
                if (error) {
                    options.callback(null, error);
                } else {
                    responsePayload.logout = response;
                    options.callback(responsePayload, null);
                }
            });
            break;

            //Default case implemented to inform system of request failure
        default:
            throw ('Unable to find defined case for options.requestType: ' + options.request.requestType);
            // inform system onRequest failed
            var error = new Error();
            error.code = 4;
            error.message = "Service is temporarily unavailable, please try again later.";
            options.callback(false, error);
    }

};

App.onError = function(message, sourceURL, line) {
    console.log("Error: " + message + " in " + sourceURL + " on line " + line);
}

//A callback function that is automatically called when the authentication context has been exited
App.onExit = function() {
    console.log('App.onExit called');
    //Perform any cleanup actions, such as releasing any system resources, before the Authentication Context is terminated

};

console.log('application.js end');
