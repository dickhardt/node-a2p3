/*
* api.test.js
*
* Sample App test suite
*
* Copyright (C) Province of British Columbia, 2013
*/
// Mocha globals to expect
/*global describe:true, it:true */


var should = require('chai').should()
  , util = require('util')
  , fetch = require('../../../lib/requestJar').fetch
  , jwt = require('../../../lib/jwt')

var HOST_PORT = 8080
  , HOST_URL = 'http://localhost' + ':' + HOST_PORT       // http://example.a2p3.com'
  , SETUP_URL = 'http://setup.a2p3.net'

describe('Testing Sample App ', function () {
  var agentRequest = null
    , ixToken = null
    , jws = null

  describe( ' /login', function () {
    it('should return an Agent Request', function ( done ) {
      var options =
        { url: HOST_URL + '/login'
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.have.property('result')
        r.result.should.have.property('agentRequest')
        // save values for later
        agentRequest = r.result.agentRequest
        jws = new jwt.Parse( agentRequest )
        should.exist( jws )
        done( null )
      })
    })
  })

  describe('-> Setup /token', function () {
    it('should return an IX Token', function (done) {
      var options =
        { url: SETUP_URL + '/token'
        , method: 'POST'
        , json:
          { device: 'N8AU-Iusj5LnF-8Vc9vLkw'  // TBD PUT THIS INTO A CONFIG OR SOMETHING!!!!
          , sar: jws.signature
          , auth:
            { passcode: true
            , authorization: true
            }
          }
        }
      fetch( options, function ( e, response, json ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( json )
        json.should.have.property('result')
        json.result.should.have.property('token')
        // save code for next step
        ixToken = json.result.token
        done( null )
      })
    })
  })

  describe( ' /return', function () {
    it('should redirect to /', function ( done ) {
      var options =
        { url: jws.payload['request.a2p3.org'].returnURL
        , method: 'GET'
        , qs: { token: ixToken }
        , followRedirect: false
        }
      fetch( options, function ( e, response ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 302 )
        response.headers.should.exist
        response.headers.should.have.property( 'location', '/')
        done( null )
      })
    })
  })

  describe(' / (homepage) ', function () {
    it('should return status code of 200 and HTML', function (done) {
      var options =
        { url: HOST_URL + '/'
        , method: 'GET'
        , followRedirect: false
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        should.exist( body )
        response.statusCode.should.equal( 200 )
        done( null )
      })
    })
  })

  describe(' /profile', function () {
    it('should profile data for user', function (done) {
      var options =
        { url: HOST_URL + '/profile'
        , method: 'GET'
        }
      fetch( options, function ( e, response, body ) {
        should.not.exist( e )
        should.exist( response )
        response.statusCode.should.equal( 200 )
        should.exist( body )
        var r = JSON.parse( body )
        should.exist( r )
        r.should.not.have.property('error')
        r.should.have.property('result')
        done( null )
      })
    })
  })
})
