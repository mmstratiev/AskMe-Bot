'use strict';

const express = require('express');
const api = express.Router();

const captureOrder = require('../paypal/orders/captureOrder');

const utilities = require('../utilities');
const settings = require('../server_settings.json');

const fetch = require('node-fetch');
const { WebhookClient } = require('discord.js');
const { connect } = require('./paypal_server');

api.get('/success', (req, res) => {
	const orderID = req.query.token;
	const db = utilities.openDatabase();

	const sendToUserWebhook = function (serverId, content) {
		const db = utilities.openDatabase();

		// Get user webhook address
		let userWebhookSetting = db
			.prepare(
				'SELECT setting_value FROM settings WHERE server_id=? AND setting_name=?'
			)
			.get([serverId, settings.payment_user_webhook.name]);

		if (userWebhookSetting) {
			fetch(userWebhookSetting.setting_value, {
				method: 'get',
				headers: { 'Content-Type': 'application/json' },
			})
				.then((res) => res.json())
				.then((json) => {
					const webhookClient = new WebhookClient(
						json.id,
						json.token
					);

					webhookClient.send(content);
				})
				.catch((err) => console.log(err));
		}
		db.close();
	};

	const sentToAdminWebhook = function (serverId, content) {
		const db = utilities.openDatabase();

		// Get admin webhook address
		let adminWebhookSetting = db
			.prepare(
				'SELECT setting_value FROM settings WHERE server_id=? AND setting_name=?'
			)
			.get([serverId, settings.payment_admin_webhook.name]);

		if (adminWebhookSetting) {
			fetch(userWebhookSetting.setting_value, {
				method: 'get',
				headers: { 'Content-Type': 'application/json' },
			})
				.then((res) => res.json())
				.then((json) => {
					const webhookClient = new WebhookClient(
						json.id,
						json.token
					);

					webhookClient.send(content);
				})
				.catch((err) => console.log(err));
		}
		db.close();
	};

	let capture = captureOrder
		.captureOrder(orderID)
		.then((captureResponse) => {
			// TODO: make fancy
			// Update payment information
			db.prepare(
				`UPDATE payments SET payment_status=?, payment_time=DATETIME('now') WHERE id=?`
			).run([captureResponse.result.status, captureResponse.result.id]);

			// Get payment details
			const paymentDetails = db
				.prepare(`SELECT server_id, user_id FROM payments WHERE id=?`)
				.get([captureResponse.result.id]);

			// Clears cart on successful payment
			db.prepare(
				'DELETE FROM cart_items WHERE cart_id IN(SELECT id FROM carts WHERE server_id = ? AND user_id = ?)'
			).run([paymentDetails.server_id, paymentDetails.user_id]);

			sendToUserWebhook(paymentDetails.server_id, 'Success!');

			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Success');
		})
		.catch((error) => {
			// TODO: Refund
			console.error(error);

			sendToUserWebhook(paymentDetails.server_id, 'Failure!');

			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end('Failure');
		})
		.finally(() => {
			db.close();
		});
});

module.exports = api;
