const { MessageEmbed } = require('discord.js');

const utilities = require('../../classes/utilities');
const localization = require('../../localization.json');

const SubCommand = require('../../classes/subcommand');
const MessageCleaner = require('../../classes/message_cleaner');
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
				idle: 500,
				max: 100,
			};
			const awaitConditionsQuantity = {
				max: 1,
			};

			let cartItems = new Array();
			let cleaner = new MessageCleaner();

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
						.setColor('#000000')
						.setTitle(localization.reply_cart_edit_enter_item)
						.addFields(
							cartItems.map((cartItem) => {
								// sum the total value of all items
								totalValue +=
									cartItem.item_quantity *
									cartItem.item_price;

								const formattedPrice = currencyFormatter.format(
									cartItem.item_quantity * cartItem.item_price
								);

								return {
									name: `\`${cartItem.item_name}\` x **${cartItem.item_quantity}**`,
									value: `\`\`\`diff\n+ ${formattedPrice} \`\`\``,
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

				message.reply(buildItemsEmbed()).then((r) => {
					cleaner.push(r);
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
											cleaner.push(r);
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
													cleaner.push(
														filteredMessage
													)
											);
										});
								}
							}
							filteredItemNames.forEach((filteredMessage) =>
								cleaner.push(filteredMessage)
							);

							cleaner.clean();

							if (awaitingUserInput) {
								sendCartMessage();
							}
						}
					});
			} while (awaitingUserInput);

			message
				.reply(localization.reply_cart_finished_editing)
				.then((r) => r.delete({ timeout: 3500 }));

			cleaner.clean({ timeout: 5000 });
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Edit(
	'edit',
	localization.cart_edit_description,
	[0],
	[]
);
