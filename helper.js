// helper.js - MSO Helper Library 

//Utils constuctor with default values
var Utils = function(options) {
    this.location = options.location;
    this.baseURL = options.location.replace('application.js', '');
    this.reAuthN = false; //starts off false
};


//Helper function to create username and passwrod template with variables for the username and password placeholders fields
/**
 * @description Responsible for presenting an authentication template pre-populated with usernamePlaceholder and passwordPlaceholder
 * @param       {String}    usernamePlaceholder - The username placeholder
 * @param       {String}    passwordPlaceholder - The password placeholder
 */
Utils.prototype.presentAuthenticationDocument = function(usernamePlaceholder, passwordPlaceholder, username, password) {
    console.log('presentAuthenticationDocument called');

    //Setting default values incase they aren't sent in the presentAuthenticationDocument call
    var usernamePlaceholder = usernamePlaceholder || '';
    var passwordPlaceholder = passwordPlaceholder || '';
    var username = username || '';
    var password = password || '';

    //Defining the template string
    var templateString = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<document>' +
        '<authenticationTemplate>' +
        '<img srcset="' + App.utils.baseURL + 'SSOTester.png 1x, ' + App.utils.baseURL + 'SSOTester.png 1080h" width="160" height="63" />' +
        '<title>MSO Name - In Home Validation</title>' +
        '<textFieldGroup>' +
        '<textField id="username" type="emailAddress" label="Username">' + usernamePlaceholder + '</textField>' +
        '<textField id="password" secure="true" label="Password">' + passwordPlaceholder + '</textField>' +
        '</textFieldGroup>' +
        '<displayLink src="http://www.apple.com/tvos-preview" label="Forgot Username or Password?"/>' +
        '</authenticationTemplate>' +
        '</document>';

    //Take the templateString and turn it into a document
    var parser = new DOMParser();
    var xmlDocument = parser.parseFromString(templateString, 'application/xml');
    xmlDocument.getElementById('username').getFeature('Keyboard').text = username;
    xmlDocument.getElementById('password').getFeature('Keyboard').text = password;
    //present Documnet
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
        expiresDate = new Date(currentAuthentication.substr(currentAuthentication.lastIndexOf("SessionNotOnOrAfter") + 21, 20));
        console.log("Current expiresDate = " + expiresDate);
        return Date.now() < expiresDate.getTime();
    }

};


//Helper function to get an UIAuthN and return it
/**
 * @description Responsible for getting the authN with UI elements
 * @param       {Request}    request - The SAML request document
 * @return      {XMLDoc}     authN - The SAML authN response document
 */
Utils.prototype.getUIAuthN = function(options, callback) {
    console.log('getUIAuthN called with options: ' + JSON.stringify(options));

    //authenticationTemplate
    //Grabing the username and password from the document
    var username = getActiveDocument().getElementById('username').getFeature('Keyboard').text;
    var password = getActiveDocument().getElementById('password').getFeature('Keyboard').text;

    if(username && password){
        var authN = '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_8e8dc5f69a98cc4c1ff3427e5ce34606fd672f91e6" Version="2.0" IssueInstant="2014-07-17T01:01:48Z" > <samlp:Status> <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" /> </samlp:Status> <saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="_d71a3a8e9fcc45c9e9d248ef7049393fc8f04e5f75" Version="2.0" IssueInstant="2014-07-17T01:01:48Z"> <saml:Issuer>http://idp.example.com/metadata.php</saml:Issuer> <saml:Conditions NotBefore="' + new Date(new Date().getTime() - ((1000 * 60) / 2)).toISOString().slice(0, 19) + 'Z' + '" NotOnOrAfter="' + new Date(new Date().getTime() + ((1000 * 60) * 5)).toISOString().slice(0, 19) + 'Z' + '" /> <saml:AuthnStatement AuthnInstant="2014-07-17T01:01:48Z" SessionNotOnOrAfter="2024-07-17T09:01:48Z"> <saml:AuthnContext> <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:Password</saml:AuthnContextClassRef> </saml:AuthnContext> </saml:AuthnStatement> <saml:AttributeStatement> <saml:Attribute Name="username" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"> <saml:AttributeValue xsi:type="xs:string">'+username+'</saml:AttributeValue> </saml:Attribute> </saml:AttributeStatement> </saml:Assertion> </samlp:Response>';
        callback(null, authN);
    }else{
        var error = new Error();
        error.code = 1;
        error.message = "Username and Password are required."
        callback(error, null);
    }


};


//Helper function to get an authN and return it
/**
 * @description Responsible for getting the authN object
 * @param       {Request}    request - The SAML request document
 * @return      {XMLDoc}     authN - The SAML authN response document
 */
Utils.prototype.getAuthN = function(options, callback) {
    console.log('Getting Silent AuthN');
    
    var currentAuth = options.request.currentAuthentication;

    //if time now is greater than Authn SessionNotOnOrAfter 
    if (this.currentAuthIsValid(currentAuth)) {

        //MSO can take the request and use it to get an updated authN
        var oldCondition = currentAuth.substr(currentAuth.lastIndexOf('<saml:Conditions'), 86);
        var newCondition = oldCondition.replace(oldCondition.substring(28, 48), new Date(new Date().getTime() - ((1000 * 60) / 2)).toISOString().slice(0, 19) + 'Z').replace(oldCondition.substring(64, 84), new Date(new Date().getTime() + ((1000 * 60) * 5)).toISOString().slice(0, 19) + 'Z');
        var authN = currentAuth.replace(oldCondition, newCondition);

        //After updating current authN return it
        callback(null, authN);

    } else {

        //Current authN expired request UI for reAuthN
        var expiredAuthN = '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_e9692d19dc50441dfd5b6a6b097471ced0100334f2" Version="2.0" IssueInstant="'+ new Date(new Date().getTime() - ((1000 * 60) / 2)).toISOString().slice(0, 19) + 'Z' + '" > <samlp:Status> <samlp:StatusCode Value="urn:apple:status:MSORequestsUI"> </samlp:Status> </samlp:Response>';

        this.reAuthN = true; //setting to true since authN is bad

        //Return request UI SAML 
        callback(null, expiredAuthN);
        
    }
};


//Helper function to get userMetadata and return it
/**
 * @description Responsible for getting the userMetadata object
 * @param       {Request}    request - The SAML request document
 * @return      {XMLDoc}     userMetadata - The SAML userMetadata response document
 */
Utils.prototype.getUserMetadata = function(options, callback) {
    console.log('Getting UserMetadata');
    
    //MSO does work to get userMetadata
    var username = options.request.currentAuthentication.substring(options.request.currentAuthentication.indexOf("username") + 116, options.request.currentAuthentication.indexOf('</saml:AttributeValue>', options.request.currentAuthentication.indexOf("username")));
    userMetadata = '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_8e8dc5f69a98cc4c1ff3427e5ce34606fd672f91e6" Version="2.0" IssueInstant="2014-07-17T01:01:48Z" > <samlp:Status> <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success" /> </samlp:Status> <saml:Assertion xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xs="http://www.w3.org/2001/XMLSchema" ID="_d71a3a8e9fcc45c9e9d248ef7049393fc8f04e5f75" Version="2.0" IssueInstant="2014-07-17T01:01:48Z"> <saml:Issuer>http://idp.example.com/metadata.php</saml:Issuer> <saml:Conditions NotBefore="' + new Date(new Date().getTime() - ((1000 * 60) / 2)).toISOString().slice(0, 19) + 'Z' + '" NotOnOrAfter="' + new Date(new Date().getTime() + ((1000 * 60) * 5)).toISOString().slice(0, 19) + 'Z' + '" /> <saml:AttributeStatement> <saml:Attribute Name="username" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"> <saml:AttributeValue xsi:type="xs:string">'+username+'</saml:AttributeValue> </saml:Attribute> </saml:AttributeStatement> </saml:Assertion> </samlp:Response>';

    //return usermetadata to callback
    callback(null, userMetadata);

};


//Helper function to request a logout and return the results
/**
 * @description Responsible for requesting a logout
 * @param       {Request}    request - The SAML request document
 * @return      {Object}     logout - The SAML logout response document
 */
Utils.prototype.requestLogout = function(options, callback) {
    console.log('Requesting Logout');
    
    //MSO does work to logout user
    var logout = '';

    //return logout info to callback
    callback(null, logout);

};
