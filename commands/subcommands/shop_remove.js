const utilities = require('../../classes/utilities');
const localization = require('../../localization.json');

const { MessageEmbed } = require('discord.js');
const MessageCleaner = require('../../classes/message_cleaner');

const SubCommand = require('../../classes/subcommand');
class Shop_Remove extends SubCommand {
	async remove_item(message) {
		let db = utilities.openDatabase();

		let awaitingUserInput = true;
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
		};

		let cleaner = new MessageCleaner();

		while (awaitingUserInput) {
			let itemToDeleteId = undefined;

			const availableItemRows = db
				.prepare(
					'SELECT * FROM items WHERE server_id = ? ORDER BY item_name'
				)
				.all([message.guild.id]);

			const buildItemsEmbed = function () {
				const result = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_shop_remove_item_name)
					.addFields(
						availableItemRows.map((availableItemRow) => {
							return {
								name: `\`${
									availableItemRow.item_name
								}\` - ${utilities.formatCurrency(
									message.guild.id,
									availableItemRow.item_price
								)}`,
								value: `\`\`\`fix\n${availableItemRow.item_description}\`\`\``,
								inline: true,
							};
						})
					);
				return result;
			};

			message.reply(buildItemsEmbed()).then((r) => cleaner.push(r));

			// Let user choose item to delete
			while (!itemToDeleteId && awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredName) => {
						const itemName = filteredName.first().content;

						if (itemName === 'finish') {
							awaitingUserInput = false;
						} else {
							const itemRow = availableItemRows.find(
								(availableItemRow) =>
									availableItemRow.item_name === itemName
							);

							if (itemRow) {
								itemToDeleteId = itemRow.id;
							} else {
								message
									.reply(
										localization.reply_shop_remove_item_invalid
									)
									.then((r) => r.delete({ timeout: 3500 }));
							}
						}

						filteredName.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			// Delete the item
			if (awaitingUserInput) {
				db.prepare('DELETE FROM items WHERE id = ?').run([
					itemToDeleteId,
				]);
				message
					.reply(localization.reply_shop_remove_item_removed)
					.then((r) => r.delete({ timeout: 3500 }));
			}

			cleaner.clean();
		}

		message
			.reply(localization.reply_shop_remove_item_finished)
			.then((r) => r.delete({ timeout: 4000 }));

		cleaner.clean({ timeout: 5000 });
		db.close();
	}

	async remove_category(message) {
		let db = utilities.openDatabase();

		let awaitingUserInput = true;
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 1,
		};
		let cleaner = new MessageCleaner();

		while (awaitingUserInput) {
			let categoryToDeleteId = undefined;

			const availableCategoriesRows = db
				.prepare(
					'SELECT * FROM categories WHERE server_id = ? ORDER BY category_name'
				)
				.all([message.guild.id]);

			const buildCategoriesEmbed = function () {
				const result = new MessageEmbed()
					.setColor('#7289da')
					.setTitle(localization.reply_shop_remove_category_name)
					.addFields(
						availableCategoriesRows.map((availableCategoryRow) => {
							return {
								name: `\`${availableCategoryRow.category_name}\``,
								value: `\`\`\`fix\n${availableCategoryRow.category_description}\`\`\``,
								inline: true,
							};
						})
					);
				return result;
			};

			message.reply(buildCategoriesEmbed()).then((r) => cleaner.push(r));

			// Let user choose category to delete
			while (!categoryToDeleteId && awaitingUserInput) {
				await message.channel
					.awaitMessages(awaitFilter, awaitConditions)
					.then(async (filteredCategory) => {
						const categoryName = filteredCategory.first().content;

						if (categoryName === 'finish') {
							awaitingUserInput = false;
						} else {
							let categoryRow = db
								.prepare(
									'SELECT id FROM categories WHERE server_id = ? AND category_name = ?'
								)
								.get([message.guild.id, categoryName]);

							if (categoryRow) {
								categoryToDeleteId = categoryRow.id;
							} else {
								message
									.reply(
										localization.reply_shop_remove_category_invalid
									)
									.then((r) => r.delete({ timeout: 3500 }));
							}
						}

						filteredCategory.forEach((filteredMessage) =>
							cleaner.push(filteredMessage)
						);
					});
			}

			// Delete the category
			if (awaitingUserInput) {
				db.prepare('DELETE FROM categories WHERE id = ?').run([
					categoryToDeleteId,
				]);
				message
					.reply(localization.reply_shop_remove_category_removed)
					.then((r) => r.delete({ timeout: 3500 }));
			}

			cleaner.clean();
		}
		message
			.reply(localization.reply_shop_remove_category_finished)
			.then((r) => r.delete({ timeout: 4000 }));

		db.close();
	}

	async execute_internal(message, args) {
		let awaitingUserInput = true;
		const awaitFilter = (m) => m.author.id === message.author.id;
		const awaitConditions = {
			max: 100,
			idle: 500,
		};

		let cleaner = new MessageCleaner();

		const sendMessage = () => {
			const embed = new MessageEmbed()
				.setColor('#000000')
				.setTitle(localization.reply_shop_remove_message)
				.setDescription(
					`\`\`\`md\n1. ${localization.reply_shop_add_item}\n2. ${localization.reply_shop_add_category}\`\`\``
				);

			message.reply(embed).then((r) => {
				cleaner.push(r);
			});
		};

		// Choose what to remove
		sendMessage();
		while (awaitingUserInput) {
			await message.channel
				.awaitMessages(awaitFilter, awaitConditions)
				.then(async (filteredAddType) => {
					if (filteredAddType.size > 0) {
						const optionIndex = filteredAddType.first().content;
						if (optionIndex === 'finish') {
							awaitingUserInput = false;
						} else if (optionIndex === '1') {
							await this.remove_item(message);
						} else if (optionIndex === '2') {
							await this.remove_category(message);
						}

						filteredAddType.forEach((filteredMessage) => {
							cleaner.push(filteredMessage);
						});

						cleaner.clean();

						if (awaitingUserInput) {
							sendMessage();
						}
					}
				});
		}

		message.reply(localization.reply_shop_remove_finished).then((r) => {
			r.delete({ timeout: 4000 });
		});
	}
}

module.exports = new Shop_Remove(
	'remove',
	localization.shop_remove_description,
	[0],
	['MANAGE_GUILD']
);
