const SubCommand = require('../classes/subcommand');
const utilites = require('../../utilities');

class Shop_Search extends SubCommand {
	async execute_internal(message, args) {
		const db = utilites.openDatabase();

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
			let result = 'Categories:\n';

			availableCategoriesRows.forEach((availableCategoriesRow) => {
				if (selectedCategories.includes(availableCategoriesRow.id)) {
					result += `:white_check_mark: ${availableCategoriesRow.category_name}\n`;
				} else {
					result += `:x: ${availableCategoriesRow.category_name}\n`;
				}
			});
			return result;
		};

		let shopMessageKeywords = async function () {
			let result = 'Keywords:\n';
			result += selectedKeywords.join(', ');
			return result;
		};

		// Let user select categories to search
		message.reply('Enter categories:');

		let awaiting = true;
		while (awaiting) {
			message.channel.send(await shopMessageCategories());

			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredCategoryName) => {
					const categoryName = filteredCategoryName.first().content;

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
							selectedCategories.splice(selectedCategoryIndex, 1);
						} else {
							selectedCategories.push(matchedRow.id);
						}
					} else if (
						categoryName === 'next' ||
						categoryName === 'cancel'
					) {
						awaiting = false;
					}
				});
		}

		// Let user select keywords to search
		message.reply('Enter keywords:');

		awaiting = true;
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
			let foundItemsReply =
				'I found these items matching your search criteria:\n';

			matchedVirtualItems.forEach((virtualItem) => {
				foundItemsReply += `${virtualItem.item_name}\n`;
			});
			foundItemsReply.trimRight();

			message.reply(foundItemsReply);
		} else {
			message.reply(
				"I couldn't find any items in the shop that match your search criteria!"
			);
		}
	}
}

module.exports = new Shop_Search('search', 'Desc', [0], ['Usage'], []);
