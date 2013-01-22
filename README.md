#A2P3

#WARNING - THIS DOCUMENTATION IS PREMATURE

#THE HTTPS LINKS DO NOT WORK YET, IF USING, YOU WILL NEED TO OVERIDE THE ixURL and registrarURL
>*thanks for your understanding!*


NPM module and example apps for [A2P3](http://a2p3.ca)
##Installation and Setup

####Quick Install


1. [Register](http://setup.a2p3.net) as a user

2. Create a CLI Agent at [Setup](http://setup.a2p3.net) and save the `device` value

3. `npm install a2p3` and provide the `device` value when prompted and optionally the `appID` and `name` for the app


####Details

The first time install is run, it will copy the `sample.config.json` file to `config.json` and update the `device`, `appID` and `name` properties. Install will then run `app-registration.js` with `config.json` and register the app with `appID` and `name` at the Registrar, and then at the Email, SI, Health and People Resource Servers and save all the keys and key IDs into `vault.json`. See the **vault.json** section for more details. You should keep the contents of your `vault.json` file secret!

#### config.json

The config.json file is used by `app-registration.js` to generate the `vault.json` file, and is used by `server.js` to configure how the server runs. Looked at the `server.js` source to see other defaults that can be changed for more complex development environments.

```
{ "appID": 	"example.com" 			// App hostname
, "name":	"Example App"			// App friendly name
, "device": "NQLKKnfIc3RbY4a2JRwP"	// CLI Agent device parameter
, "port": 	8080					// port server will listen on
, "resources":
	[ "email.a2p3.net"				// array of resource hostnames
	, "people.a2p3.net"				// to register App at
	, "people.a2p3.net"				// only resources hosted at *.a2p3.net are supported
	, "health.a2p3.net"
	]
}
```

####vault.json
The `vault.json` file has the keys and key IDs for the Identifier Exchange (obtained when registering the App at the Registrar) and from each Resource Server. Here is a sample file:

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


#### app-registration.js
You can generate a new `vault.json` file if you change the `appid` or `resources` in your `config.json` file by running `app-registration.js` directly.

From the app directory,

	node .\node_modules\a2p3\lib\app-registration.js config.json

which will generate a `vault.json` file for you in the current directory assuming all went well.

##API Documentation
####agentRequest( config, vault, returnURL, [resources] )

Creates an Agent Request for any supplied `resources` based on the `config`, `vault` and `returnURL` values.

	var a2p3 = require('a2p3')
      , config = require('./config')
      , vault = require('./vault')

    var returnURL = 'http://localhost:8080'
      , resources =
        [ 'https://email.a2p3.net/scope/default'
          , 'https://people.a2p3.net/scope/namePhoto'
          ]

    var agentRequest = a2p3.agentRequest( config, vault, returnURL, resources )


####Resource( config, vault )

Creates an A2P3 Resource object based on the `config` and `vault`.


####Resource.exchange( agentRequest, ixToken, callback )

Exchanges an Agent Request and IX Token at the Identifier Exchange for the Apps directed identifier for the user and Resource Server Tokens for any requested resources.

- agentRequest - the Agent Request sent to the Agent
- ixToken - the IX Token received back from the Agent
- callback( error, di ) - A callback which returns the Directed Identifier for the App, or an error


####Resource.call( api, [params], callback )

Calls the API with any parameters. If the api is a to standaridized resource server, the host will be replaced with the first redirected resource server returned from the IX. To get results from all resource servers, use **Resource.callMultiple**

- api - the URL to the API
- params - the parameters (if supplied) to be passed in the API. The required RS token parameter will be added automatically.
- callback( error, results ) - A callback which returns the results from the API call, or an error


####Resource.callMultiple( details, callback )

Calls all supplied APIs in parrelel with the supplied parameters. All resource servers provided by the Identifier Exchange for a standardize resource are called for any standardized resource API provided.

- details - an object mapping resource APIs to params
- callback( errors, results ) - A callback which returns an errors and results object.
	- errors - Any error returned from a host is added as a property to the errors object using the host ID. If there are no errors, then errors has the `null` value.
	- results - the results from each API call using the hostID. If the API is a standardized resource, then a list of host redirects will be provided.


##Example

```
var a2p3 = require('a2p3')
  , config = require('./config')
  , vault = require('./vault')

var returnURL = 'http://localhost:8080'
  , resources =
    [ 'https://email.a2p3.net/scope/default'
    , 'https://people.a2p3.net/scope/namePhoto'
    , 'https://health.a2p3.net/scope/prov_number'
    ]

var agentRequest = a2p3.agentRequest( config, vault, returnURL, resources )

// send agentReqest to Agent, get back ixToken

var resources new a2p3.Resources( config, vault )
  , details =
    { 'https://email.a2p3.net/email/default': null
    , 'https://people.a2p3.net/namePhoto': null
    , 'https://health.a2p3.net/prov_number': null
    }
resources.exchange( agentRequest, ixToken, function ( error, di ) {
  if (!error) {
    console.log( di ) // { result: { sub: 'v1Gx5AsOf_91wjDQAwPsvrP' }}
    resources.callMultiple( details, function ( errors, results ) {
      if (!errors) {
        console.log( results )
      }
    })
  }
})

// output of results: in this example, the user has health records at both BC and Alberta

{ 'email.a2p3.net':
  { result : { email: 'john@example.com' } }
, 'people.a2p3.net':
  { redirect : [ people.bc.a2p3.net ] }
, 'people.bc.a2p3.net':
  { result : { name: 'John Smith', photo: 'http://people.a2p3.net/photos/h5db2lkxHw7lks.jpeg' } }
, 'health.a2p3.net':
  { redirect : [ health.bc.a2p3.net, health.ab.a2p3.net ] }
, 'health.bc.a2p3.net':
  { result : { prov_number: '1111111111' } }
, 'health.ab.a2p3.net':
  { result : { prov_number: '2222222222' } }

```


## Related

[A2P3.CA](http://a2p3.ca) A2P3 project home page

[A2P3_specs](https://github.com/dickhardt/A2P3_specs) Specifications and POC documentation

[A2P3](https://github.com/dickhardt/A2P3) POC Server implementation source (node.js)

[A2P3_agent](https://github.com/dickhardt/A2P3_agent) POC mobile agent (PhoneGap)

[A2P3_bank](https://github.com/dickhardt/A2P3_bank) POC mobile bank app (PhoneGap)

[sample-node-a2p3](https://github.com/dickhardt/sample-node-a2p3) sample A2P3 application using node-a2p3
