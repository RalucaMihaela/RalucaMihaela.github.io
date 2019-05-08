console.log('application.js start');

//The onLaunch callback is invoked when the authentication context is launched and can be used to start any required actions. 
//An options object is passed in as the only argument with a location property and a callback property to inform the system of a successful launch.
App.onLaunch = function(options) {
    console.log('App.onLaunch called with options: ' + JSON.stringify(options));

    //Extracting the baseURL string from the options.location to use it to fetch other required scripts
    //The following assumes that this file is named application.js and is in the same directory as the other JS files
    var baseURL = options.location.replace('application.js', '');
    var javascriptFiles = [baseURL + 'utils.js'];

    // evaluateScripts is responsible for loading the JavaScript files neccessary for your app to run.
    // https://developer.apple.com/reference/tvmljs/1627369-evaluatescripts
    evaluateScripts(javascriptFiles, function(success) {
        if (success) {
            console.log('evaluateScripts success');

            //MSO sets up application

            //setting up App.utils from helper.js library
            App.utils = new Utils(options);
            App.utils.checkAutoAuth()
                .then(function(response){
                    if(response.autoAuth === true){
                        App.utils.canAutoAuth = true;
                        App.utils.userName = response.userName;
                        App.utils.accessToken = response.accessToken;
                        App.utils.expiresDate = response.expiresDate;
                        App.utils.userChannelList = response.userChannelList;
                    }else{
                        App.utils.canAutoAuth = false;
                    }
                    //inform sytem app is setup and ready
                    options.callback(true, null);
                })
                .catch(function(){
                    App.utils.canAutoAuth = false;
                    //inform sytem app is setup and ready
                    options.callback(true, null);
                });

        } else {
            // Be sure to handle script load failures
            console.error('evaluateScripts failed');
            //Definfing the error to return to system
            var error = new Error();
            error.message = 'Failed to load required files. Please try again later.';
            error.code = 4;
            //Calling the onLaunch options.callback to inform the system we cannot process requests
            options.callback(false, error);
        }
    });
};

//The onShowUserInterface callback is invoked to inform the application that it is required to show a user interface. 
//An options object will be passed in that provides the purpose and currentAuthentication if one is available.
App.onShowUserInterface = function(options) {
    console.log('App.onShowUserInterface called with options: ' + JSON.stringify(options));
    
    //Setting default values for username and password placeholder fields
    var username;
    var usernamePlaceholder = 'john_appleseed';
    var password;
    var passwordPlaceholder = 'Password';

    //checking to see if there is a current user
    if(options.currentAuthentication){
        //if so get the current users username
        username = 'Current Username';//Replace Current Username' with logic to get the current username
        //checking to see if the current authentication is still valid
        if(options.purpose === "editCredentials" && App.utils.currentAuthIsValid(options.currentAuthentication) && Device.model !== "Apple TV"){
            //if valid fill UI with fake password value, except on Apple TV which doesn't need this value in the UI
            password = "********";
        }else{
            //if not set placeholder to expired
            passwordPlaceholder = "Expired";
        }
    }

    //all UI cases covered show UI
    if(App.utils.canAutoAuth){
        App.utils.presentAutoAuthDocument(App.utils.userName);
    }else{
        App.utils.presentAuthenticationDocument(usernamePlaceholder, passwordPlaceholder, username, password);
    }
    
};

//The onRequest callback is invoked when there is a request for the application to process
//An options object will be passed in with request and callback properties.
App.onRequest = function(options) {
    console.log('App.onRequest called with options: ' + JSON.stringify(options));
    //Setting up a new ResponsePayload instance to return to the onRequest callback
    var responsePayload = new App.ResponsePayload();
    //Processing the requestType for requests
    switch (options.request.requestType) {
        
        //UIAuthN request
        case 'UIAuthN':
            //getAuthN is a helper function defined in helper.js - MSO JS Helper Library
            App.utils.getUIAuthN(options, responsePayload)
                .then(function(responsePayload) {
                    //Calling the onRequest options.callback to inform the system that the request completed successfully
                    options.callback(responsePayload);
                })
                .catch(function(error) {
                    //Calling the onRequest options.callback to inform the system of an error when processing the request
                    options.callback(null, error);
                });
            break;

        //AuthN request
        case 'authN':
            //Setting the results of the getAuthN call to the authN property of the global responsePayload object
            //getAuthN is a helper function defined in helper.js - MSO JS Helper Library
            App.utils.getAuthN(options, responsePayload)
                .then(function(responsePayload){
                    //Calling the onRequest options.callback to inform the system that the request completed successfully
                    options.callback(responsePayload);
                })
                .catch(function(error){
                    options.callback(null, error);
                });
            break;

        //UserMetadata request
        case 'userMetadata':
            //getUserMetadata is a helper function defined in helper.js - MSO JS Helper Library
            App.utils.getUserMetadata(options, responsePayload)
                .then(function(responsePayload){
                    //Calling the onRequest options.callback to inform the system that the request completed successfully
                    options.callback(responsePayload);
                })
                .catch(function(error){
                    options.callback(null, error);
                });
            break;

        //Logout request
        case 'logout':
            //requestLogout is a helper function defined in helper.js - MSO JS Helper Library
            App.utils.requestLogout(options, responsePayload)
                .then(function(responsePayload){
                    //Calling the onRequest options.callback to inform the system that the request completed successfully
                    options.callback(responsePayload);
                })
                .catch(function(error){
                    //Calling the onRequest options.callback to inform the system of an error when processing the request
                    options.callback(null, error);
                });
            break;

        //Default case implemented to inform system of an onRequest requestType failure
        default:
            console.error('Unable to find defined case for options.requestType: ' + options.request.requestType);
            //Definfing the error to return to system
            var error = new Error();
            error.message = 'There was an issue with the request. Please try again later.';
            error.code = 4;
            //Calling the onRequest options.callback to inform the system of an error with the request
            options.callback(null, error);
    }
};

//The onError callback is automatically called when an error is encountered by the system.
App.onError = function(message, sourceURL, line){
    console.log("Error: "+message+" in "+sourceURL+" on line "+line);
    //You can use this for error reporting to your backend
}

//The onExit callback is invoked before a context is shut down.
App.onExit = function() {
    console.log('App.onExit called');
    //You can use this to perform any cleanup actions before the authentication context is terminated.

};

console.log('application.js end');