#A2P3

#WARNING - THIS DOCUMENTATION IS PREMATURE

#THE HTTPS LINKS DO NOT WORK YET, IF USING, YOU WILL NEED TO OVERIDE THE ixURL and registrarURL
>*thanks for your understanding!*


NPM module and example apps for [A2P3](http://a2p3.ca)
##Install
	npm install a2p3

##Setup
Before you can use A2P3, you need to [register](http://setup.a2p3.net) as a user, and then you can register your app at the [Registrar](http://registrar.a2p3.net), and then register your app at any [Resource Servers](http://a2p3.ca/#resource_servers) you would like access to.

When you register your app, a key and key id (KID) will be generated for you at the Registrar and any Resource Servers. You will need to store your App's keys in a `vault.json` file. See the **vault.json** section for more details. You should keep the contents of your `vault.json` file secret!

#####The Easy Way

Alternatively, when you register as a user, (or revisit [Setup](http://setup.a2p3.net)) you can create a CLI Agent and use the `app-registration` script (see below) to generate a `vault.json` file for you.

####vault.json
The `vault.json` file has the keys and key IDs for the Identifier Exchange (obtained when registering the App at the Registrar) and from each Resource Server. Here is a sample `vault.json` file:

```
{ "ix.a2p3.net": 
  { "latest": 
    { "key": "iNW4SL_ks2Xieg558G8Mdm8l9ZmEporVplmNhYosaHbPOypvCfv5BgUWmJkbn4kyjAHcZbuEUacyJs18iAJ2wQ"
    , "kid": "o3dPbnKnz07MxRaL"
    }
  , "o3dPbnKnz07MxRaL": "iNW4SL_ks2Xieg558G8Mdm8l9ZmEporVplmNhYosaHbPOypvCfv5BgUWmJkbn4kyjAHcZbuEUacyJs18iAJ2wQ"
  }
, "email.a2p3.net": 
  { "latest": 
    { "key": "oncJcWL9CMR6TPYqZOuAh7RCCHe3qyxNNVa5jCWc49zEhTxigBJMnOBYtKUaufeZwotr7ImB8-alEBiOQwi8Jg"
    , "kid": "PhT9eyZqhOfN_Fvg"
    }
  , "PhT9eyZqhOfN_Fvg": "oncJcWL9CMR6TPYqZOuAh7RCCHe3qyxNNVa5jCWc49zEhTxigBJMnOBYtKUaufeZwotr7ImB8-alEBiOQwi8Jg"
  }
, "si.a2p3.net": 
  { "latest": 
    { "key": "bxnnnJyKrFy02Wam8yHI0NI3nxW8KK2J6M7Jd23PldZ38NV2JiRHSCplR-WNk7oGHS6-U-AxC-q8bVz3MBMyDQ"
    , "kid": "1jL2NNFCS44MXm0d"
    }
  , "1jL2NNFCS44MXm0d": "bxnnnJyKrFy02Wam8yHI0NI3nxW8KK2J6M7Jd23PldZ38NV2JiRHSCplR-WNk7oGHS6-U-AxC-q8bVz3MBMyDQ"
  }
}
```
The easy way to generate a vault.json file is to use the `app-registration` script.

#### app-registration script

To use the app-registration script, you need to create a configuration JSON file containing:

```
{ "host": 			"example.com" 			// App hostname
, "name":			"Example App"			// App friendly name
, "device": 		"xW8KK2J6M7Jd23PldZ3"	// CLI Agent device parameter
, "registrar":		"registrar.a2p3.net"	// optional
, "registrarURL":	"https://registrar.a2p3.net" // optional
, "resources":						
	[ "email.a2p3.net"				// array of resources
	, "people.a2p3.net"				// to register App at
	]

```
Assuming you have installed `a2p3` in your app directory and you have a `app-config.json` file in that directory with the above App Registration information in it, you can run:

`node .\node_modules\a2p3\lib\app-registration.js app-config.json`

which will generate a `vault.json` file for you in the current directory assuming all went well.
	
##API Documentation
####Request( config )

Constructor that creates an a2p3 object with the passed in configuration object or a serialized string of a previous object.

**Arguments**
- a config object or an object that was serialized with `Request.stringify()`

 
```
config =
  { host: example.com					// the hostname of the App
  , vault: require('./vault.json')	// the keys for the App
  , ix: ix.a2p3.net					// optional parameter to overide the IX 
  , ixURL: https://ix.a2p3.net		// optional parameter to overide the URL to the IX
  }

```

####Request.agent( returnURL, [auth], [scopes] )

**Arguments**

- returnURL - the URL that the App would like the Agent to redirect to.
- auth - optional parameter to overide the default auth parameters in an Agent Request.
- scopes - an optional array of scopes / resources that App would like to have access. If no scopes are provided, the App can only get its Directed Identifer back.


####Request.exchange( ixToken, callback )

**Arguments**

- ixToken - the IX Token received back from the Agent
- callback( error, di ) - A callback which returns the Directed Identifier for the App, or an error

####Request.stringify()

Serializes the object so that if can be stored in a session. The resulting string can be passed back `Request` to de-serialize

####Request.call( api, [params], callback )

**Arguments**

- api - the URL to the API. If the api is a to standaridized resource server, the host will be replaced with the first redirected resource server returned from the IX.
- params - the parameters (if supplied) to be passed in the API. The RS token will be added automatically.
- callback( error, results ) - A callback which returns the results from the API call, or an error

####Example

```
var a2p3 = require('a2p3')

var request = new a2p3.Request(
  { host: 'example.com'
  , vault: require('./vault.json')
  }
var agentRequest = request.agent( 'https://example.com/returnURL', 
  [ 'https://email.a2p3.net/scope/default'
  , 'https://people.a2p3.net/scope/namePhoto'
  ] )

// save request object in a session DB for later
session.a2p3 = request.stringify()

// send the agentRequest to the Agent per the A2P3 spec or 
// generate a QR code to be scanned, see examples for details
// ...
// we get back an IX Token in ixToken

var request = new a2p3.Request( session.a2p3 )
request.exchange( ixToken, function ( error, directedIdentifier ) {
  var userID = directedIdentifer  // the App's unique identifier for the User

  request.call('https://email.a2p3.net/default', function( error, result ) {
    var email = result.email
  })

  request.call('https://people.a2p3.net/namePhoto', function( error, result ) {
    var name = result.name
    var photo = result.photo
  })
})

```
