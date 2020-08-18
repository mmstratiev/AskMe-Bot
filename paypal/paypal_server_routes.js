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
		.then((result) => {
			// TODO: make fancy
			result.result.purchase_units.forEach((element) => {
				console.log(element);
			});

			// db.prepare(
			// 	`INSERT INTO payments(item_id, category_id, item_name, item_desc, item_price) VALUES(?,?,?,?,?)`
			// ).run([
			// 	itemRow.id,
			// 	itemRow.category_id,
			// 	itemRow.item_name,
			// 	itemRow.item_description,
			// 	itemRow.item_price,
			// ]);

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
