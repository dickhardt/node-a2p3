/*
* preinstall.js - preinstall code for node-a2p3
*
* Copyright (C) Province of British Columbia, 2013
*/

var fs = require('fs')
  , util = require('util')
  , crypto = require('crypto')

function randomString () {
  return crypto.randomBytes( 8 ).toString( 'hex' )
}

if ( fs.existsSync('config.json') ) {
  console.log('Using existing config.json')
} else {
  console.log( 'Creating config.json' )
  var data = fs.readFileSync( __dirname + '/default.config.json' ).toString()
  // prepend random string so that AppID is unique if not changed
  data = data.replace( /XXX/g , randomString() )
  fs.writeFileSync( 'config.json', data )
}