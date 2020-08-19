'use strict';

const express = require('express');
const api = express.Router();

const captureOrder = require('../paypal/orders/captureOrder');

const utilities = require('../utilities');

api.get('/success', (req, res) => {
	const orderID = req.query.token;
	const db = utilities.openDatabase();

	let capture = captureOrder
		.captureOrder(orderID)
		.then((captureResponse) => {
			// TODO: make fancy
			captureResponse.result.purchase_units.forEach((element) => {
				console.log(element);
			});

			db.prepare(
				`UPDATE payments SET payment_status=?, payment_time=DATETIME('now') WHERE id=?`
			).run([captureResponse.result.status, captureResponse.result.id]);

			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Success');
		})
		.catch((error) => {
			// TODO: Refund
			console.error(error);
			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Failure');
		})
		.finally(() => {
			db.close();
		});
});

module.exports = api;
