/*
* A2P3 App Module
*
* library to make it easy to build A2P3 apps with node.js
*
* Copyright (C) Province of British Columbia, 2013
*/

var request = require('request')
  , urlParse = require('url').parse
  , jwt = require('./jwt')

var vault = null

function Request ( config ) {
  var that = this
  // first check if we are de-serializing our object
  if (config && typeof config === 'string') {
    try {
      var oldThis = JSON.parse( config )
      Object.keys( oldThis ).forEach( function ( key ) {
        that[ key ] = oldThis[ key ]
      })
    }
    catch (e) {
      throw e
    }
    return this
  }
  if (!config) throw new Error('Request was given empty config')
  // creating it for first time, some sanity checks
  if (!config.host) throw new Error('No host in configuration.')
  if (!config.vault) throw new Error('No vault in configuration.')
  vault = require(config.vault)
  config.ix = config.ix || 'ix.a2p3.net'
  config.ixURL = config.ixURL || 'https://ix.a2p3.net'
  if (!vault[config.ix]) throw new Error('No keys for IX in vault.')
    config.alg = config.alg || 'HS512'
  this.config = config
  return this
}

Request.prototype.stringify = function () {
  return JSON.stringify( this )
}

// create an Agent Request
Request.prototype.agent = function agent ( returnURL, auth, scopes ) {
  var config = this.config
  // set default parameters if needed
  if (!scopes) { // no auth passed in, set to default
    scopes = auth
    auth = { passcode: true, authorization: true }
  }
  if (!scopes) scopes = []
  // // check we have keys for each resource
  // scopes.forEach( function ( scope ) {
  //   var url = urlParse( scope )
  //   var host = url.hostname
  //   if ( !vault[ url.hostname ] ) throw new Error('No keys in vault for "'+host+'"')
  // })
  // ok, make Agent Request
  var credentials = vault[config.ix].latest
  var details =
  { header:
    { typ: 'JWS'
    , alg: config.alg
    , kid: credentials.kid
    }
  , payload:
    { 'iss': config.host
    , 'aud': config.ix
    , 'iat': jwt.iat()
    , 'request.a2p3.org':
      { 'resources': scopes
      , 'auth': auth
      , 'returnURL': returnURL
      }
    }
  , credentials: credentials
  }
  this.agentRequest = jwt.jws( details )
  return this.agentRequest
}

function processResponse ( callback ) {
  return function processResponse ( error, response, body ) {
    var data = null
      , err = null
    if ( error ) {
      err = new Error(error)
      return callback( err, null)
    }
    if ( response.statusCode != 200 ) {
      err = new Error('Server responded with '+response.statusCode)
      return callback( err, null)
    }
    try {
      data = JSON.parse(body)
    }
    catch (e){
      return callback( e, null)
    }
    if (data.error) {
      err = new Error(data.error.message)
      return callback( err, null)
    }
    callback( null, data.result )
  }
}

// Exchange the IX Token for the RS Tokens
Request.prototype.exchange = function exchange ( ixToken, callback ) {
  var that = this
    , config = that.config
  if (!that.agentRequest) {
    var err = new Error('No Agent Request found in A2P3 object.')
    return callback( err )
  }
  var credentials = vault[config.ix].latest
  var details =
  { header:
    { typ: 'JWS'
    , alg: config.alg
    , kid: credentials.kid
    }
  , payload:
    { 'iss': config.host
    , 'aud': config.ix
    , 'iat': jwt.iat()
    , 'request.a2p3.org':
      { 'token': ixToken
      , 'request': that.agentRequest
      }
    }
  , credentials: credentials
  }
  var ixRequest = jwt.jws( details )
  request.post( config.ixURL + '/exchange'
    , { form: { request: ixRequest } }
    , processResponse( function ( e, result ) {
        if (e) return callback( e )
        that.ix = result
        callback( null, that.ix.sub )
      })
    )
}

Request.prototype.call = function call ( api, params, callback ) {
  if (typeof params === 'function') {
    callback = params
    params = {}
  }
  var that = this
    , config = that.config
    , url = urlParse( api )
    , apiHost = url.hostname
    , err = null
  if ( !that.ix ) {
    err = new Error('No IX exchange results in A2P3 object.')
    return callback( err )
  }
  // check if we are calling a standardized resource, and if so, map to the redirect
  if ( that.ix.redirects && that.ix.redirects[ apiHost ] ) {
    var newApiHost = that.ix.redirects[ apiHost ][ 0 ]
    api = api.replace( apiHost, newApiHost )
    apiHost = newApiHost
    }
  if ( !that.ix.tokens || !that.ix.tokens[ apiHost] ) {
    err = new Error('No Resource Server token found in A2P3 object for "'+apiHost+'".')
    return callback( err )
  }
  var credentials = vault[ apiHost ].latest
  var details =
  { header:
    { typ: 'JWS'
    , alg: config.alg
    , kid: credentials.kid
    }
  , payload:
    { 'iss': config.host
    , 'aud': apiHost
    , 'iat': jwt.iat()
    , 'request.a2p3.org': params
    }
  , credentials: credentials
  }
  details.payload['request.a2p3.org'].token = that.ix.tokens[ apiHost]
  var rsRequest = jwt.jws( details )
  request.post( api, { form: { request: rsRequest } } , processResponse( callback ) )
}

exports.Request = Request

exports.random16bytes = function() {
  return jwt.handle()
}



