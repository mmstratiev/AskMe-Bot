'use strict';

const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

const payPalClient = require('../paypal_client');
const paypalServerDomain = require('../paypal_server_domain');

const utilities = require('../../classes/utilities');
/**
 * Setting up the JSON request body for creating the Order. The Intent in the
 * request body should be set as "CAPTURE" for capture intent flow.
 *
 */

module.exports.PaypalItem = class PaypalItem {
	constructor(
		name = '',
		description = '',
		sku = '',
		value = 0,
		quantity = 0,
		currency = 'USD'
	) {
		this.name = name;
		this.description = description;
		this.sku = sku;
		this.value = value;
		this.quantity = quantity;
		this.currency = currency;
	}

	toJson() {
		return {
			name: this.name,
			description: this.description,
			sku: this.sku,
			unit_amount: {
				currency_code: this.currency,
				value: this.value,
			},
			quantity: this.quantity,
			category: 'DIGITAL_GOODS',
		};
	}
};

module.exports.buildRequestBody = function buildRequestBody(
	items = [],
	currency = 'EUR'
) {
	let totalValue = 0;
	items.forEach((item) => {
		totalValue += item.value * item.quantity;
	});

	return {
		intent: 'CAPTURE',
		application_context: {
			return_url: `${paypalServerDomain.address}:${paypalServerDomain.port}/success`,
			cancel_url: 'https://www.example.com',
			brand_name: 'EXAMPLE INC',
			locale: 'en-US',
			landing_page: 'BILLING',
			shipping_preference: 'NO_SHIPPING',
			user_action: 'PAY_NOW',
		},
		purchase_units: [
			{
				amount: {
					currency_code: currency,
					value: totalValue,
					breakdown: {
						item_total: {
							currency_code: currency,
							value: totalValue,
						},
					},
				},
				items: items.map((item) => item.toJson()),
			},
		],
	};
};

/**
 * This is the sample function which can be issued to create an order. It uses the
 * JSON body returned by buildRequestBody() to create a new Order.
 */
module.exports.createOrder = async function createOrder(
	requestBody,
	debug = false
) {
	const db = utilities.openDatabase();
	const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
	request.headers['prefer'] = 'return=representation';
	request.requestBody(requestBody);
	const response = await payPalClient.client().execute(request);

	if (debug) {
		console.log('Status Code: ' + response.statusCode);
		console.log('Status: ' + response.result.status);
		console.log('Order ID: ' + response.result.id);
		console.log('Intent: ' + response.result.intent);
		console.log('Links: ');
		response.result.links.forEach((item, index) => {
			let rel = item.rel;
			let href = item.href;
			let method = item.method;
			let message = `\t${rel}: ${href}\tCall Type: ${method}`;
			console.log(message);
		});
		console.log(
			`Gross Amount: ${response.result.purchase_units[0].amount.currency_code} ${response.result.purchase_units[0].amount.value}`
		);
		// To toggle print the whole body comment/uncomment the below line
		console.log(JSON.stringify(response.result, null, 4));
	}
	return response;
};
