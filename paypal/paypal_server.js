'use strict';

const express = require('express');
const app = express();
const routes = require('./paypal_server_routes.js');

app.use('/', routes);

module.exports = app;
