'use strict';

const express = require('express');
const api = express.Router();

const captureOrder = require('../paypal/orders/captureOrder');

const utilities = require('../classes/utilities');
const localization = require('../localization.json');

const fetch = require('node-fetch');
const { WebhookClient, MessageEmbed } = require('discord.js');

api.get('/success', (req, res) => {
	const orderID = req.query.token;
	const db = utilities.openDatabase();

	const sendToUserWebhook = function (serverId, content) {
		// Get user webhook address
		let userWebhookSetting = utilities.getServerSettingValue(
			serverId,
			'payment_user_webhook'
		);

		if (userWebhookSetting) {
			fetch(userWebhookSetting, {
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
				.catch((err) => console.error(err));
		}
	};

	const sentToAdminWebhook = function (serverId, content) {
		// Get admin webhook address
		let adminWebhookSetting = utilities.getServerSettingValue(
			serverId,
			'payment_admin_webhook'
		);

		if (adminWebhookSetting) {
			fetch(adminWebhookSetting, {
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
				.catch((err) => console.error(err));
		}
	};

	let capture = captureOrder
		.captureOrder(orderID)
		.then((captureResponse) => {
			// Update payment information
			db.prepare(
				`UPDATE payments SET payment_status=?, payment_time=DATETIME('now') WHERE id=?`
			).run([captureResponse.result.status, captureResponse.result.id]);

			// Get payment details
			const paymentDetails = db
				.prepare(
					`SELECT users.user_name, payments.server_id, payments.user_id FROM payments 
					INNER JOIN users
					ON payments.user_id = users.id and payments.server_id = users.server_id
					WHERE payments.id=?`
				)
				.get([orderID]);

			const currencyFormatter = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
			});

			// Send WebHook messages
			try {
				const successEmbed = new MessageEmbed()
					.setAuthor(`${paymentDetails.user_name},`)
					.setColor('#43b581')
					.setTitle(localization.payment_successful_user)
					.addField(
						`${localization.payment_order_id}:`,
						`\`${captureResponse.result.id}\``,
						false
					)
					.addField(
						`${localization.payment_amount}:`,
						`\`${currencyFormatter.format(
							captureResponse.result.purchase_units[0].payments
								.captures[0].amount.value
						)}\``
					)
					.setFooter(localization.payment_successful_thanks);

				const successAdminEmbed = new MessageEmbed()
					.setColor('#43b581')
					.setTitle(
						localization.payment_successful_admin.replace(
							'^1',
							paymentDetails.user_name
						)
					)
					.addField(
						`${localization.payment_order_id}:`,
						`\`${captureResponse.result.id}\``,
						false
					)
					.addField(
						`${localization.payment_amount}:`,
						`\`${currencyFormatter.format(
							captureResponse.result.purchase_units[0].payments
								.captures[0].amount.value
						)}\``
					);

				sendToUserWebhook(paymentDetails.server_id, successEmbed);
				sentToAdminWebhook(paymentDetails.server_id, successAdminEmbed);
			} catch (webhookError) {
				console.error(webhookError);
			}

			// Clear shopping cart for user
			db.prepare(
				'DELETE FROM cart_items WHERE cart_id IN(SELECT id FROM carts WHERE server_id = ? AND user_id = ?)'
			).run([paymentDetails.server_id, paymentDetails.user_id]);

			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end(localization.payment_successful);
		})
		.catch((error) => {
			console.error(error);

			res.statusCode = 200;
			res.setHeader('Content-Type', 'text/plain');
			res.end(localization.payment_failed);
		})
		.finally(() => {
			db.close();
		});
});

module.exports = api;
