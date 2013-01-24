/*
* register.js
*
* setup script to register an App at the Registrar and any provided resource servers
*
* Copyright (C) Province of British Columbia, 2013
*/

var fs = require('fs')
  , async = require('async')
  , urlParse = require('url').parse
  , jwt = require('../lib/jwt')
  , fetch = require('../lib/requestjar').fetch // wrapper around request module that deals with cookies across hosts

// TBD - change defaults to httpS when certs are available XXXXXXXX


/*

TBD

Check that the device value in config.json has been changed ...

*/

var CONFIG_FILE = __dirname + '/../../../config.json'
var VAULT_FILE = __dirname + '/../../../vault.json'

// build our list of known resources
var provinces =
  ['ab', 'bc', 'mb', 'nb', 'nl', 'ns', 'nt', 'nu', 'on', 'pe', 'qc', 'sk', 'yt']
var  knownResources =
  { 'si.a2p3.net': true
  , 'people.a2p3.net': true
  , 'health.a2p3.net': true
  , 'email.a2p3.net': true
  }
provinces.forEach( function ( province ) {
  knownResources['people.'+province+'.a2p3.net'] = true
  knownResources['health.'+province+'.a2p3.net'] = true
})

function terminate( message ) {
  console.error('error: '+message)
  process.exit( 1 )
}

// get config file and check it is sane
if ( !fs.existsSync( CONFIG_FILE ) ) terminate('could not find "'+CONFIG_FILE+'"')
var data = fs.readFileSync( CONFIG_FILE )
try {
  var config = JSON.parse(data)
}
catch (e) {
  terminate('Error parsing "'+CONFIG_FILE+'"\n'+e)
}

if (config.device == "SET_THIS_TO_THE_DEVICE_VALUE_FROM_YOUR_CLI_AGENT")
  terminate('\n\nNot so good at following directions eh?\nGet a "device" value from a CLI at http://setup.a2p3.net and put it into config.json\n')
if (!config.appID) terminate('"appID" is required')
if (!config.name) terminate('"name" is required')
if (!config.device) terminate('"device" is required')


// congig.json parameters used when testing against locally running A2P3 environment
config.registrar = config.registrar || 'registrar.a2p3.net'
config.ix = config.ix || 'ix.a2p3.net'
config.registrarURL = config.registrarURL || 'http://registrar.a2p3.net'
config.setupURL = config.setupURL || 'http://setup.a2p3.net'
config.protocol = config.protocol || 'http'
if (config.protocol == 'https') {
  config.port = config.port || '443'
  config.port = ( config.port == '443' ) ? '' : ':'+config.port
} else {  // assume it is 'http'
  config.port = config.port || '80'
  config.port = ( config.port == '80' ) ? '' : ':'+config.port
}

config.resources = config.resources || []

var resourceURL = {}
resourceURL[config.registrar] = config.registrarURL

// build URLs and delete any resource servers we don't understand
config.resources.forEach( function ( rs ) {
  if ( knownResources[rs] )
    resourceURL[rs] = config.protocol + '://' + rs + config.port
  else
    console.error('Ignoring unknown resource:"'+rs+'"')
})

var vault = {}
  , tasks = []

//globals we keep between steps
// we are processing everything sequentially, so this works
var agentRequest
  , jws
  , ixToken

function addKeyTasks ( rs ) {
  tasks.push( function getAgentRequest ( done ) {
    console.log(rs,'processing')
    console.log('\tGetting Agent Request from',resourceURL[rs])
    var options =
      { url: resourceURL[rs] + '/login'
      , method: 'GET'
      , qs: { json: true }
      , followRedirect: false
      }
    fetch( options, function ( e, response, body ) {
      var r = null
      if ( e ) return done( e )
      if ( response.statusCode != 200 && response.statusCode != 302 )
        return done('"'+rs+'" returned '+response.statusCode)
      try {
        r = JSON.parse( body )
      }
      catch (e) {
        return done( e )
      }
      if (!r || !r.result || !r.result.request)
        return done('Did not expect"'+body+'"')
      // save Agent Request and parse it for next call
      var agentUrl = r.result.request
      var u = urlParse( agentUrl, true )
      agentRequest = u.query.request
      jws = new jwt.Parse( agentRequest )
      done( null )
    })
  })
  tasks.push( function getIXToken ( done ) {
    console.log('\tGetting IX Token from',config.setupURL)
    var options =
      { url: config.setupURL + '/token'
      , method: 'POST'
      , json:
        { device: config.device
        , sar: jws.signature
        , auth: { passcode: true, authorization: true }
        }
      }
    fetch( options, function ( e, response, json ) {
      if ( e ) return done( e )
      if ( response.statusCode != 200 && response.statusCode != 302 )
        return done('"'+rs+'" returned '+response.statusCode)
      if (json.error)
        return done("Received error:"+JSON.stringify(json.error))
      if (!json || !json.result || !json.result.token)
        return done('Did not expect"'+JSON.stringify(json)+'"')
      // save code for next step
      ixToken = json.result.token
      done( null )
    })
  })
  tasks.push( function login ( done ) {
    console.log('\tLogging into',resourceURL[rs])
    var options =
      { url: jws.payload['request.a2p3.org'].returnURL
      , method: 'GET'
      , qs: { token: ixToken }
      , followRedirect: false
      }
    fetch( options, function ( e, response ) {
      if ( e ) return done( e )
      if ( response.statusCode != 304 && response.statusCode != 302 )
        return done('"'+rs+'" returned '+response.statusCode)
      if ( !response.headers || !response.headers.location ||
            response.headers.location != resourceURL[rs] + '/dashboard')
        return done('Was sent not redirected to /dashboard')
      done( null )
    })
  })
  tasks.push( function fetchDashboard ( done ) {
    console.log('\tGetting /dashboard from',resourceURL[rs])
    var options =
      { url: resourceURL[rs] + '/dashboard'
      , method: 'GET'
      , followRedirect: false
      }
    fetch( options, function ( e, response ) {
      if ( e ) return done( e )
      if ( response.statusCode != 200 )
        return done('"'+rs+'" returned '+response.statusCode)
      done( null )
    })
  })
  tasks.push( function getKeys ( done ) {
    // frist we see if we can read existing keys in case the app was already registered
    console.log('\tGetting keys at '+rs)
    console.log('\tChecking if "'+config.appID+'" registered at "'+rs+'"')
    var options =
      { url: resourceURL[rs] + '/dashboard/getkey'
      , form: { id: config.appID }
      , method: 'POST'
      }
    fetch( options, function ( e, response, body ) {
      var r = null
      if ( e ) return done( e )
      if ( response.statusCode != 200 )
        return done('"'+rs+'" returned '+response.statusCode)
      try {
        r = JSON.parse( body )
      }
      catch (e) {
        return done( e )
      }
      if (!r)
        return done('Did not expect"'+body+'"')
      if (!r.error) {
        if (r.result && r.result.key) { // regular resource or Registrar
          vault[rs] = r.result.key
          if (rs == config.registrar) vault[config.ix] = r.result.key
        } else { // standardized resource
          Object.keys(r.result).forEach( function ( host ) {
            vault[host] = r.result[host]
          })
        }
        done( null )
      } else {  // we got an error, try registering the app
        console.log('\tRegistering "'+config.appID+'" at "'+rs+'"')
        var options =
          { url: resourceURL[rs] + '/dashboard/new/app'
          , form: { id: config.appID }
          , method: 'POST'
          }
        if (rs == config.registrar) options.form.name = config.name
        fetch( options, function ( e, response, body ) {
          var r = null
          if ( e ) return done( e )
          if ( response.statusCode != 200 )
            return done('"'+rs+'" returned '+response.statusCode)
          try {
            r = JSON.parse( body )
          }
          catch (e) {
            return done( e )
          }
          if (!r || !r.result)
            return done('Did not expect"'+body+'"')
          if (r.result.key) { // regular resource or Registrar
            vault[rs] = r.result.key
            if (rs == config.registrar) vault[config.ix] = r.result.key
          } else { // standardized resource
            Object.keys(r.result).forEach( function ( host ) {
              vault[host] = r.result[host]
            })
          }
          done( null )
        })
      }
    })
  })
}

// add tasks for Registrar and each RS
addKeyTasks( config.registrar ) // registrar needs to be added first
Object.keys( resourceURL ).forEach( function (rs) {
  if (rs != config.registrar)
    addKeyTasks( rs )
})


// Add task to write out the resulting vault
tasks.push( function writeVault() {
  var data = JSON.stringify( vault )
  console.log('... writing "vault.json"')
  fs.writeFileSync( VAULT_FILE, data)
})

// go execute all our tasks now!
async.series( tasks, function (error) {
  if (error) {
    console.log( error )
    process.exit(1)
  }
})