const utilities = require('../../utilities');
const localization = require('../../localization.json');
const { Collection, MessageEmbed } = require('discord.js');

const SubCommand = require('../classes/subcommand');
class Cart_Edit extends SubCommand {
	async execute_internal(message, args) {
		const db = utilities.openDatabase();

		let cartRow = db
			.prepare(
				'SELECT ID id FROM carts WHERE server_id = ? AND user_id = ?'
			)
			.get([message.guild.id, message.author.id]);

		if (cartRow) {
			let awaitingUserInput = true;

			// Gets all cart_items in cart
			let getCartItems = function () {
				return db
					.prepare('SELECT * FROM cart_items WHERE cart_id = ?')
					.all([cartRow.id]);
			};

			let cartItems = new Array();
			do {
				cartItems = getCartItems();

				// Get all items that match the ids
				let itemsRows = db
					.prepare(
						'SELECT * FROM items WHERE id IN(SELECT item_id FROM cart_items WHERE cart_id = ?)'
					)
					.all(cartRow.id);

				// Item ID to Cart Item map
				let itemIDToCartItem = new Map(
					cartItems.map((cartItem) => [cartItem.item_id, cartItem])
				);

				// Item name to Item map
				let itemNameToItem = new Map(
					itemsRows.map((itemRow) => [itemRow.item_name, itemRow])
				);

				const currencyFormatter = new Intl.NumberFormat('en-US', {
					style: 'currency',
					currency: 'USD',
				});

				let totalValue = 0.0;

				// Construct Cart message as embed
				const cartItemsMessage = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_cart)
					.addFields(
						itemsRows.map((itemRow) => {
							const quantity = itemIDToCartItem.get(itemRow.id)
								.item_quantity;

							// sum the total value of all items
							totalValue += quantity * itemRow.item_price;

							return {
								name: `\`${itemRow.item_name}\` x **${quantity}**`,
								value: currencyFormatter.format(
									quantity * itemRow.item_price
								),
								inline: true,
							};
						})
					)
					.setDescription(
						`${
							localization.reply_cart_total
						} **${currencyFormatter.format(totalValue)}**`
					);

				console.log(
					itemsRows.map((itemRow) => {
						return {
							name: `\`${itemRow.item_name}\` x **${
								itemIDToCartItem.get(itemRow.id).item_quantity
							}**`,
							value:
								itemIDToCartItem.get(itemRow.id).item_quantity *
								itemRow.item_price,
							inline: true,
						};
					})
				);

				// Message filters
				const awaitFilter = (m) => m.author.id === message.author.id;
				const awaitFilterQuantity = (m) =>
					m.author.id === message.author.id &&
					!isNaN(parseInt(m.content));

				// Message condition
				const awaitConditions = {
					max: 1,
					time: 10000,
					errors: ['time'],
				};

				message
					.reply(localization.reply_cart_edit_enter_item)
					.then(() => {
						message.channel.send(cartItemsMessage);
					});

				// let user select item
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredItemName) => {
						let itemName = filteredItemName.first().content.trim();
						if (itemName === 'finish') {
							// Finish execution of this command
							awaitingUserInput = false;
						} else {
							if (itemNameToItem.has(itemName)) {
								message.reply(
									localization.reply_cart_enter_quantity_edit
								);

								// let user select quantity
								await message.channel
									.awaitMessages(
										awaitFilterQuantity,
										awaitConditions
									)
									.then(async (filteredQuantity) => {
										let newQuantity = parseInt(
											filteredQuantity.first().content
										);

										let cartItem = itemIDToCartItem.get(
											itemNameToItem.get(itemName).id
										);

										if (newQuantity <= 0) {
											db.prepare(
												'DELETE FROM cart_items WHERE id = ?'
											).run([cartItem.id]);
											message.reply(
												localization.reply_cart_deleted_item
											);
										} else {
											db.prepare(
												'UPDATE cart_items SET item_quantity = ? WHERE id = ?'
											).run([newQuantity, cartItem.id]);
											message.reply(
												localization.reply_cart_edited_quantity
											);
										}
									});
							} else {
								message.reply(
									localization.no_such_item_in_cart
								);
							}
						}
					})
					.catch((error) => {
						if (error instanceof Collection) {
							message.reply(localization.reply_timed_out);
							awaitingUserInput = false;
						} else {
							throw new Error(error);
						}
					});
			} while (awaitingUserInput && cartItems.length > 0);

			if (cartItems.length === 0) {
				message.reply(localization.reply_cart_empty);
			} else {
				message.reply(localization.finished_editing_cart);
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Edit('edit', 'Desc', [0], ['Usage'], []);
