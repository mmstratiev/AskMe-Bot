const SubCommand = require('../classes/subcommand');
const utilities = require('../../utilities');
const localization = require('../../localization.json');
const { MessageEmbed } = require('discord.js');

class Shop_Search extends SubCommand {
	async execute_internal(message, args) {
		const db = utilities.openDatabase();

		let cartRow = db
			.prepare(
				'SELECT ID id FROM carts WHERE server_id = ? AND user_id = ?'
			)
			.get([message.guild.id, message.author.id]);

		if (cartRow) {
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

			const awaitConditions = {
				max: 100,
				idle: 1500,
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

			let selectedCategories = new Array(); // array of category ids
			let selectedKeywords = new Array();
			let messagesToDelete = new Array();

			const buildCategoriesEmbed = function () {
				const result = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_shop_search_categories)
					// .setDescription('')
					.addFields(
						availableCategoriesRows.map(
							(availableCategoriesRow) => {
								const getCategoryEmoji = () => {
									let result = ':x:';
									if (
										selectedCategories.includes(
											availableCategoriesRow.id
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
				const result = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_shop_search_keywords)
					// .setDescription('')
					.addFields(
						selectedKeywords.map((selectedKeyword) => {
							return {
								name: `\`${selectedKeyword}\``,
								value: '\u200b',
								inline: true,
							};
						})
					);
				return result;
			};

			const sendCategoriesMessage = function () {
				message
					.reply(localization.reply_shop_search_categories_prompt)
					.then((r) => {
						messagesToDelete.push(r);
					});

				message.channel.send(buildCategoriesEmbed()).then((m) => {
					messagesToDelete.push(m);
				});
			};

			// Let user select categories to search
			sendCategoriesMessage();

			let awaitingUserInput = true;
			while (awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryNames) => {
						filteredCategoryNames.each((filteredMessage) => {
							const categoryName = filteredMessage.content;

							if (
								categoryName === 'finish' ||
								categoryName === 'cancel'
							) {
								awaitingUserInput = false;
							} else {
								let matchedRow = availableCategoriesRows.find(
									(availableCategoriesRow) => {
										return (
											availableCategoriesRow.category_name ===
											categoryName
										);
									}
								);

								if (matchedRow) {
									const selectedCategoryIndex = selectedCategories.indexOf(
										matchedRow.id
									);
									if (selectedCategoryIndex > -1) {
										// unmark
										selectedCategories.splice(
											selectedCategoryIndex,
											1
										);
									} else {
										selectedCategories.push(matchedRow.id); // mark
									}
								}
							}
							messagesToDelete.push(filteredMessage);
						});

						// no need do redo the message if user didn't enter a message
						if (filteredCategoryNames.size > 0) {
							message.channel.bulkDelete(messagesToDelete);
							messagesToDelete = new Array();

							if (awaitingUserInput) {
								sendCategoriesMessage();
							}
						}
					});
			}

			const sendKeywordsMessage = function () {
				message
					.reply(localization.reply_shop_search_keywords_prompt)
					.then((r) => {
						messagesToDelete.push(r);
					});

				message.channel
					.send(buildCategoriesEmbed())
					.then((categoriesMsg) => {
						messagesToDelete.push(categoriesMsg);
					});

				message.channel
					.send(buildKeywordsEmbed())
					.then((keywordsMsg) => {
						messagesToDelete.push(keywordsMsg);
					});
			};

			message.channel.bulkDelete(messagesToDelete);
			messagesToDelete = new Array();
			sendKeywordsMessage();

			// Let user select keywords to search
			awaitingUserInput = true;
			while (awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredKeywords) => {
						filteredKeywords.each((filteredMessage) => {
							const keyword = filteredMessage.content;

							if (keyword === 'finish' || keyword === 'cancel') {
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

							messagesToDelete.push(filteredMessage);
						});

						// no need do redo the message if user didn't enter a message
						if (filteredKeywords.size > 0) {
							message.channel.bulkDelete(messagesToDelete);
							messagesToDelete = new Array();

							if (awaitingUserInput) {
								sendKeywordsMessage();
							}
						}
					});
			}

			let allItemRows = db
				.prepare('SELECT * FROM items WHERE server_id = ?')
				.all([message.guild.id]);

			// Create virtual table to use FTS
			db.prepare('DROP TABLE IF EXISTS items_virtual').run();
			db.prepare(
				`CREATE VIRTUAL TABLE items_virtual USING FTS5(item_id, category_id, item_name, item_desc, item_price)`
			).run();

			// Populate the virtual table with the items that match the selected categories
			allItemRows.forEach((itemRow) => {
				db.prepare(
					`INSERT INTO items_virtual(item_id, category_id, item_name, item_desc, item_price) VALUES(?,?,?,?,?)`
				).run([
					itemRow.id,
					itemRow.category_id,
					itemRow.item_name,
					itemRow.item_description,
					itemRow.item_price,
				]);
			});

			// Match the items using the selected keywords and categories
			let matchedVirtualItems = db
				.prepare(
					`SELECT * FROM items_virtual WHERE item_name MATCH ? AND category_id MATCH ?`
				)
				.all([
					selectedKeywords.join(' OR '),
					selectedCategories.join(' OR '),
				]);

			if (matchedVirtualItems.length > 0) {
				const foundItemsEmbed = new MessageEmbed()
					.setColor('#7289da')
					.setTitle('Search result')
					// .setDescription('')
					.addFields(
						matchedVirtualItems.map((matchedVirtualItem) => {
							return {
								name: `\`${matchedVirtualItem.item_name}\``,
								value: matchedVirtualItem.item_price,
								inline: true,
							};
						})
					);

				const sendSearchResults = function () {
					message
						.reply(localization.reply_shop_search_found_items)
						.then((r) => {
							messagesToDelete.push(r);
							message.channel.send(foundItemsEmbed).then((m) => {
								messagesToDelete.push(m);
							});
						});
				};

				// Let user select items to buy
				awaitingUserInput = true;
				while (awaitingUserInput) {
					message.channel.bulkDelete(messagesToDelete);
					messagesToDelete = new Array();

					sendSearchResults();
					await message.channel
						.awaitMessages(awaitFilter, awaitConditionsQuantity)
						.then(async (filteredItemNames) => {
							const itemName = filteredItemNames.first().content;

							if (itemName === 'finish') {
								awaitingUserInput = false;
							} else {
								let virtualItem = matchedVirtualItems.find(
									(item) => {
										return item.item_name === itemName;
									}
								);

								if (virtualItem) {
									// let user select quantity
									message
										.reply('Enter quantity to add to cart:')
										.then((r) => {
											messagesToDelete.push(r);
										});

									await message.channel
										.awaitMessages(
											awaitFilterQuantity,
											awaitConditionsQuantity
										)
										.then(async (filteredQuantity) => {
											let quantityToAdd = parseInt(
												filteredQuantity.first().content
											);

											if (quantityToAdd > 0) {
												db.prepare(
													`INSERT INTO cart_items(cart_id, item_id, item_quantity) VALUES(?,?,?)
													ON CONFLICT(cart_id, item_id) DO UPDATE SET item_quantity=item_quantity+?`
												).run([
													cartRow.id,
													virtualItem.item_id,
													quantityToAdd,
													quantityToAdd,
												]);

												message
													.reply('Added!')
													.then((r) => {
														r.delete({
															timeout: 3000,
														});
													});
											}
											messagesToDelete.push(
												filteredQuantity.first()
											);
										});
								}
							}

							messagesToDelete.push(filteredItemNames.first());
						});
				}
			} else {
				message.reply(localization.reply_shop_search_no_items);
			}
		} else {
			throw new Error(
				"Cart doesn't exist! Should be added on start of the bot"
			);
		}
	}
}

module.exports = new Shop_Search('search', 'Desc', [0], ['Usage'], []);
