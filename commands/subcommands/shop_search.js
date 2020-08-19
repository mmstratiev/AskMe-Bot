const SubCommand = require('../classes/subcommand');
const utilities = require('../../utilities');
const localization = require('../../localization.json');

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
			const awaitConditions = {
				max: 1,
				time: 10000,
				errors: ['time'],
			};

			const availableCategoriesRows = db
				.prepare(
					'SELECT * FROM categories WHERE server_id = ? ORDER BY category_name'
				)
				.all([message.guild.id]);

			let selectedCategories = new Array(); // array of category ids
			let selectedKeywords = new Array();

			let shopMessageCategories = async function () {
				let result = `${localization.reply_shop_search_categories}\n`;

				availableCategoriesRows.forEach((availableCategoriesRow) => {
					if (
						selectedCategories.includes(availableCategoriesRow.id)
					) {
						result += `:white_check_mark: ${availableCategoriesRow.category_name}\n`;
					} else {
						result += `:x: ${availableCategoriesRow.category_name}\n`;
					}
				});
				return result;
			};

			let shopMessageKeywords = async function () {
				let result = `${localization.reply_shop_search_keywords}\n`;
				result += selectedKeywords.join(', ');
				return result;
			};

			// Let user select categories to search
			message.reply(localization.reply_shop_search_categories_prompt);

			let awaitingUserInput = true;
			while (awaitingUserInput) {
				message.channel.send(await shopMessageCategories());

				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategoryName) => {
						const categoryName = filteredCategoryName.first()
							.content;

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
								selectedCategories.splice(
									selectedCategoryIndex,
									1
								);
							} else {
								selectedCategories.push(matchedRow.id);
							}
						} else if (
							categoryName === 'next' ||
							categoryName === 'cancel'
						) {
							awaitingUserInput = false;
						}
					});
			}

			// Let user select keywords to search
			message.reply(localization.reply_shop_search_keywords_prompt);

			awaitingUserInput = true;
			while (
				!selectedKeywords.includes('next') &&
				!selectedKeywords.includes('cancel')
			) {
				message.channel.send(
					(await shopMessageCategories()) +
						'\n' +
						(await shopMessageKeywords())
				);

				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredKeyword) => {
						const keyword = filteredKeyword.first().content;

						const keywordIndex = selectedKeywords.indexOf(keyword);
						if (keywordIndex > -1) {
							selectedKeywords.splice(keywordIndex, 1);
						} else {
							selectedKeywords.push(keyword);
						}
					});
			}

			let matchedCategoryItemRows = db
				.prepare(
					'SELECT * FROM items WHERE server_id = ? AND category_id IN(?)'
				)
				.all([message.guild.id, selectedCategories.join(',')]);

			// Create virtual table to use FTS
			db.prepare('DROP TABLE IF EXISTS items_virtual').run();
			db.prepare(
				`CREATE VIRTUAL TABLE items_virtual USING FTS5(item_id, category_id, item_name, item_desc, item_price)`
			).run();

			// Populate the virtual table with the items that match the selected categories
			matchedCategoryItemRows.forEach((itemRow) => {
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

			// Match the items using the selected keywords
			let matchedVirtualItems = db
				.prepare(`SELECT * FROM items_virtual WHERE item_name MATCH ?`)
				.all([selectedKeywords.join(' OR ')]);

			if (matchedVirtualItems.length > 0) {
				let foundItemsReply = `${localization.reply_shop_search_found_items}\n`;

				matchedVirtualItems.forEach((virtualItem) => {
					foundItemsReply += `${virtualItem.item_name}\n`;
				});
				foundItemsReply.trimRight();

				message.reply(foundItemsReply);

				// Let user select items to buy
				awaitingUserInput = true;
				while (awaitingUserInput) {
					await message.channel
						.awaitMessages(awaitFilter, awaitConditions)
						.then(async (filteredItemName) => {
							const itemName = filteredItemName.first().content;

							if (itemName === 'finish') {
								awaitingUserInput = false;
							} else {
								let virtualItem = matchedVirtualItems.find(
									(item) => {
										return item.item_name === itemName;
									}
								);

								if (virtualItem) {
									db.prepare(
										`INSERT INTO cart_items(cart_id, item_id, item_quantity) VALUES(?,?,?)
									ON CONFLICT(cart_id, item_id) DO UPDATE SET item_quantity=item_quantity+?`
									).run([
										cartRow.id,
										virtualItem.item_id,
										1,
										1,
									]);
									message.reply(
										localization.reply_shop_search_added_item
									);
								} else {
									message.reply(
										localization.reply_shop_search_invalid_item
									);
								}
							}
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
