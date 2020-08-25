'use strict';

const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const payPalClient = require('../paypal_client');

/**
 * This method can be used to refund the capture. This function should be called
 * with valid captureId in the argument.
 *
 * @param captureId
 * @param debug
 * @returns
 */
module.exports.refundOrder = async function refundOrder(
	captureId,
	debug = false
) {
	const request = new checkoutNodeJssdk.payments.CapturesRefundRequest(
		captureId
	);

	// blank body for a full refund
	request.requestBody({});

	const response = await payPalClient.client().execute(request);
	if (debug) {
		console.log('Status Code: ' + response.statusCode);
		console.log('Status: ' + response.result.status);
		console.log('Refund ID: ' + response.result.id);
		console.log('Links:');
		response.result.links.forEach((item, index) => {
			let rel = item.rel;
			let href = item.href;
			let method = item.method;
			let message = `\t${rel}: ${href}\tCall Type: ${method}`;
			console.log(message);
		});
		// To toggle print the whole body comment/uncomment the below line
		console.log(JSON.stringify(response.result, null, 4));
	}
	return response;
};
