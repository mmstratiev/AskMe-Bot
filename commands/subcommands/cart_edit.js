const utilities = require('../../utilities');
const localization = require('../../localization.json');

const { MessageEmbed } = require('discord.js');

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

			const currencyFormatter = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
			});

			// Message filters
			const awaitFilter = (m) => m.author.id === message.author.id;
			const awaitFilterQuantity = (m) => {
				let result = false;
				if (m.author.id === message.author.id) {
					if (!isNaN(parseInt(m.content))) {
						result = true;
					} else {
						m.delete();
					}
				}
				return result;
			};

			// Message conditions
			const awaitConditions = {
				idle: 1250,
				max: 100,
			};
			const awaitConditionsQuantity = {
				max: 1,
			};

			let cartItems = new Array();
			let messagesToDelete = new Array();

			const sendCartMessage = function () {
				cartItems = db
					.prepare(
						`SELECT cart_items.id, items.item_name, items.item_price, cart_items.item_quantity
					 FROM items 
					 INNER JOIN cart_items 
					 ON cart_items.item_id=items.id
					WHERE cart_items.cart_id=?`
					)
					.all([cartRow.id]);

				// Construct Cart message as embed
				const buildItemsEmbed = () => {
					let totalValue = 0.0;
					return new MessageEmbed()
						.setColor('#7289da')
						.setTitle(localization.reply_cart)
						.addFields(
							cartItems.map((cartItem) => {
								// sum the total value of all items
								totalValue +=
									cartItem.item_quantity *
									cartItem.item_price;

								return {
									name: `\`${cartItem.item_name}\` x **${cartItem.item_quantity}**`,
									value: currencyFormatter.format(
										cartItem.item_quantity *
											cartItem.item_price
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
				};

				message
					.reply(localization.reply_cart_edit_enter_item)
					.then((r) => {
						messagesToDelete.push(r);
					});
				message.channel.send(buildItemsEmbed()).then((m) => {
					messagesToDelete.push(m);
				});
			};

			sendCartMessage();
			do {
				// let user select item
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredItemNames) => {
						if (filteredItemNames.size > 0) {
							let itemName = filteredItemNames.first().content;
							if (itemName === 'finish') {
								awaitingUserInput = false;
							} else {
								const cartItem = cartItems.find(
									(cartItem) =>
										cartItem.item_name === itemName
								);

								if (cartItem) {
									message
										.reply(
											localization.reply_cart_enter_quantity_edit
										)
										.then((r) => {
											messagesToDelete.push(r);
										});

									// let user select quantity
									await message.channel
										.awaitMessages(
											awaitFilterQuantity,
											awaitConditionsQuantity
										)
										.then(async (filteredQuantity) => {
											let newQuantity = parseInt(
												filteredQuantity.first().content
											);

											if (newQuantity <= 0) {
												db.prepare(
													'DELETE FROM cart_items WHERE id = ?'
												).run([cartItem.id]);
												message
													.reply(
														localization.reply_cart_deleted_item
													)
													.then((r) => {
														r.delete({
															timeout: 3500,
														});
													});
											} else {
												db.prepare(
													'UPDATE cart_items SET item_quantity = ? WHERE id = ?'
												).run([
													newQuantity,
													cartItem.id,
												]);
												message
													.reply(
														localization.reply_cart_edited_quantity
													)
													.then((r) => {
														r.delete({
															timeout: 3500,
														});
													});
											}

											filteredQuantity.forEach(
												(filteredMessage) =>
													messagesToDelete.push(
														filteredMessage
													)
											);
										});
								}
							}
							filteredItemNames.forEach((filteredMessage) =>
								messagesToDelete.push(filteredMessage)
							);

							message.channel.bulkDelete(messagesToDelete);
							messagesToDelete = new Array();

							if (awaitingUserInput) {
								sendCartMessage();
							}
						}
					});
			} while (awaitingUserInput);

			message
				.reply(localization.reply_cart_finished_editing)
				.then((r) => r.delete({ timeout: 3500 }));
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Edit('edit', 'Desc', [0], []);
