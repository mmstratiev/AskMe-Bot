const utilities = require('../../utilities');
const createOrder = require('../../paypal/orders/createOrder');
const localization = require('../../localization.json');
const { MessageEmbed } = require('discord.js');

const SubCommand = require('../classes/subcommand');
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
					.reply(localization.reply_checkout_creating)
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
									true
								)
								.then((createResponse) => {
									db.prepare(
										`INSERT OR REPLACE INTO payments(id, server_id, user_id, payment_status, payment_time) VALUES(?,?,?,?,DATETIME('now'))`
									).run([
										createResponse.result.id,
										message.guild.id,
										message.author.id,
										createResponse.result.status,
									]);
									createResponse.result.links.forEach(
										(element) => {
											if (element.rel === 'approve') {
												const currencyFormatter = new Intl.NumberFormat(
													'en-US',
													{
														style: 'currency',
														currency: 'USD',
													}
												);

												// Construct Cart message as embed
												const newContent = new MessageEmbed()
													.setColor('#7289da')
													.setTitle(
														`__${localization.reply_checkout_pay_now}__`
													)
													.setDescription(
														`${
															localization.reply_cart_total
														} **${currencyFormatter.format(
															createResponse
																.result
																.purchase_units[0]
																.amount.value
														)}**`
													)
													.setURL(element.href)
													.addFields(
														itemsRows.map(
															(itemRow) => {
																const quantity = itemIDToCartItem.get(
																	itemRow.id
																).item_quantity;

																return {
																	name: `\`${itemRow.item_name}\` x **${quantity}**`,
																	value: currencyFormatter.format(
																		quantity *
																			itemRow.item_price
																	),
																	inline: true,
																};
															}
														)
													);

												r.edit(
													`<@${message.author.id}>,`,
													newContent
												);
											}
										}
									);
								});
						} catch (error) {
							throw new Error(error);
						}
						// } finally {
						// r.delete();
						// }
					});
			} else {
				message.reply(localization.reply_cart_empty);
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Checkout('checkout', 'Desc', [0], ['Usage'], []);
