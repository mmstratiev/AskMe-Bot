const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');
const { Collection } = require('discord.js');

class Cart_Edit extends SubCommand {
	async execute_internal(message, args) {
		const db = utilites.openDatabase();

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

			// TODO: do while?
			let cartItems = getCartItems();
			while (awaitingUserInput && cartItems.length > 0) {
				cartItems = getCartItems();

				// Item ID to Cart Item map
				let itemIDToCartItem = new Map(
					cartItems.map((cartItem) => [cartItem.item_id, cartItem])
				);

				// Get all items that match the ids
				let itemsRows = db
					.prepare(
						'SELECT * FROM items WHERE id IN(?) ORDERED BY item_name'
					)
					.all([Array.from(itemIDToCartItem.keys()).join(',')]);

				// Item name to Item map
				let itemNameToItem = new Map(
					itemsRows.map((itemRow) => [itemRow.item_name, itemRow])
				);

				// Construct Cart message
				let cartItemsMessage = 'Cart Items:\n';
				itemsRows.forEach((itemRow) => {
					cartItemsMessage += itemRow.item_name;
				});

				const awaitFilter = (m) => m.author.id === message.author.id;
				const awaitFilterQuantity = (m) =>
					m.author.id === message.author.id &&
					Boolean(parseInt(m.content));

				const awaitConditions = {
					max: 1,
					time: 10000,
					errors: ['time'],
				};

				message.channel.send(cartItemsMessage);
				message.reply('Enter item to remove');

				// let user select item
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredItemName) => {
						let itemName = filteredItemName.first().content.trim();
						if (itemName === 'finish') {
							awaitingUserInput = false;
						} else {
							if (itemNameToItem.has(itemName)) {
								message.reply('Enter quantity to delete');
								// let user select quantity
								await message.channel
									.awaitMessages(
										awaitFilterQuantity,
										awaitConditions
									)
									.then(async (filteredQuantity) => {
										let quantityToSubstract = parseInt(
											filteredQuantity
										);
										let cartItem = itemIDToCartItem.get(
											itemNameToItem.get(itemName).item_id
										);
										let newQuantity =
											cartItem.item_quantity -
											quantityToSubstract;

										if (newQuantity <= 0) {
											db.prepare(
												'DELETE FROM cart_items WHERE id = ?'
											).run([cartItem.id]);
											message.reply('Deleted item');
										} else {
											db.prepare(
												'UPDATE cart_items SET item_quantity = ? WHERE id = ?'
											).run([newQuantity, cartItem.id]);
											message.reply(
												'Updated cart item quantity'
											);
										}
									});
							} else {
								message.reply(
									"Can't find item in shopping cart!"
								);
							}
						}
					});
			}

			if (cartItems.length === 0) {
				message.reply('Cart is empty!');
			} else {
				message.reply('Finished editing cart!');
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot!"
			);
		}
	}
}

module.exports = new Cart_Edit('edit', 'Desc', [0], ['Usage'], []);
