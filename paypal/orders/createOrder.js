'use strict';

const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

const payPalClient = require('../paypal_client');
const paypalServerDomain = require('../paypal_server_domain');

const utilities = require('../../utilities');
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
		quantity = 0
	) {
		this.name = name;
		this.description = description;
		this.sku = sku;
		this.value = value;
		this.quantity = quantity;
	}

	toJson() {
		return {
			name: this.name,
			description: this.description,
			sku: this.sku,
			unit_amount: {
				currency_code: 'USD',
				value: this.value,
			},
			quantity: this.quantity,
			category: 'DIGITAL_GOODS',
		};
	}
};

module.exports.buildRequestBody = function buildRequestBody(items = []) {
	// return {
	// 	intent: 'CAPTURE',
	// 	application_context: {
	// 		return_url: `${paypalServerDomain.address}:${paypalServerDomain.port}/success`,
	// 		cancel_url: 'https://www.example.com',
	// 		brand_name: 'EXAMPLE INC',
	// 		locale: 'en-US',
	// 		landing_page: 'BILLING',
	// 		shipping_preference: 'SET_PROVIDED_ADDRESS',
	// 		user_action: 'CONTINUE',
	// 	},
	// 	purchase_units: [
	// 		{
	// 			reference_id: 'PUHF',
	// 			description: 'Sporting Goods',

	// 			custom_id: 'CUST-HighFashions',
	// 			soft_descriptor: 'HighFashions',
	// 			amount: {
	// 				currency_code: 'USD',
	// 				value: '220.00',
	// 				breakdown: {
	// 					item_total: {
	// 						currency_code: 'USD',
	// 						value: '180.00',
	// 					},
	// 					shipping: {
	// 						currency_code: 'USD',
	// 						value: '20.00',
	// 					},
	// 					handling: {
	// 						currency_code: 'USD',
	// 						value: '10.00',
	// 					},
	// 					tax_total: {
	// 						currency_code: 'USD',
	// 						value: '20.00',
	// 					},
	// 					shipping_discount: {
	// 						currency_code: 'USD',
	// 						value: '10',
	// 					},
	// 				},
	// 			},
	// 			items: [
	// 				{
	// 					name: 'T-Shirt',
	// 					description: 'Green XL',
	// 					sku: 'sku01',
	// 					unit_amount: {
	// 						currency_code: 'USD',
	// 						value: '90.00',
	// 					},
	// 					tax: {
	// 						currency_code: 'USD',
	// 						value: '10.00',
	// 					},
	// 					quantity: '1',
	// 					category: 'PHYSICAL_GOODS',
	// 				},
	// 				{
	// 					name: 'Shoes',
	// 					description: 'Running, Size 10.5',
	// 					sku: 'sku02',
	// 					unit_amount: {
	// 						currency_code: 'USD',
	// 						value: '45.00',
	// 					},
	// 					tax: {
	// 						currency_code: 'USD',
	// 						value: '5.00',
	// 					},
	// 					quantity: '2',
	// 					category: 'PHYSICAL_GOODS',
	// 				},
	// 			],
	// 			shipping: {
	// 				method: 'United States Postal Service',
	// 				name: {
	// 					full_name: 'qwerty',
	// 				},
	// 				address: {
	// 					address_line_1: '123 Townsend St',
	// 					address_line_2: 'Floor 6',
	// 					admin_area_2: 'San Francisco',
	// 					admin_area_1: 'CA',
	// 					postal_code: '94107',
	// 					country_code: 'US',
	// 				},
	// 			},
	// 		},
	// 	],
	// };

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
					currency_code: 'USD',
					value: totalValue,
					breakdown: {
						item_total: {
							currency_code: 'USD',
							value: totalValue.toString(),
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
	try {
		const db = utilities.openDatabase();
		const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
		request.headers['prefer'] = 'return=representation';
		request.requestBody(requestBody);
		const response = await payPalClient.client().execute(request);

		// db.prepare(
		// 	`INSERT OR REPLACE INTO payments(id, server_id, user_id, payment_status, payment_time) VALUES(?,?,?,?)`
		// ).run([
		// 	response.result.id,
		// 	itemRow.category_id,
		// 	itemRow.item_name,
		// 	response.result.status,
		// 	"DATETIME('now'",
		// ]);

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
	} catch (error) {
		console.error(error);
	}
};
