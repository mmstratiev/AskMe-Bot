'use strict';

const express = require('express');
const api = express.Router();

const captureOrder = require('../paypal/orders/captureOrder');

const utilities = require('../utilities');
const fetch = require('node-fetch');
const { WebhookClient } = require('discord.js');

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

			// Update payment information
			db.prepare(
				`UPDATE payments SET payment_status=?, payment_time=DATETIME('now') WHERE id=?`
			).run([captureResponse.result.status, captureResponse.result.id]);

			// Get payment details
			const paymentDetails = db
				.prepare(`SELECT server_id, user_id FROM payments WHERE id=?`)
				.get([captureResponse.result.id]);

			console.log(paymentDetails);
			// Clears cart on successful payment
			db.prepare(
				'DELETE FROM cart_items WHERE cart_id IN(SELECT id FROM carts WHERE server_id = ? AND user_id = ?)'
			).run([paymentDetails.server_id, paymentDetails.user_id]);

			fetch(
				'https://discordapp.com/api/webhooks/747511809501691924/-cgEAOp2tHhoaVVjbdjK10I-nrsS8NlvJ7Enbe89JQ8OBGt4GBMdzHc2fAvoUjVg3LXR',
				{
					method: 'get',
					headers: { 'Content-Type': 'application/json' },
				}
			)
				.then((res) => res.json())
				.then((json) => {
					const webhookClient = new WebhookClient(
						json.id,
						json.token
					);

					webhookClient.send('Payment success!');
				})
				.catch((err) => console.log(err));

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
