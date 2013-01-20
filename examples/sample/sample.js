/*
* sample.js
*
* Sample App
*
* gets all profile data about a user and displays it
*
* Copyright (C) Province of British Columbia, 2013
*/


var express = require('express')
  , crypto = require('crypto')
  , async = require('async')
  , app = express()
  , a2p3 = require('../../lib/a2p3') // change to 'a2p3' if using this as template

var HOST_ID = 'example.a2p3.com'
  , HOST_PORT = 8080
  , HOST_URL = 'http://localhost'   // http://example.a2p3.com'
  , RESOURCES =
    [ 'http://email.a2p3.net/scope/default'
    , 'http://people.a2p3.net/scope/details'
    , 'http://si.a2p3.net/scope/number'
    , 'http://health.a2p3.net/scope/prov_number'
    ]

var EMAIL_RS  = 'email.a2p3.net'
  , PEOPLE_RS = 'people.a2p3.net'
  , SI_RS     = 'si.a2p3.net'
  , HEALTH_RS = 'health.a2p3.net'
  , EMAIL_PROFILE_URL  = 'http://email.a2p3.net/email/default'
  , PEOPLE_PROFILE_URL = 'http://people.a2p3.net/details'
  , SI_PROFILE_URL     = 'http://si.a2p3.net/number'
  , HEALTH_PROFILE_URL = 'http://health.a2p3.net/prov_number'


// login() - called by web app
// creates an agentRequest and state
function login( req, res )  {
  var request = new a2p3.Request(
    { host: HOST_ID
    , vault: require('./vault.json')
    , ixURL: 'http://ix.a2p3.net'
    })
  var agentRequest = request.agent( HOST_URL + ':' + HOST_PORT + '/response', RESOURCES )
  req.session.a2p3 = request.stringify()
  var state = crypto.randomBytes(16).toString()
  req.session.state = state
  res.send( { result: { agentRequest: agentRequest, state: state } } )
}

// clear session, logout user
function logout( req, res )  {
  req.session = null
  res.redirect('/')
}

// exchange IX Token for RS Tokens and send appropriate redirect response
function exchangeToken ( req, res ) {
  var request = new a2p3.Request( req.session.a2p3 )
  var token = req.query.token
  request.exchange( token, function ( e, identifer ) {
    req.session.a2p3 = request.stringify()
    if ( e ) return res.redirect('/error')
    req.session.tokens = true
    return res.redirect('/')
  })
}

/*
* loginResponse() - gets response from agent, or calls from web app
*
* if receives:
* - token: web app invoked agent and this is the IX Token, all done
* - state: web app showed QR code, and we need to wait to get the IX Token from the agent
* - state & token: this comes from the agent that scanned a QR code and we bind IX Token
*                   to a call that just has state
*/

var EventEmitter = require('events').EventEmitter   // does not scale past one machine
var tokenChannel = new EventEmitter()               // use events to pass token between agent and web app

function loginResponse( req, res )  {
  var token = req.query.token
  var state = req.query.state
  if (  state ) {
    if ( token ) {  // agent is sending us the token directly, send token over tokenChannel
      tokenChannel.emit( state, token)
      res.redirect('/complete') // send browser on agent to a complete page
    } else {
      // w ait to get token from tokenChannel
      token.channel.once( state, function ( token ) {
        req.query.token = token
        return exchangeToken( req, res )
      })
    }
  } else if ( token ) {
    return exchangeToken( req, res )
  } else {
    // did not get anything we expected
    res.redirect('/error')
  }
}



function fetchProfile( tokens, a2p3String, callback ) {
  var request = new a2p3.Request( a2p3String )
  var tasks = {}

debugger;

  tasks[ EMAIL_RS ] = function ( done ) {
    request.call( EMAIL_PROFILE_URL, done ) }
  tasks[ PEOPLE_RS ] = function ( done ) {
    request.call( PEOPLE_PROFILE_URL, done ) }
  tasks[ SI_RS ] = function ( done ) {
    request.call( SI_PROFILE_URL, done ) }
  tasks[ HEALTH_RS ] = function ( done ) {
    request.call( HEALTH_PROFILE_URL, done ) }
  async.parallel( tasks, callback )
}

function profile( req, res )  {
  if ( req.session.tokens ) {
    fetchProfile( req.session.tokens, req.session.a2p3, function ( e, profile ) {
      delete req.session.tokens
      if ( e ) return res.send( { error: e, result: profile } )
      req.session.profile = profile
      return res.send( { result: profile } )
    })
  } else if ( req.session.profile ) { // already have profile, send it
    return res.send( { result: req.session.profile } )
  } else { // not logged in
    return res.send( { errror: 'NOT_LOGGED_IN'} )
  }
}

// set up middleware

app.use( express.static( __dirname + '/assets' ) )  // put static assets here
app.use( express.logger( 'dev' ) )                         // so that we only log page requests
app.use( express.limit('10kb') )                    // protect against large POST attack
app.use( express.bodyParser() )

app.use( express.cookieParser() )                   // This does not scale to more than one machine
var cookieOptions =                                 // Put in DB backend for session to scale
  { 'secret': crypto.randomBytes(16).toString()
  , 'cookie': { path: '/' } }
app.use( express.cookieSession( cookieOptions ))

//setup request routes

// these end points are all AJAX calls from the web app and have JSON response
app.get('/login', login )
app.get('/profile', profile )

// these pages change state and return a redirect
app.get('/response', loginResponse )
app.get('/logout', logout )

// these endpoints serve static HTML pages
app.get('/homepage', function( req, res ) { res.sendfile( __dirname + '/html/homepage.html' ) } )
app.get('/error', function( req, res ) { res.sendfile( __dirname + '/html/login_error.html' ) } )
app.get('/complete', function( req, res ) { res.sendfile( __dirname + '/html/login_complete.html' ) } )

app.listen( HOST_PORT )

console.log('\nSample App started and listening on ', HOST_PORT)
