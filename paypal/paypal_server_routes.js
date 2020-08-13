'use strict';

const express = require('express');
const api = express.Router();

const captureOrder = require('../paypal/orders/captureOrder');

api.get('/success', (req, res) => {
	const orderID = req.query.token;

	// let authorize = authorizeOrder(token);
	let capture = captureOrder
		.captureOrder(orderID)
		.then((result) => {
			// TODO: make fancy
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Success');
		})
		.catch((error) => {
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Failure');
		});
});

module.exports = api;
