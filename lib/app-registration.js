/*
* app-registration
*
* script to register an App at the Registrar and any provided resource servers
*
* Copyright (C) Province of British Columbia, 2013
*/

var fs = require('fs')
  , async = require('async')
  , urlParse = require('url').parse
  , jwt = require('./jwt')
  , fetch = require('./requestJar').fetch // wrapper around request module that deals with cookies across hosts


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
  console.error('usage: node app-registration.js app-config.json')
  console.error('\n\tSee http://github.com/dickhardt/node-A2P3 for details')
  process.exit( 1 )
}

// no config file, print out help
if (process.argv.length < 3) terminate('no app-config.json provided')
var configFile = process.argv[2]

// get config file and check it is sane
if ( !fs.existsSync( configFile ) ) terminate('could not find "'+configFile+'"')
var data = fs.readFileSync( configFile )
try {
  var config = JSON.parse(data)
}
catch (e) {
  terminate('Error parsing "'+configFile+'"\n'+e)
}
if (!config.host) terminate('"host" is required')
if (!config.name) terminate('"name" is required')
if (!config.device) terminate('"device" is required')
config.registrar = config.registrar || 'registrar.a2p3.net'
config.ix = config.ix || 'ix.a2p3.net'
config.registrarURL = config.registrarURL || 'https://registrar.a2p3.net'
config.setupURL = config.setupURL || 'https://setup.a2p3.net'
config.protocol = config.protocol || 'https'
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
    console.log('\tGetting Agent Request from',config.setupURL)
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
      if (!json || !json.result || !json.result.token)
        return done('Did not expect"'+json.stringify+'"')
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
    console.log('\tRegistering "'+config.host+'" at "'+rs+'"')
    var options =
      { url: resourceURL[rs] + '/dashboard/new/app'
      , form: { id: config.host }
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
  fs.writeFileSync( 'vault.json', data)
})

// go execute all our tasks now!
async.series( tasks, function (error) {
  if (error) {
    console.log( error )
    process.exit(1)
  }
})