const utilities = require('../../classes/utilities');
const createOrder = require('../../paypal/orders/createOrder');
const localization = require('../../localization.json');

const { MessageEmbed } = require('discord.js');

const SubCommand = require('../../classes/subcommand');
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
				.prepare(
					`SELECT items.id, items.item_name, items.item_description, items.item_price, cart_items.item_quantity
					 FROM items 
					 INNER JOIN cart_items 
					 ON cart_items.item_id=items.id
					WHERE cart_items.cart_id = ?`
				)
				.all([cartRow.id]);

			if (cartItems.length > 0) {
				await message
					.reply(localization.reply_checkout_creating)
					.then(async (r) => {
						const currencyCode = utilities.getServerSettingValue(
							message.guild.id,
							'currency'
						);

						const paypalItems = cartItems.map(
							(cartItem) =>
								new createOrder.PaypalItem(
									cartItem.item_name,
									cartItem.item_description,
									cartItem.id,
									cartItem.item_price,
									cartItem.item_quantity,
									currencyCode
								)
						);

						await createOrder
							.createOrder(
								createOrder.buildRequestBody(
									paypalItems,
									currencyCode
								),
								false
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
											// Construct Cart message as embed
											const newContent = new MessageEmbed()
												.setColor('#43b581')
												.setTitle(
													`__${localization.reply_checkout_pay_now}__`
												)
												.setDescription(
													`${
														localization.reply_cart_total
													} **${utilities.formatCurrency(
														message.guild.id,
														createResponse.result
															.purchase_units[0]
															.amount.value
													)}**`
												)
												.setURL(element.href)
												.addFields(
													cartItems.map(
														(cartItem) => {
															const formattedPrice = utilities.formatCurrency(
																message.guild
																	.id,
																cartItem.item_quantity *
																	cartItem.item_price
															);

															return {
																name: `\`${cartItem.item_name}\` x **${cartItem.item_quantity}**`,
																value: `\`\`\`diff\n+ ${formattedPrice} \`\`\``,
																inline: true,
															};
														}
													)
												);

											r.edit(
												`<@${message.author.id}>, ${localization.reply_checkout_link_ready}`,
												newContent
											);
										}
									}
								);
							});
					});
			} else {
				message.reply(localization.reply_cart_empty).then((r) => {
					r.delete({ timeout: 4000 });
				});
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Checkout(
	'checkout',
	localization.cart_checkout_description,
	[0],
	[]
);
