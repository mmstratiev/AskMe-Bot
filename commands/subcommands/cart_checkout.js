const SubCommand = require('../classes/subcommand');
const utilities = require('../../utilities');
const createOrder = require('../../paypal/orders/createOrder');
const { Collection } = require('discord.js');

class Cart_Checkout extends SubCommand {
	async execute_internal(message, args) {
		let db = utilities.openDatabase();
		let cartRow = db
			.prepare(
				'SELECT ID id FROM carts WHERE server_id = ? AND user_id = ?'
			)
			.get([message.guild.id, message.author.id]);

		if (cartRow) {
			let cartItems = db
				.prepare('SELECT * FROM cart_items WHERE cart_id = ?')
				.all([cartRow.id]);

			if (cartItems.length > 0) {
				// Item ID to Cart Item map
				let itemIDToCartItem = new Map(
					cartItems.map((cartItem) => [cartItem.item_id, cartItem])
				);

				// Get all items that match the ids
				let itemsRows = db
					.prepare(
						'SELECT * FROM items WHERE id IN(SELECT item_id FROM cart_items WHERE cart_id = ?)'
					)
					.all([cartRow.id]);

				await message
					.reply('Creating order link...')
					.then(async (r) => {
						try {
							let paypalItems = new Array();
							itemsRows.forEach((itemRow) => {
								paypalItems.push(
									new createOrder.PaypalItem(
										itemRow.item_name,
										itemRow.item_description,
										itemRow.id,
										itemRow.item_price,
										itemIDToCartItem.get(
											itemRow.id
										).item_quantity
									)
								);
							});

							await createOrder
								.createOrder(
									createOrder.buildRequestBody(paypalItems),
									false
								)
								.then((createResponse) => {
									createResponse.result.links.forEach(
										(element) => {
											if (element.rel === 'approve') {
												message.reply(element.href);
											}
										}
									);
								});
						} catch (error) {
							throw new Error(error);
						} finally {
							r.delete();
						}
					});
			} else {
				message.reply('Cart is empty!');
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Checkout('checkout', 'Desc', [0], ['Usage'], []);
