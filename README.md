#node-a2p3

#WARNING - THIS DOCUMENTATION IS EARLY - RESOURCES ARE CURRENTLY AT 'HTTP', not 'HTTPS'

npm module for [A2P3](http://a2p3.ca)

##Quick Install


1. [Register](http://setup.a2p3.net) as a user

2. Create a CLI Agent at [Setup](http://setup.a2p3.net) and save the `device` value

3. `npm install a2p3`

4. `cd node_modules/a2p3`

5. Edit the config.json file and edit the `device`, `appID` and `name` for as appropriate

6. `npm run-script register`



##Installation Details

When installed, a default `config.json` file is created in `node_modules/a2p3` if one does not already exist. This file shold be copied up into your application directory and the `device` parameter must be inserted.

The `register.js` script will use the values in `config.json` to register the app with `appID` and `name` at the Registrar, and registers the app at the configured `resources` (defaults to all resource servers - Email, SI, Health and People) and saves all the keys and key IDs into `vault.json`. See the **vault.json** section for more details. You should keep the contents of your `vault.json` file secret!

#### config.json

A config.json file configures how `register.js` will generate the `vault.json` file, and configures `a2p3`. Looked at the `register.js` source to see other defaults that can be changed for more complex development environments.

```json
{ "appID": 	"app.example.com"       // App hostname
, "name":	"Example App"			        // App friendly name
, "device": "NQLKKnfIc3RbY4a2JRwP"	// CLI Agent device parameter
, "port": 	8080					          // port server will listen on
, "resources":
	[ "email.a2p3.net"				// array of resource hostnames
	, "people.a2p3.net"				// to register App at
	, "people.a2p3.net"				// only resources hosted at *.a2p3.net are supported
	, "health.a2p3.net"
	]
}
```

####vault.json
A `vault.json` file has the keys and key IDs for the Identifier Exchange (obtained when registering the App at the Registrar) and for any Resource Server. Here is a sample file:

```json
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
The easy way to generate a vault.json file is to use the `register.js` script.


#### register.js
If you change the `appid` or `resources` in your `config.json` file, you can generate a new `vault.json` file

	node node_modules\a2p3\setup\register.js config.json

This assumes config.json is in the current directory.
This command will generate a new `vault.json` file in the current directory for you assuming all went well.




##API Documentation

####agentRequest( config, vault, params )

Creates an Agent Request using the values in `config`, `vault` and the supplied `params` object with the following properties:

- `returnURL` or `callbackURL`: where the Agent will return results for the Agent Request. If `returnURL`, the Agent will send back results via a redirected GET. If `callbackURL`, the Agent will POST the results to the URL as a JSON message. REQUIRED.

- `resources`: an array of resources the application would like authorization from the User to access. OPTIONAL


```javascript
var a2p3 = require('a2p3')
  , config = require('./config.json')
  , vault = require('./vault.json')
  , params =
	{ returnURL: 'http://localhost:8080'
  	, resources:
  		[ 'https://email.a2p3.net/scope/default'
    	, 'https://people.a2p3.net/scope/namePhoto'
    	]
    }

var agentRequest = a2p3.agentRequest( config, vault, params )
```

####random16bytes()

Helper routine that generates 16 bytes of random data encoded as a URL safe base 64 string.


####Resource( config, vault )

Creates an A2P3 Resource object using the values in `config` and `vault`.


####Resource.exchange( agentRequest, ixToken, callback )

Exchanges an Agent Request and IX Token at the Identifier Exchange for the Apps directed identifier for the user and Resource Server Tokens for any requested resources.

- agentRequest - the Agent Request sent to the Agent
- ixToken - the IX Token received back from the Agent
- callback( error, di ) - A callback which returns the Directed Identifier for the App, or an error


####Resource.call( api, [params], callback )

Calls the API with any parameters. **Resource.exchange()** MUST have been called previously. If the api is a to standaridized resource server, the host will be replaced with the first redirected resource server returned from the IX. To get results from all resource servers, use **Resource.callMultiple()**

- api - the URL to the API
- params - the parameters (if supplied) to be passed in the API. The required RS token parameter will be added automatically.
- callback( error, results ) - A callback which returns the results from the API call, or an error


####Resource.callMultiple( details, callback )

Calls all supplied APIs in parrelel with the supplied parameters. **Resource.exchange()** MUST have been called previously.  All resource servers provided by the Identifier Exchange for a standardize resource are called for any standardized resource API provided.

- details - an object mapping resource APIs to params
- callback( errors, results ) - A callback which returns an errors and results object.
	- errors - Any error returned from a host is added as a property to the errors object using the host ID. If there are no errors, then errors has the `null` value.
	- results - the results from each API call using the hostID. If the API is a standardized resource, then a list of host redirects will be provided.


##Full Example

```javascript
var a2p3 = require('a2p3')
  , config = require('./config.json')
  , vault = require('./vault.json')
  , params =
  { returnURL: 'http://localhost:8080'
  , resources:
    [ 'https://email.a2p3.net/scope/default'
    , 'https://people.a2p3.net/scope/namePhoto'
    , 'https://health.a2p3.net/scope/prov_number'
    ]
  }

var agentRequest = a2p3.agentRequest( config, vault, params )

// send agentReqest to Agent, get back ixToken

var rs new a2p3.Resources( config, vault )
  , details =
    { 'https://email.a2p3.net/email/default': null
    , 'https://people.a2p3.net/namePhoto': null
    , 'https://health.a2p3.net/prov_number': null
    }
rs.exchange( agentRequest, ixToken, function ( error, di ) {
  if (!error) {
    console.log( di ) // { result: { sub: 'v1Gx5AsOf_91wjDQAwPsvrP' }}
    rs.callMultiple( details, function ( errors, results ) {
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

[A2P3 project home page](http://www.a2p3.net)

[A2P3_specs](https://github.com/dickhardt/A2P3_specs) Specifications and POC documentation

[A2P3](https://github.com/dickhardt/A2P3) POC Server implementation source (node.js)

[A2P3_agent](https://github.com/dickhardt/A2P3_agent) POC mobile agent (PhoneGap)

[A2P3_bank](https://github.com/dickhardt/A2P3_bank) POC mobile bank app (PhoneGap)

[sample-node-a2p3](https://github.com/dickhardt/sample-node-a2p3) sample A2P3 application using node-a2p3

[rs-sample-node-a2p3](https://github.com/dickhardt/rs-sample-node-a2p3) sample A2P3 resource server using node-a2p3

## License
MIT License

Copyright (c) 2013 Province of British Columbia

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

