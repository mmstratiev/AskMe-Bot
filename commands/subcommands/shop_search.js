const MessageCleaner = require('../../classes/message_cleaner');
const { MessageEmbed } = require('discord.js');

const utilities = require('../../classes/utilities');
const localization = require('../../localization.json');

const SubCommand = require('../../classes/subcommand');
class Shop_Search extends SubCommand {
	async execute_internal(message, args) {
		const db = utilities.openDatabase();

		let cartRow = db
			.prepare(
				'SELECT ID id FROM carts WHERE server_id = ? AND user_id = ?'
			)
			.get([message.guild.id, message.author.id]);

		if (cartRow) {
			let cleaner = new MessageCleaner();

			const awaitFilter = (m) => m.author.id === message.author.id;
			const awaitFilterQuantity = (m) => {
				let result = false;
				if (m.author.id === message.author.id) {
					if (!isNaN(parseInt(m.content)) || m.content === 'finish') {
						result = true;
					} else {
						m.delete();
					}
				}
				return result;
			};

			const awaitConditions = {
				max: 1,
				idle: 500,
			};
			const awaitConditionsQuantity = {
				max: 1,
			};

			// Get all categories in server
			const availableCategoriesRows = db
				.prepare(
					'SELECT * FROM categories WHERE server_id = ? ORDER BY category_name'
				)
				.all([message.guild.id]);

			let selectedCategories = new Array();
			let selectedKeywords = new Array();

			const buildCategoriesEmbed = function () {
				const result = new MessageEmbed()
					.setColor('#000000')
					.setTitle(localization.reply_shop_search_categories_prompt)
					.addFields(
						availableCategoriesRows.map(
							(availableCategoriesRow) => {
								const getCategoryEmoji = () => {
									let result = ':x:';
									if (
										selectedCategories.includes(
											availableCategoriesRow.category_name
										)
									) {
										result = ':white_check_mark:';
									}
									return result;
								};

								return {
									name: `\`${availableCategoriesRow.category_name}\``,
									value: getCategoryEmoji(),
									inline: true,
								};
							}
						)
					);
				return result;
			};

			const buildKeywordsEmbed = function () {
				let embedDescription = `\`\`\`css\n${
					localization.reply_shop_search_keywords
				}: [${selectedKeywords.join(', ')}] \`\`\``;

				const result = new MessageEmbed()
					.setColor('#000000')
					.setTitle(localization.reply_shop_search_keywords_prompt)
					.setDescription(embedDescription);

				return result;
			};

			const sendCategoriesMessage = function () {
				message.reply(buildCategoriesEmbed()).then((m) => {
					cleaner.push(m);
				});
			};

			sendCategoriesMessage();

			// Let user select categories to search
			let awaitingUserInput = true;
			while (awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryNames) => {
						filteredCategoryNames.each((filteredMessage) => {
							const categoryName = filteredMessage.content;

							if (categoryName === 'finish') {
								awaitingUserInput = false;
							} else {
								let categoryRow = availableCategoriesRows.find(
									(availableCategoriesRow) => {
										return (
											availableCategoriesRow.category_name ===
											categoryName
										);
									}
								);

								if (categoryRow) {
									const selectedCategoryIndex = selectedCategories.indexOf(
										categoryRow.category_name
									);
									if (selectedCategoryIndex > -1) {
										// unmark
										selectedCategories.splice(
											selectedCategoryIndex,
											1
										);
									} else {
										selectedCategories.push(
											categoryRow.category_name
										); // mark
									}
								}
							}
							cleaner.push(filteredMessage);
						});

						// no need do redo the message if user didn't enter a message
						if (filteredCategoryNames.size > 0) {
							cleaner.clean();

							if (awaitingUserInput) {
								sendCategoriesMessage();
							}
						}
					});
			}

			const sendKeywordsMessage = function () {
				message.channel
					.send(buildKeywordsEmbed())
					.then((keywordsMsg) => {
						cleaner.push(keywordsMsg);
					});
			};

			cleaner.clean();
			sendKeywordsMessage();

			// Let user select keywords to search
			awaitingUserInput = true;
			while (awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredKeywords) => {
						filteredKeywords.each((filteredMessage) => {
							const keyword = filteredMessage.content;

							if (keyword === 'finish') {
								awaitingUserInput = false;
							} else {
								const keywordIndex = selectedKeywords.indexOf(
									keyword
								);

								if (keywordIndex > -1) {
									selectedKeywords.splice(keywordIndex, 1); // delete keyword
								} else {
									selectedKeywords.push(keyword); // add keyword
								}
							}

							cleaner.push(filteredMessage);
						});

						// no need do redo the message if user didn't enter a message
						if (filteredKeywords.size > 0) {
							cleaner.clean();

							if (awaitingUserInput) {
								sendKeywordsMessage();
							}
						}
					});
			}

			let allItemRows = db
				.prepare(
					`SELECT items.id, items.item_name, items.item_description, items.item_price, categories.category_name 
					FROM items
					INNER JOIN categories ON categories.id=items.category_id 
					WHERE items.server_id = ?`
				)
				.all([message.guild.id]);

			// Create virtual table to use FTS
			db.prepare('DROP TABLE IF EXISTS items_virtual').run();
			db.prepare(
				`CREATE VIRTUAL TABLE items_virtual USING FTS5(item_id, category_name, item_name, item_description, item_price)`
			).run();

			// Populate the virtual table with the items that match the selected categories
			allItemRows.forEach((itemRow) => {
				db.prepare(
					`INSERT INTO items_virtual(item_id, category_name, item_name, item_description, item_price) VALUES(?,?,?,?,?)`
				).run([
					itemRow.id,
					itemRow.category_name,
					itemRow.item_name,
					itemRow.item_description,
					itemRow.item_price,
				]);
			});

			// Match the items using the selected keywords and categories
			let matchedVirtualItems = db
				.prepare(
					`SELECT * FROM items_virtual WHERE item_name MATCH ? AND category_name MATCH ?`
				)
				.all([
					selectedKeywords
						.map((selectedKeyword) => `${selectedKeyword}*`)
						.join(' OR '),
					selectedCategories.join(' OR '),
				]);

			if (matchedVirtualItems.length > 0) {
				const foundItemsEmbed = new MessageEmbed()
					.setColor('#000000')
					.setTitle(localization.reply_shop_search_found_items)
					.addFields(
						matchedVirtualItems.map((matchedVirtualItem) => {
							return {
								name: `\`${
									matchedVirtualItem.item_name
								}\` - ${utilities.formatCurrency(
									message.guild.id,
									matchedVirtualItem.item_price
								)}`,
								value: `\`\`\`fix\n${matchedVirtualItem.item_description}\`\`\``,
								inline: true,
							};
						})
					);

				// Let user select items to buy
				awaitingUserInput = true;
				while (awaitingUserInput) {
					let itemToAddId = undefined;
					let quantityToAdd = 0;

					message.reply(foundItemsEmbed).then((r) => {
						cleaner.push(r);
					});

					// Item name
					while (!itemToAddId && awaitingUserInput) {
						await message.channel
							.awaitMessages(awaitFilter, awaitConditionsQuantity)
							.then(async (filteredItemNames) => {
								const itemName = filteredItemNames.first()
									.content;

								if (itemName === 'finish') {
									awaitingUserInput = false;
								} else {
									let virtualItem = matchedVirtualItems.find(
										(item) => {
											return item.item_name === itemName;
										}
									);

									if (virtualItem) {
										itemToAddId = virtualItem.item_id;
									} else {
										message
											.reply(
												localization.reply_shop_search_invalid_item
											)
											.then((r) =>
												r.delete({ timeout: 3500 })
											);
									}
								}

								filteredItemNames.forEach((filteredMessage) =>
									cleaner.push(filteredMessage)
								);
							});
					}

					// Quantity
					if (awaitingUserInput) {
						message
							.reply(
								localization.reply_shop_search_quantity_prompt
							)
							.then((r) => {
								cleaner.push(r);
							});

						await message.channel
							.awaitMessages(
								awaitFilterQuantity,
								awaitConditionsQuantity
							)
							.then((filteredQuantity) => {
								const itemQuantityStr = filteredQuantity.first()
									.content;
								if (itemQuantityStr === 'finish') {
									awaitingUserInput = false;
								} else {
									quantityToAdd = parseInt(itemQuantityStr);
								}

								filteredQuantity.forEach((filteredMessage) =>
									cleaner.push(filteredMessage)
								);
							});
					}

					// Add the item to cart
					if (awaitingUserInput) {
						if (quantityToAdd > 0) {
							db.prepare(
								`INSERT INTO cart_items(cart_id, item_id, item_quantity) VALUES(?,?,?)
								ON CONFLICT(cart_id, item_id) DO UPDATE SET item_quantity=item_quantity+?`
							).run([
								cartRow.id,
								itemToAddId,
								quantityToAdd,
								quantityToAdd,
							]);

							message
								.reply(
									localization.reply_shop_search_added_item
								)
								.then((r) => {
									r.delete({
										timeout: 3500,
									});
								});
						}
					}

					cleaner.clean();
				}
			} else {
				message.reply(localization.reply_shop_search_no_items);
			}

			message
				.reply(localization.reply_shop_search_finished)
				.then((r) => r.delete({ timeout: 3500 }));

			cleaner.clean({ timeout: 5000 });
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot"
			);
		}
	}
}

module.exports = new Shop_Search(
	'search',
	localization.shop_search_description,
	[0]
);
